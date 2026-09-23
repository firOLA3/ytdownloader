const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { updateJob } = require('./jobTracker');
const DownloadHistory = require('../models/DownloadHistory');

/* ------------------------------------------------------------------ *
 * Configuration (all overridable via environment variables)
 * ------------------------------------------------------------------ */

const YTDLP_BIN = process.env.YTDLP_BIN || 'yt-dlp';

// The bgutil PO-token provider. When reachable we can use YouTube clients that
// need a proof-of-origin token (mweb), which is what clears the datacentre bot check.
const POT_PROVIDER_URL = process.env.YTDLP_POT_PROVIDER_URL || 'http://127.0.0.1:4416';
const POT_DEFAULT_URL = 'http://127.0.0.1:4416';

// Optional Netscape-format cookies file for age-restricted / members-only video.
const COOKIES_PATH = process.env.YTDLP_COOKIES || '';

// Optional explicit plugin directory (colon-separated), so plugin discovery does
// not depend on which user runs the container.
const PLUGIN_DIRS = process.env.YTDLP_PLUGIN_DIRS || '';

const FETCH_TIMEOUT_MS = parseInt(process.env.YTDLP_FETCH_TIMEOUT_MS || '45000', 10);
const DOWNLOAD_TIMEOUT_MS = parseInt(process.env.YTDLP_DOWNLOAD_TIMEOUT_MS || '900000', 10);

/**
 * Ordered player-client fallback chain for datacentre IPs.
 *
 * yt-dlp's own defaults are ('visionos', 'web') -- see
 * yt_dlp/extractor/youtube/_video.py:_DEFAULT_CLIENTS -- and those two are the
 * clients YouTube bot-checks hardest on cloud IPs, which is exactly why the
 * deployment fails while localhost works.
 *
 * 'mweb' is the client yt-dlp recommends for a flagged IP, but it needs a GVS PO
 * token, which only works when the bgutil provider is running.
 * 'tv_simply' needs no PO token and is rarely bot-checked.
 * 'default' is kept last so the app keeps tracking future yt-dlp releases.
 */
const CHAIN_WITH_POT = ['mweb', 'tv_simply', 'default'];
const CHAIN_WITHOUT_POT = ['tv_simply', 'tv', 'default'];

/* ------------------------------------------------------------------ *
 * Error classification
 * ------------------------------------------------------------------ */

const ERROR_SIGNATURES = [
  {
    code: 'BOT_CHECK',
    test: /Sign in to confirm you.re not a bot|confirm you.re not a robot|Please sign in to confirm/i,
    message: 'YouTube is blocking requests from this server (bot check).',
    hint: 'Run the bgutil PO-token provider (Dockerfile already does), or set YTDLP_COOKIES to a Netscape cookies file, or move the API to a residential IP.',
    retryable: true,
  },
  {
    code: 'RATE_LIMIT',
    test: /HTTP Error 429|Too Many Requests/i,
    message: 'YouTube is rate-limiting this server IP.',
    hint: 'Back off for a while. Sustained traffic needs a residential/rotating proxy.',
    retryable: true,
  },
  {
    code: 'AGE_RESTRICTED',
    test: /Sign in to confirm your age|age[- ]restricted/i,
    message: 'This video is age-restricted and needs a signed-in account.',
    hint: 'Set YTDLP_COOKIES to an exported Netscape cookies.txt for a logged-in account.',
    retryable: false,
  },
  {
    code: 'LOGIN_REQUIRED',
    test: /This video is only available to YouTube Premium|members-only|Join this channel/i,
    message: 'This video is members-only or Premium-only.',
    hint: 'Set YTDLP_COOKIES to an exported cookies.txt for an account that has access.',
    retryable: false,
  },
  {
    code: 'GEO_BLOCKED',
    // Matches yt-dlp's actual strings, e.g. "The uploader has not made this
    // video available in your country" (youtube/_video.py) and the generic
    // "not available in your country" used by several other extractors.
    test: /(?:not|has not)(?: made this video)? available in (?:your|this) country|geo[- ]?(?:restricted|blocked)/i,
    message: 'This video is not available in the server\'s country.',
    hint: 'Route the API through a proxy in a region where the video is available.',
    retryable: false,
  },
  {
    code: 'PRIVATE',
    test: /Private video|This video is private/i,
    message: 'This video is private.',
    hint: 'Ask the uploader to make it public, or supply cookies for an account with access.',
    retryable: false,
  },
  {
    code: 'NOT_FOUND',
    test: /Video unavailable|did not match any|HTTP Error 404|Unsupported URL/i,
    message: 'That URL is not a downloadable video (removed, or a non-YouTube/unsupported link).',
    hint: 'Check the link opens in a normal browser, and that the site is supported by yt-dlp.',
    retryable: false,
  },
  {
    code: 'NO_FORMATS',
    test: /No video formats found|requested format is not available/i,
    message: 'The video was found but this player client returned no usable formats.',
    hint: 'Usually transient; the next client in the chain is tried automatically.',
    retryable: true,
  },
  {
    code: 'EXTRACTION_FAILED',
    test: /Unable to extract (yt )?initial|Unable to extract player|Incomplete data received/i,
    message: 'YouTube returned an unexpected page; extraction failed.',
    hint: 'Usually fixed by updating yt-dlp to the newest nightly.',
    retryable: true,
  },
];

/**
 * Turn raw yt-dlp stderr into a structured, user-actionable error.
 */
const classifyError = (stderr = '', code = null) => {
  const text = String(stderr).trim();
  const lower = text.toLowerCase();

  for (const sig of ERROR_SIGNATURES) {
    if (sig.test.test(text)) {
      return {
        code: sig.code,
        message: sig.message,
        hint: sig.hint,
        retryable: sig.retryable,
        detail: lastMeaningfulLine(text),
      };
    }
  }

  return {
    code: code === null ? 'YTDLP_ERROR' : 'YTDLP_ERROR',
    message: 'yt-dlp failed to process that URL.',
    hint: 'Check the server logs for the full yt-dlp output.',
    retryable: false,
    detail: lastMeaningfulLine(text) || `exited with code ${code}`,
  };
};

/** Pull the last ERROR/WARNING line out of yt-dlp's output for logging. */
function lastMeaningfulLine(text) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const errLine = [...lines].reverse().find((l) => /^ERROR/i.test(l));
  return errLine || lines[lines.length - 1] || '';
}

class YtdlpError extends Error {
  constructor(info) {
    super(info.message);
    this.code = info.code;
    this.hint = info.hint;
    this.retryable = !!info.retryable;
    this.detail = info.detail || '';
  }
}

/* ------------------------------------------------------------------ *
 * PO-token provider availability (cached briefly)
 * ------------------------------------------------------------------ */

let potCache = { up: null, checkedAt: 0, version: null };
const POT_CACHE_TTL_MS = 30_000;

const probePotProvider = () =>
  new Promise((resolve) => {
    const lib = POT_PROVIDER_URL.startsWith('https') ? https : http;
    const req = lib.get(
      `${POT_PROVIDER_URL.replace(/\/$/, '')}/ping`,
      { timeout: 2000 },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          let version = null;
          try { version = JSON.parse(body).version || null; } catch { /* ignore */ }
          resolve({ up: res.statusCode === 200, version });
        });
      }
    );
    req.on('timeout', () => { req.destroy(); resolve({ up: false, version: null }); });
    req.on('error', () => resolve({ up: false, version: null }));
  });

const isPotProviderUp = async () => {
  const now = Date.now();
  if (potCache.checkedAt && now - potCache.checkedAt < POT_CACHE_TTL_MS) return potCache.up;
  const { up, version } = await probePotProvider();
  potCache = { up, checkedAt: now, version };
  return up;
};

const resolveClientChain = async () => {
  const override = process.env.YTDLP_PLAYER_CLIENT_CHAIN;
  if (override) {
    const chain = override.split('|').map((s) => s.trim()).filter(Boolean);
    if (chain.length) return chain;
  }
  return (await isPotProviderUp()) ? CHAIN_WITH_POT : CHAIN_WITHOUT_POT;
};

/* ------------------------------------------------------------------ *
 * Argument construction
 * ------------------------------------------------------------------ */

function buildCommonArgs() {
  const args = [];
  if (PLUGIN_DIRS) args.push('--plugin-dirs', PLUGIN_DIRS);
  if (COOKIES_PATH && fs.existsSync(COOKIES_PATH)) args.push('--cookies', COOKIES_PATH);
  // Only needed when the provider is not on its default address.
  if (POT_PROVIDER_URL !== POT_DEFAULT_URL) {
    args.push('--extractor-args', `youtubepot-bgutilhttp:base_url=${POT_PROVIDER_URL}`);
  }
  return args;
}

const playerClientArgs = (client) => ['--extractor-args', `youtube:player_client=${client || 'default'}`];

function buildInfoArgs(url, client) {
  return [
    '-j',
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '20',
    ...buildCommonArgs(),
    ...playerClientArgs(client),
    url,
  ];
}

function buildDownloadArgs({ url, formatId, type, outputPath, client }) {
  const args = ['--rm-cache-dir', '--no-playlist', '--no-warnings', '--socket-timeout', '20'];

  if (type === 'audio') {
    args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3');
  } else if (formatId) {
    // Video-only DASH streams need +bestaudio to merge; pre-merged streams ignore it.
    args.push('-f', `${formatId}+bestaudio`, '--merge-output-format', 'mp4');
  } else {
    args.push('-f', 'bestvideo*+bestaudio/best', '--merge-output-format', 'mp4');
  }

  args.push('-o', outputPath, ...buildCommonArgs(), ...playerClientArgs(client), url);
  return args;
}

/* ------------------------------------------------------------------ *
 * Process runner
 * ------------------------------------------------------------------ */

function runYtdlp(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(YTDLP_BIN, args);
    } catch (err) {
      return reject(new YtdlpError({
        code: 'YTDLP_MISSING',
        message: `Could not start ${YTDLP_BIN}.`,
        hint: 'Install yt-dlp or set YTDLP_BIN to its path.',
        detail: err.message,
      }));
    }

    let stdoutData = '';
    let stderrData = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    // A missing binary surfaces as an async 'error' event, not a spawn throw.
    child.on('error', (err) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        return reject(new YtdlpError({
          code: 'YTDLP_MISSING',
          message: `${YTDLP_BIN} is not installed or not on PATH.`,
          hint: 'The Docker image installs it at /usr/local/bin/yt-dlp. Set YTDLP_BIN if it lives elsewhere.',
          detail: err.message,
        }));
      }
      reject(new YtdlpError({ code: 'SPAWN_ERROR', message: 'Failed to start yt-dlp.', hint: '', detail: err.message }));
    });

    child.stdout.on('data', (d) => { stdoutData += d.toString(); });
    child.stderr.on('data', (d) => { stderrData += d.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new YtdlpError({
          code: 'TIMEOUT',
          message: 'yt-dlp took too long and was stopped.',
          hint: 'Raise YTDLP_FETCH_TIMEOUT_MS, or the network path to YouTube is degraded.',
          retryable: true,
        }));
      }
      if (code !== 0) {
        return reject(new YtdlpError(classifyError(stderrData, code)));
      }
      resolve({ stdout: stdoutData, stderr: stderrData });
    });
  });
}

/* ------------------------------------------------------------------ *
 * Output parsing
 * ------------------------------------------------------------------ */

/**
 * Parse `yt-dlp -j` output.
 *
 * `-j` normally emits a single JSON document, but it emits one JSON object per
 * line (NDJSON) for playlists/channels, and stray non-JSON lines can precede the
 * document. Previously this was a bare JSON.parse() that swallowed the real
 * reason for failure as a generic "Failed to parse yt-dlp output".
 */
function parseInfoJson(stdout) {
  const raw = String(stdout || '').trim();
  if (!raw) {
    throw new YtdlpError({
      code: 'EMPTY_OUTPUT',
      message: 'yt-dlp returned no data for that URL.',
      hint: 'The extractor produced nothing; try again or update yt-dlp.',
      retryable: true,
    });
  }

  // Fast path: a single JSON document.
  if (raw.startsWith('{')) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through to line-wise parsing
    }
  }

  // Line-wise / NDJSON path.
  let lastParseError = null;
  let best = null;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const obj = JSON.parse(trimmed);
      // Prefer the entry that actually carries the format list.
      if (obj && Array.isArray(obj.formats)) return obj;
      if (!best) best = obj;
    } catch (err) {
      lastParseError = err;
    }
  }
  if (best) return best;

  throw new YtdlpError({
    code: 'PARSE_ERROR',
    message: 'yt-dlp output could not be parsed as JSON.',
    hint: 'Update yt-dlp, or check the raw output in the server logs.',
    detail: `${lastParseError ? lastParseError.message : 'no JSON object found'} :: ${raw.slice(0, 300)}`,
  });
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

function sanitizeTitle(title, jobId) {
  const safe = String(title || 'video').replace(/[^\w\s-]/g, '').trim().substring(0, 50);
  return `${safe || 'video'}_${jobId}`;
}

/**
 * Fetch metadata for a URL, walking the player-client chain.
 * Returns `clientUsed` so the download step can pin the same client --
 * format IDs are client-specific and are not interchangeable.
 */
async function fetchInfo(url) {
  const chain = await resolveClientChain();
  let lastError = null;

  for (const client of chain) {
    try {
      const { stdout } = await runYtdlp(buildInfoArgs(url, client), FETCH_TIMEOUT_MS);
      const info = parseInfoJson(stdout);

      if (!Array.isArray(info.formats)) {
        throw new YtdlpError({
          code: 'NO_FORMATS',
          message: 'That URL returned no downloadable formats.',
          hint: 'It may be a channel/playlist page rather than a single video.',
          retryable: false,
        });
      }

      const videoFormats = info.formats
        .filter((f) => f.vcodec && f.vcodec !== 'none')
        .map((f) => ({
          formatId: f.format_id,
          ext: f.ext,
          resolution: f.resolution,
          height: f.height,
          filesize: f.filesize || f.filesize_approx,
          vcodec: f.vcodec,
        }))
        .sort((a, b) => (b.height || 0) - (a.height || 0));

      const audioFormats = info.formats
        .filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
        .map((f) => ({
          formatId: f.format_id,
          ext: f.ext,
          abr: f.abr,
          filesize: f.filesize || f.filesize_approx,
        }))
        .sort((a, b) => (b.abr || 0) - (a.abr || 0));

      return {
        title: info.title || 'Untitled',
        thumbnail: info.thumbnail || null,
        uploader: info.uploader || info.channel || null,
        duration: info.duration || null,
        videoFormats,
        audioFormats,
        clientUsed: client,
      };
    } catch (err) {
      lastError = err;
      const isYtdlpError = err instanceof YtdlpError;

      console.warn(
        `[fetchInfo] client="${client}" failed (${isYtdlpError ? err.code : 'UNKNOWN'}): ` +
        `${err.message}${err.detail ? ` :: ${err.detail}` : ''}`
      );

      if (!isYtdlpError || !err.retryable) throw err;
    }
  }

  throw lastError || new YtdlpError({ code: 'UNKNOWN', message: 'Unknown fetch failure.', hint: '' });
}

function startDownload(jobId, url, formatId, type, title, playerClient) {
  const downloadDir = path.join(__dirname, '..', 'downloads');
  const fileNameTemplate = `${sanitizeTitle(title, jobId)}.%(ext)s`;
  const outputPath = path.join(downloadDir, fileNameTemplate);

  const runAttempt = async (client) => {
    const args = buildDownloadArgs({ url, formatId, type, outputPath, client });
    updateJob(jobId, { status: 'downloading', stage: 'downloading' });

    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawn(YTDLP_BIN, args);
      } catch (err) {
        return reject(new YtdlpError({ code: 'SPAWN_ERROR', message: 'Failed to start yt-dlp.', hint: '', detail: err.message }));
      }

      let stderrData = '';
      let timedOut = false;

      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, DOWNLOAD_TIMEOUT_MS);

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new YtdlpError({
          code: err.code === 'ENOENT' ? 'YTDLP_MISSING' : 'SPAWN_ERROR',
          message: err.code === 'ENOENT' ? `${YTDLP_BIN} is not installed.` : 'Failed to start yt-dlp.',
          hint: '',
          detail: err.message,
        }));
      });

      child.stdout.on('data', (data) => {
        const output = data.toString();
        const percentMatch = output.match(/\[download\]\s+([\d.]+)%/);
        if (percentMatch && percentMatch[1]) {
          const percent = parseFloat(percentMatch[1]);
          const speedMatch = output.match(/at\s+([~\d.\w/]+)/);
          const speed = speedMatch ? speedMatch[1].replace('~', '') : null;
          const etaMatch = output.match(/ETA\s+([\d:]+)/);
          const eta = etaMatch ? etaMatch[1] : null;
          updateJob(jobId, { percent, speed, eta });
        }
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`yt-dlp stderr: ${data}`);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) {
          return reject(new YtdlpError({
            code: 'TIMEOUT',
            message: 'The download timed out.',
            hint: 'Raise YTDLP_DOWNLOAD_TIMEOUT_MS.',
            retryable: true,
          }));
        }
        if (code !== 0) return reject(new YtdlpError(classifyError(stderrData, code)));
        resolve();
      });
    });
  };

  (async () => {
    // Reuse the client that produced this format list; otherwise walk the chain.
    const chain = playerClient ? [playerClient] : await resolveClientChain();
    let lastError = null;

    for (const client of chain) {
      try {
        await runAttempt(client);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        const isYtdlpError = err instanceof YtdlpError;
        console.error(
          `[download ${jobId}] client="${client}" failed (${isYtdlpError ? err.code : 'UNKNOWN'}): ${err.message}`
        );
        if (!isYtdlpError || !err.retryable) break;
      }
    }

    if (lastError) {
      return updateJob(jobId, {
        status: 'error',
        stage: 'error',
        error: lastError.message,
        errorCode: lastError.code,
        errorHint: lastError.hint,
      });
    }

    // Locate the finished file by job id.
    let downloadedFile = null;
    try {
      downloadedFile = fs.readdirSync(downloadDir).find((f) => f.includes(jobId) && !f.endsWith('.part') && !f.endsWith('.ytdl')) || null;
    } catch (err) {
      console.error('Failed to read downloads dir:', err.message);
    }

    const fileUrlPath = downloadedFile ? `/downloads/${downloadedFile}` : null;

    updateJob(jobId, { status: 'done', stage: 'done', percent: 100, filePath: fileUrlPath });

    try {
      await DownloadHistory.create({
        title: title || 'Untitled',
        originalUrl: url,
        formatChosen: formatId || 'audio-best',
        type: type,
        filePath: fileUrlPath,
      });
    } catch (dbErr) {
      console.error('Failed to save to history:', dbErr.message);
    }
  })();
}

/** Runtime facts for the /api/health diagnostic endpoint. */
async function getDiagnostics() {
  let ytdlpVersion = null;
  let ffmpegPresent = false;
  let cookiesConfigured = false;

  try {
    const r = spawnSync(YTDLP_BIN, ['--version'], { encoding: 'utf8', timeout: 10_000 });
    ytdlpVersion = r.status === 0 ? String(r.stdout).trim() : `error: ${String(r.stderr).trim()}`;
  } catch (err) {
    ytdlpVersion = `unavailable (${err.message})`;
  }

  try {
    const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 10_000 });
    ffmpegPresent = r.status === 0;
  } catch {
    ffmpegPresent = false;
  }

  cookiesConfigured = !!(COOKIES_PATH && fs.existsSync(COOKIES_PATH));

  const { up, version } = await probePotProvider();

  return {
    ytdlp: { bin: YTDLP_BIN, version: ytdlpVersion },
    ffmpeg: ffmpegPresent,
    potProvider: { url: POT_PROVIDER_URL, reachable: up, version },
    cookies: { configured: cookiesConfigured, path: COOKIES_PATH || null },
    pluginDirs: PLUGIN_DIRS || '(yt-dlp defaults)',
    playerClientChain: (await resolveClientChain()).join(' -> '),
  };
}

module.exports = {
  fetchInfo,
  startDownload,
  getDiagnostics,
  classifyError,
  parseInfoJson,
  YtdlpError,
};
