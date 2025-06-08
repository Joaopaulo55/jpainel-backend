const express = require('express');
const router = express.Router();
const { GoogleAuth } = require('../services/googleAuth');
const { Site } = require('../models');

// Obter dados do Google Analytics
router.get('/:siteId', async (req, res) => {
  try {
    const site = await Site.findById(req.params.siteId);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const auth = new GoogleAuth(site.googleRefreshToken);
    const analytics = await auth.getAnalyticsData();
    
    res.json({
      traffic: analytics.traffic,
      demographics: analytics.demographics,
      behavior: analytics.behavior
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

