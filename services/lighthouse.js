const axios = require('axios');

async function runLighthouseAudit(url) {
  try {
    const response = await axios.get(
      'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed',
      {
        params: {
          url: url,
          key: process.env.GOOGLE_API_KEY,
          category: ['PERFORMANCE', 'ACCESSIBILITY', 'SEO', 'BEST_PRACTICES']
        }
      }
    );

    const { lighthouseResult } = response.data;
    return {
      performance: lighthouseResult.categories.PERFORMANCE.score * 100,
      accessibility: lighthouseResult.categories.ACCESSIBILITY.score * 100,
      seo: lighthouseResult.categories.SEO.score * 100,
      bestPractices: lighthouseResult.categories.BEST_PRACTICES.score * 100,
      metrics: {
        firstContentfulPaint: lighthouseResult.audits['first-contentful-paint'].displayValue,
        speedIndex: lighthouseResult.audits['speed-index'].displayValue,
        interactive: lighthouseResult.audits['interactive'].displayValue
      }
    };
  } catch (error) {
    console.error('Lighthouse error:', error);
    return null;
  }
}

module.exports = { runLighthouseAudit };

