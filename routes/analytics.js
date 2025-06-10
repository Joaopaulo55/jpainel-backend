const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Site = require('../models/Site');
const Log = require('../models/Log');
const { GoogleAuth } = require('../services/googleAuth');

router.use(auth);

// Obter dados de analytics de um site
router.get('/:siteId', async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.siteId,
      userId: req.userId
    });

    if (!site) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    if (!site.googleRefreshToken || !site.googleAnalyticsId) {
      return res.status(400).json({ error: 'Google Analytics não configurado para este site' });
    }

    const googleAuth = new GoogleAuth(site.googleRefreshToken);
    const analyticsData = await googleAuth.getAnalyticsData(site.googleAnalyticsId);

    await Log.create({
      level: 'info',
      message: 'Dados do Google Analytics obtidos',
      context: { siteId: site._id }
    });

    res.json(analyticsData);
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao obter dados do Google Analytics',
      context: { siteId: req.params.siteId, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao obter dados de analytics' });
  }
});

// Obter histórico de uptime
router.get('/:siteId/uptime', async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.siteId,
      userId: req.userId
    });

    if (!site) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    // Filtra os últimos 30 dias de verificações
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const uptimeChecks = site.uptimeChecks
      .filter(check => check.timestamp >= thirtyDaysAgo)
      .sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      uptime: site.calculateUptime('all'),
      checks: uptimeChecks
    });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao obter histórico de uptime',
      context: { siteId: req.params.siteId, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao obter histórico de uptime' });
  }
});

module.exports = router;