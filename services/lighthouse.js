const axios = require('axios');
const { URL } = require('url');
const validator = require('validator');
const Log = require('../models/Log');
const logger = require('../utils/logger');

class LighthouseService {
  constructor() {
    this.apiUrl = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed';
  }

  async runAudit(url, strategy = 'mobile') {
    if (!validator.isURL(url, { require_protocol: true })) {
      throw new Error('URL inválida');
    }

    try {
      const parsedUrl = new URL(url);
      const cleanUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

      const response = await axios.get(this.apiUrl, {
        params: {
          url: cleanUrl,
          key: process.env.GOOGLE_API_KEY,
          strategy: strategy,
          category: ['PERFORMANCE', 'ACCESSIBILITY', 'SEO', 'BEST_PRACTICES']
        },
        timeout: 30000
      });

      const result = this.formatResults(response.data);
      
      // Log do sucesso
      await Log.create({
        level: 'info',
        message: 'Lighthouse audit completed',
        context: {
          url: cleanUrl,
          strategy,
          scores: {
            performance: result.performance,
            accessibility: result.accessibility,
            seo: result.seo,
            bestPractices: result.bestPractices
          }
        }
      });

      return result;
    } catch (error) {
      logger.error('Lighthouse audit failed:', error);
      
      await Log.create({
        level: 'error',
        message: 'Lighthouse audit failed',
        context: {
          url,
          error: error.message
        }
      });

      throw new Error('Failed to run Lighthouse audit');
    }
  }

  formatResults(data) {
    const { lighthouseResult } = data;
    
    return {
      performance: Math.round(lighthouseResult.categories.PERFORMANCE.score * 100),
      accessibility: Math.round(lighthouseResult.categories.ACCESSIBILITY.score * 100),
      seo: Math.round(lighthouseResult.categories.SEO.score * 100),
      bestPractices: Math.round(lighthouseResult.categories.BEST_PRACTICES.score * 100),
      metrics: {
        firstContentfulPaint: lighthouseResult.audits['first-contentful-paint'].displayValue,
        speedIndex: lighthouseResult.audits['speed-index'].displayValue,
        interactive: lighthouseResult.audits['interactive'].displayValue,
        largestContentfulPaint: lighthouseResult.audits['largest-contentful-paint'].displayValue,
        cumulativeLayoutShift: lighthouseResult.audits['cumulative-layout-shift'].displayValue
      },
      opportunities: lighthouseResult.audits['opportunities']?.details?.items || [],
      diagnostics: lighthouseResult.audits['diagnostics']?.details?.items || []
    };
  }
}

module.exports = new LighthouseService();