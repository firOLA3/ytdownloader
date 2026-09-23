const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const ytdlpService = require('../services/ytdlp');
const jobTracker = require('../services/jobTracker');
const DownloadHistory = require('../models/DownloadHistory');

// Map an internal failure code onto an appropriate HTTP status.
function statusForCode(code) {
  switch (code) {
    case 'NOT_FOUND':
    case 'PRIVATE':
    case 'AGE_RESTRICTED':
    case 'LOGIN_REQUIRED':
    case 'GEO_BLOCKED':
      return 422; // upstream understood the URL and rejected it
    case 'YTDLP_MISSING':
    case 'SPAWN_ERROR':
      return 500;
    default:
      return 502; // upstream (YouTube) refused
  }
}

// GET /api/health — deployment diagnostics, so production problems are visible
// without redeploying to add a log line.
router.get('/health', async (req, res) => {
  try {
    const diagnostics = await ytdlpService.getDiagnostics();
    res.json({ status: 'ok', ...diagnostics });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// POST /api/fetch-info
router.post('/fetch-info', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const info = await ytdlpService.fetchInfo(url);
    res.json(info);
  } catch (error) {
    console.error('Fetch info error:', `[${error.code || 'UNKNOWN'}]`, error.message, error.detail || '');
    const isKnown = error instanceof ytdlpService.YtdlpError;
    res.status(statusForCode(error.code)).json({
      error: isKnown ? error.message : 'Failed to fetch video information',
      code: error.code || 'UNKNOWN',
      hint: error.hint || undefined,
    });
  }
});

// POST /api/download
router.post('/download', (req, res) => {
  const { url, formatId, type, title, playerClient } = req.body;

  if (!url || !type || !title) {
    return res.status(400).json({ error: 'url, type, and title are required' });
  }

  const jobId = crypto.randomBytes(8).toString('hex');

  // Initialize job tracking
  jobTracker.createJob(jobId, { url, type, title });

  // Start background process. playerClient pins the exact client that produced
  // this format list — format IDs differ between player clients.
  ytdlpService.startDownload(jobId, url, formatId, type, title, playerClient);

  // Return immediately
  res.json({ jobId });
});

// GET /api/download-status/:jobId
router.get('/download-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobTracker.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// GET /api/download-stream/:jobId (SSE endpoint)
router.get('/download-stream/:jobId', (req, res) => {
  const { jobId } = req.params;

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial state immediately
  const initialJob = jobTracker.getJob(jobId);
  if (initialJob) {
    sendEvent(initialJob);
  } else {
    sendEvent({ status: 'error', error: 'Job not found' });
    return res.end();
  }

  // Listener for future updates
  const listener = (job) => {
    sendEvent(job);
    if (job.status === 'done' || job.status === 'error') {
      cleanup();
    }
  };

  const eventName = `job-${jobId}`;
  jobTracker.jobEmitter.on(eventName, listener);

  const cleanup = () => {
    jobTracker.jobEmitter.removeListener(eventName, listener);
    res.end();
  };

  req.on('close', cleanup);
});

// GET /api/history
router.get('/history', async (req, res) => {
  try {
    const history = await DownloadHistory.find().sort({ date: -1 }).limit(50);
    res.json(history);
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
