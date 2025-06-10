const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Log = require('../models/Log');

module.exports = async (req, res, next) => {
  try {
    // Obtém o token do header Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      await Log.create({
        level: 'warn',
        message: 'Tentativa de acesso sem token',
        context: { path: req.path }
      });
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    // Verifica o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      await Log.create({
        level: 'warn',
        message: 'Token inválido - usuário não encontrado',
        context: { userId: decoded.userId }
      });
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Adiciona o ID do usuário à requisição
    req.userId = user._id;
    next();
  } catch (error) {
    await Log.create({
      level: 'warn',
      message: 'Falha na autenticação',
      context: { error: error.message }
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(500).json({ error: 'Erro na autenticação' });
  }
};