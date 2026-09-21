const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const ytdlpService = require('../services/ytdlp');
const jobTracker = require('../services/jobTracker');
const DownloadHistory = require('../models/DownloadHistory');

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
    console.error('Fetch info error:', error);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

// POST /api/download
router.post('/download', (req, res) => {
  const { url, formatId, type, title } = req.body;
  
  if (!url || !type || !title) {
    return res.status(400).json({ error: 'url, type, and title are required' });
  }

  const jobId = crypto.randomBytes(8).toString('hex');
  
  // Initialize job tracking
  jobTracker.createJob(jobId, { url, type, title });

  // Start background process
  ytdlpService.startDownload(jobId, url, formatId, type, title);

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
