const mongoose = require('mongoose');
const validator = require('validator');

const uptimeCheckSchema = new mongoose.Schema({
  status: { 
    type: Number, 
    required: true,
    min: [100, 'Status deve ser >= 100'],
    max: [599, 'Status deve ser <= 599']
  },
  responseTime: { 
    type: Number, 
    required: true,
    min: [0, 'Tempo de resposta não pode ser negativo']
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  error: String
});

const siteSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  url: { 
    type: String, 
    required: true,
    validate: {
      validator: validator.isURL,
      message: 'URL inválida'
    }
  },
  displayName: { 
    type: String,
    trim: true,
    maxlength: [50, 'Nome muito longo (máx. 50 caracteres)']
  },
  googleAnalyticsId: {
    type: String,
    validate: {
      validator: /^UA-\d{4,9}-\d{1,4}$/i,
      message: 'ID do Google Analytics inválido'
    }
  },
  googleRefreshToken: String,
  uptimeChecks: [uptimeCheckSchema],
  lastLighthouseResult: { 
    type: mongoose.Schema.Types.Mixed 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Atualiza o campo updatedAt antes de salvar
siteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para calcular uptime
siteSchema.methods.calculateUptime = function(period = 'all') {
  let checks = this.uptimeChecks;
  
  if (period === 'day') {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    checks = checks.filter(c => c.timestamp >= oneDayAgo);
  } else if (period === 'week') {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    checks = checks.filter(c => c.timestamp >= oneWeekAgo);
  }

  if (checks.length === 0) return 100; // Assume 100% se não houver checks
  
  const successful = checks.filter(c => c.status >= 200 && c.status < 300).length;
  return (successful / checks.length) * 100;
};

// Índice para melhorar consultas por usuário
siteSchema.index({ userId: 1 });
siteSchema.index({ url: 1 }, { unique: true });

module.exports = mongoose.model('Site', siteSchema);