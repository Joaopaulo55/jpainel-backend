const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { GoogleAuth } = require('../services/googleAuth');
const Log = require('../models/Log');

// Registro de usuário
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica se usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await Log.create({
        level: 'warn',
        message: 'Tentativa de registro com email existente',
        context: { email }
      });
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Cria novo usuário
    const user = new User({ email, password });
    await user.save();

    // Gera token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    await Log.create({
      level: 'info',
      message: 'Novo usuário registrado',
      context: { userId: user._id }
    });

    res.status(201).json({ token, userId: user._id });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro no registro',
      context: { error: error.message }
    });
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      await Log.create({
        level: 'warn',
        message: 'Tentativa de login com email não cadastrado',
        context: { email }
      });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verifica senha
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await Log.create({
        level: 'warn',
        message: 'Tentativa de login com senha incorreta',
        context: { userId: user._id }
      });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gera token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Atualiza último login
    user.lastLogin = new Date();
    await user.save();

    await Log.create({
      level: 'info',
      message: 'Login bem-sucedido',
      context: { userId: user._id }
    });

    res.json({ token, userId: user._id });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro no login',
      context: { error: error.message }
    });
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Rotas de autenticação do Google
router.get('/google', (req, res) => {
  const authUrl = GoogleAuth.getAuthUrl();
  res.json({ authUrl });
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await GoogleAuth.getTokens(code);
    
    // Aqui você pode associar os tokens ao usuário logado
    // (implementação depende do seu fluxo de autenticação)
    
    res.json({ 
      success: true,
      refreshToken: tokens.refresh_token 
    });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Falha na autenticação com Google',
      context: { error: error.message }
    });
    res.status(500).json({ error: 'Falha na autenticação com Google' });
  }
});

module.exports = router;