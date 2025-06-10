const express = require('express');
const router = express.Router();
const Site = require('../models/Site');
const auth = require('../middleware/auth');

// Protege todas as rotas com autenticação
router.use(auth);

// Listar sites do usuário
router.get('/', async (req, res) => {
  try {
    const sites = await Site.find({ userId: req.userId });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adicionar novo site
router.post('/', async (req, res) => {
  try {
    const { name, url, googleRefreshToken } = req.body;
    
    const site = new Site({
      name,
      url,
      googleRefreshToken,
      userId: req.userId
    });
    
    await site.save();
    res.status(201).json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

