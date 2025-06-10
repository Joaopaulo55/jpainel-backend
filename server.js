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
  origin: ['https://joaopaul055.github.io', 'http://localhost:3000'], // Adicione outros domínios se necessário
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Conexão com MongoDB (configurada no Render)
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://joaofranciscovicapaulo55:bX5H8VhNJRAaHBnT@jpainel.su2lugr.mongodb.net/Jpainel?retryWrites=true&w=majority')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware para log de requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Função para carregar rotas com tratamento de erro robusto
const loadRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    
    // Verifica se o router é válido
    if (typeof route !== 'function' || !route.stack) {
      console.error(`Invalid router structure in ${routeName}`);
      throw new Error(`Invalid router exported from ${routePath}`);
    }
    
    console.log(`Route ${routeName} loaded successfully`);
    return route;
  } catch (err) {
    console.error(`Critical error loading route ${routeName}:`, err);
    
    // Cria um router de fallback
    const fallbackRouter = express.Router();
    
    // Middleware para log de erro
    fallbackRouter.use((req, res, next) => {
      console.error(`Attempt to access unavailable route: ${routeName}`);
      next();
    });
    
    // Rota de fallback
    fallbackRouter.all('*', (req, res) => {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        route: routeName,
        message: 'This route is currently unavailable due to server configuration issues'
      });
    });
    
    return fallbackRouter;
  }
};

// Carregamento seguro de rotas com verificação
const routes = [
  { path: '/api/auth', route: './routes/auth', name: 'Auth' },
  { path: '/api/sites', route: './routes/sites', name: 'Sites' },
  { path: '/api/logs', route: './routes/logs', name: 'Logs' },
  { path: '/api/analytics', route: './routes/analytics', name: 'Analytics' }
];

routes.forEach(({ path, route, name }) => {
  app.use(path, loadRoute(route, name));
});

// Rota de health check para o Render
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'OK',
    database: dbStatus,
    routes: routes.map(r => r.name),
    timestamp: new Date().toISOString()
  });
});

// Rota de fallback para 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableRoutes: routes.map(r => r.path)
  });
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Erros de validação do Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Erros JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Erros padrão
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  routes.forEach(r => console.log(`- ${r.path} (${r.name})`));
});

// Configuração do WebSocket
const wss = new WebSocket.Server({ server });

// Mapa para armazenar conexões por siteId
const connections = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.siteId) {
        // Adiciona a conexão ao mapa
        if (!connections.has(data.siteId)) {
          connections.set(data.siteId, new Set());
        }
        connections.get(data.siteId).add(ws);
        ws.siteId = data.siteId;
        
        console.log(`Client subscribed to site ${data.siteId}`);
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  // Remove a conexão quando é fechada
  ws.on('close', () => {
    if (ws.siteId && connections.has(ws.siteId)) {
      connections.get(ws.siteId).delete(ws);
      if (connections.get(ws.siteId).size === 0) {
        connections.delete(ws.siteId);
      }
    }
    console.log('WebSocket connection closed');
  });
});

// Função para enviar atualizações via WebSocket
function broadcastUpdate(siteId, data) {
  if (connections.has(siteId)) {
    const message = JSON.stringify(data);
    connections.get(siteId).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// Exporta WebSocket para uso em outros módulos
module.exports = { 
  app, 
  wss,
  broadcastUpdate 
};