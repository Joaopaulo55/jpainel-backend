const mongoose = require('mongoose');

const uptimeCheckSchema = new mongoose.Schema({
  status: { type: Number, required: true },
  responseTime: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const siteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  displayName: { type: String },
  googleAnalyticsId: { type: String },
  googleRefreshToken: { type: String },
  uptimeChecks: [uptimeCheckSchema],
  lastLighthouseResult: { type: Object },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Método para calcular uptime
siteSchema.methods.calculateUptime = function() {
  const checks = this.uptimeChecks;
  if (checks.length === 0) return 0;
  
  const successful = checks.filter(c => c.status >= 200 && c.status < 300).length;
  return (successful / checks.length) * 100;
};

module.exports = mongoose.model('Site', siteSchema);

