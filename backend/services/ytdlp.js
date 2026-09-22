const { spawn } = require('child_process');
const path = require('path');
const { updateJob } = require('./jobTracker');
const DownloadHistory = require('../models/DownloadHistory');

const fetchInfo = (url) => {
  return new Promise((resolve, reject) => {
    // Nightly yt-dlp update fixed the 429 error, so we revert back to default client to get all DASH formats
    // Nightly yt-dlp update fixed the 429 error, so we revert back to default client to get all DASH formats
    // We add ios client spoofing to bypass datacenter IP bans without losing DASH formats
    const ytdlp = spawn('yt-dlp', ['--extractor-args', 'youtube:player_client=ios,tv', '-j', url]);
    
    let stdoutData = '';
    let stderrData = '';

    ytdlp.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited with code ${code}: ${stderrData}`));
      }

      try {
        const info = JSON.parse(stdoutData);
        
        const videoFormats = info.formats
          .filter(f => f.vcodec !== 'none') // Allow all video streams (including DASH without audio)
          .map(f => ({
            formatId: f.format_id,
            ext: f.ext,
            resolution: f.resolution,
            height: f.height,
            filesize: f.filesize || f.filesize_approx,
            vcodec: f.vcodec
          }))
          .sort((a, b) => (b.height || 0) - (a.height || 0)); // Sort by height descending

        const audioFormats = info.formats
          .filter(f => f.acodec !== 'none' && f.vcodec === 'none') // audio only
          .map(f => ({
            formatId: f.format_id,
            ext: f.ext,
            abr: f.abr, // audio bitrate
            filesize: f.filesize || f.filesize_approx
          }))
          .sort((a, b) => (b.abr || 0) - (a.abr || 0)); // Sort by bitrate descending

        resolve({
          title: info.title,
          thumbnail: info.thumbnail,
          videoFormats,
          audioFormats
        });
      } catch (err) {
        reject(new Error('Failed to parse yt-dlp output'));
      }
    });
  });
};

const startDownload = (jobId, url, formatId, type, title) => {
  const downloadDir = path.join(__dirname, '..', 'downloads');
  const sanitizedTitle = title.replace(/[^\w\s-]/g, '').trim().substring(0, 50);
  const fileNameTemplate = `${sanitizedTitle}_${jobId}.%(ext)s`;
  const outputPath = path.join(downloadDir, fileNameTemplate);

  let args = ['--extractor-args', 'youtube:player_client=ios,tv'];
  
  if (type === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '-o', outputPath, url);
  } else {
    // If the selected format is a video-only DASH stream, yt-dlp needs +bestaudio to merge it.
    // If it's already a pre-merged stream, yt-dlp will safely ignore +bestaudio.
    args.push('-f', `${formatId}+bestaudio`, '--merge-output-format', 'mp4', '-o', outputPath, url);
  }

  updateJob(jobId, { status: 'downloading', stage: 'downloading' });
  
  const ytdlp = spawn('yt-dlp', args);

  ytdlp.stdout.on('data', (data) => {
    const output = data.toString();
    // Parse progress. Typical yt-dlp output: "[download]  45.0% of 50.00MiB at  5.00MiB/s ETA 00:05"
    const match = output.match(/\[download\]\s+([\d\.]+)%/);
    if (match && match[1]) {
      const percent = parseFloat(match[1]);
      updateJob(jobId, { percent });
    }
  });

  ytdlp.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data}`);
  });

  ytdlp.on('close', async (code) => {
    if (code === 0) {
      // Determine final filename based on type
      const finalExt = type === 'audio' ? 'mp3' : 'mp4'; // fallback
      // Since yt-dlp handles the extension, we need a way to know it exactly. 
      // For simplicity here, we can glob for the job id in the downloads folder.
      const fs = require('fs');
      const files = fs.readdirSync(downloadDir);
      const downloadedFile = files.find(f => f.includes(jobId));
      
      const fileUrlPath = downloadedFile ? `/downloads/${downloadedFile}` : null;

      updateJob(jobId, { 
        status: 'done', 
        stage: 'done', 
        percent: 100,
        filePath: fileUrlPath
      });

      // Save to history
      try {
        await DownloadHistory.create({
          title: title,
          originalUrl: url,
          formatChosen: formatId || 'audio-best',
          type: type,
          filePath: fileUrlPath
        });
      } catch (dbErr) {
        console.error('Failed to save to history:', dbErr);
      }
    } else {
      updateJob(jobId, { status: 'error', stage: 'error', error: 'Download failed' });
    }
  });
};

module.exports = {
  fetchInfo,
  startDownload
};
