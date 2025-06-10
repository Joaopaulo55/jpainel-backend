const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Site = require('../models/Site');
const Log = require('../models/Log');
const lighthouseService = require('../services/lighthouse');
const UptimeMonitor = require('../services/uptimeMonitor');
const { GoogleAuth } = require('../services/googleAuth');

// Todas as rotas requerem autenticação
router.use(auth);

// Listar sites do usuário
router.get('/', async (req, res) => {
  try {
    const sites = await Site.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    // Adiciona cálculo de uptime para cada site
    const sitesWithUptime = sites.map(site => ({
      ...site,
      uptime: {
        day: site.calculateUptime('day'),
        week: site.calculateUptime('week'),
        all: site.calculateUptime('all')
      }
    }));

    res.json(sitesWithUptime);
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao listar sites',
      context: { userId: req.userId, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao listar sites' });
  }
});

// Adicionar novo site
router.post('/', async (req, res) => {
  try {
    const { url, displayName, googleAnalyticsId, googleRefreshToken } = req.body;

    const newSite = new Site({
      userId: req.userId,
      url,
      displayName,
      googleAnalyticsId,
      googleRefreshToken
    });

    await newSite.save();

    // Executa primeira verificação de Lighthouse
    try {
      const lighthouseResult = await lighthouseService.runAudit(url);
      newSite.lastLighthouseResult = lighthouseResult;
      await newSite.save();
    } catch (lighthouseError) {
      await Log.create({
        level: 'warn',
        message: 'Falha na primeira auditoria Lighthouse',
        context: { siteId: newSite._id, error: lighthouseError.message }
      });
    }

    // Executa primeira verificação de uptime
    try {
      const uptimeMonitor = new UptimeMonitor();
      await uptimeMonitor.checkSite(newSite);
    } catch (uptimeError) {
      await Log.create({
        level: 'warn',
        message: 'Falha na primeira verificação de uptime',
        context: { siteId: newSite._id, error: uptimeError.message }
      });
    }

    await Log.create({
      level: 'info',
      message: 'Novo site adicionado',
      context: { userId: req.userId, siteId: newSite._id }
    });

    res.status(201).json(newSite);
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao adicionar site',
      context: { userId: req.userId, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao adicionar site' });
  }
});

// Obter detalhes de um site específico
router.get('/:id', async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!site) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    // Formata os dados do site
    const siteData = site.toObject();
    siteData.uptime = {
      day: site.calculateUptime('day'),
      week: site.calculateUptime('week'),
      all: site.calculateUptime('all')
    };

    // Se tiver Google Analytics, busca os dados
    if (site.googleRefreshToken && site.googleAnalyticsId) {
      try {
        const googleAuth = new GoogleAuth(site.googleRefreshToken);
        siteData.analytics = await googleAuth.getAnalyticsData(site.googleAnalyticsId);
      } catch (gaError) {
        await Log.create({
          level: 'warn',
          message: 'Falha ao buscar dados do Google Analytics',
          context: { siteId: site._id, error: gaError.message }
        });
      }
    }

    res.json(siteData);
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao buscar detalhes do site',
      context: { userId: req.userId, siteId: req.params.id, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao buscar detalhes do site' });
  }
});

// Executar auditoria Lighthouse manualmente
router.post('/:id/lighthouse', async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!site) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    const result = await lighthouseService.runAudit(
      site.url,
      req.body.strategy || 'mobile'
    );

    site.lastLighthouseResult = result;
    await site.save();

    await Log.create({
      level: 'info',
      message: 'Auditoria Lighthouse executada',
      context: { siteId: site._id, strategy: req.body.strategy }
    });

    res.json(result);
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao executar Lighthouse',
      context: { siteId: req.params.id, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao executar auditoria Lighthouse' });
  }
});

// Atualizar site
router.put('/:id', async (req, res) => {
  try {
    const { displayName, googleAnalyticsId, googleRefreshToken, isActive } = req.body;

    const updatedSite = await Site.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { displayName, googleAnalyticsId, googleRefreshToken, isActive },
      { new: true }
    );

    if (!updatedSite) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    await Log.create({
      level: 'info',
      message: 'Site atualizado',
      context: { siteId: updatedSite._id }
    });

    res.json(updatedSite);
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao atualizar site',
      context: { siteId: req.params.id, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao atualizar site' });
  }
});

// Remover site
router.delete('/:id', async (req, res) => {
  try {
    const deletedSite = await Site.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!deletedSite) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    await Log.create({
      level: 'info',
      message: 'Site removido',
      context: { siteId: req.params.id }
    });

    res.json({ success: true });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: 'Erro ao remover site',
      context: { siteId: req.params.id, error: error.message }
    });
    res.status(500).json({ error: 'Erro ao remover site' });
  }
});

module.exports = router;