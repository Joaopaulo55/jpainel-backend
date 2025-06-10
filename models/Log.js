const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  context: {
    type: mongoose.Schema.Types.Mixed
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

// Índices para melhorar consultas
LogSchema.index({ level: 1 });
LogSchema.index({ userId: 1 });
LogSchema.index({ siteId: 1 });
LogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Log', LogSchema);

