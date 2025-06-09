require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const mongoose = require('mongoose');

// Configuração inicial
const app = express();

// Configuração do CORS para o frontend no GitHub Pages
app.use(cors({
  origin: 'https://joaopaul055.github.io',
  credentials: true
}));

app.use(express.json());

// Conexão com MongoDB (configurada no Render)
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://joaofranciscovicapaulo55:bX5H8VhNJRAaHBnT@jpainel.su2lugr.mongodb.net/Jpainel?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Carregamento seguro de rotas
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/sites', require('./routes/sites'));
  app.use('/api/logs', require('./routes/logs'));
  app.use('/api/analytics', require('./routes/analytics'));
} catch (err) {
  console.error('Error loading routes:', err);
  process.exit(1);
}

// Rota de health check para o Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Configuração do WebSocket
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'subscribe') {
        ws.siteId = data.siteId;
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.sendUpdate = (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };
});

// Exporta WebSocket para uso em outros módulos
module.exports = { app, wss };