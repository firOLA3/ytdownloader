const mongoose = require('mongoose');

const downloadHistorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  formatChosen: {
    type: String,
    required: true
  },
  type: {
    type: String, // 'video' or 'audio'
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DownloadHistory', downloadHistorySchema);
