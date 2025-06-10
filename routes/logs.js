const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const auth = require('../middleware/auth');

// Protege todas as rotas com autenticação
router.use(auth);

// Obter logs de um site específico
router.get('/:siteId', async (req, res) => {
  try {
    const logs = await Log.find({ 
      siteId: req.params.siteId,
      userId: req.userId 
    }).sort({ timestamp: -1 });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

