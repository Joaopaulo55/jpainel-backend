require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const path = require('path');

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

// Função para carregar rotas com tratamento de erro
const loadRoute = (routePath) => {
  try {
    const route = require(routePath);
    if (typeof route !== 'function' || !route.stack) {
      throw new Error(`Invalid router exported from ${routePath}`);
    }
    return route;
  } catch (err) {
    console.error(`Error loading route ${routePath}:`, err);
    // Retorna um router vazio para evitar quebrar o servidor
    const emptyRouter = express.Router();
    emptyRouter.use((req, res) => res.status(503).json({ 
      error: 'Route temporarily unavailable',
      details: err.message
    }));
    return emptyRouter;
  }
};

// Carregamento seguro de rotas
app.use('/api/auth', loadRoute('./routes/auth'));
app.use('/api/sites', loadRoute('./routes/sites'));
app.use('/api/logs', loadRoute('./routes/logs'));
app.use('/api/analytics', loadRoute('./routes/analytics'));

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