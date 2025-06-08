require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const { GoogleAuth } = require('./services/googleAuth');
const lighthouse = require('./services/lighthouse');
const uptimeMonitor = require('./services/uptimeMonitor');

// Configuração inicial
const app = express();
app.use(cors());
app.use(express.json());

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/analytics', require('./routes/analytics'));

// WebSocket
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT}`);
  uptimeMonitor.start(); // Inicia monitoramento
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'subscribe') {
      ws.siteId = data.siteId; // Associa cliente a um site
    }
  });
  
  // Função para enviar atualizações
  ws.sendUpdate = (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };
});

// Exporta WebSocket para uso em outros módulos
module.exports = { app, wss };

