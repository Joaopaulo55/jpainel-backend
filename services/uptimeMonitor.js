const axios = require('axios');
const Site = require('../models/Site');
const Log = require('../models/Log');
const logger = require('../utils/logger');

class UptimeMonitor {
  constructor() {
    this.timeout = 10000; // 10 segundos
  }

  async checkAllSites() {
    try {
      const sites = await Site.find({ isActive: true });
      const results = await Promise.allSettled(
        sites.map(site => this.checkSite(site))
      );
      
      logger.info(`Uptime check completed for ${sites.length} sites`);
      return results;
    } catch (error) {
      logger.error('Uptime monitor error:', error);
      throw error;
    }
  }

  async checkSite(site) {
    const startTime = Date.now();
    let status, errorMessage;

    try {
      const response = await axios.get(site.url, { 
        timeout: this.timeout,
        validateStatus: () => true // Aceita todos os status codes
      });
      
      status = response.status;
    } catch (error) {
      status = 500;
      errorMessage = this.getErrorMessage(error);
    }

    const responseTime = Date.now() - startTime;
    
    // Salva o resultado
    await Site.findByIdAndUpdate(site._id, {
      $push: {
        uptimeChecks: {
          status,
          responseTime,
          error: errorMessage
        }
      }
    });

    // Log do resultado
    await Log.create({
      level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      message: `Uptime check for ${site.url}`,
      context: {
        status,
        responseTime,
        error: errorMessage
      },
      userId: site.userId,
      siteId: site._id
    });

    return {
      siteId: site._id,
      status,
      responseTime,
      error: errorMessage
    };
  }

  getErrorMessage(error) {
    if (error.response) {
      return `Server responded with status ${error.response.status}`;
    } else if (error.request) {
      return 'No response received';
    } else if (error.code === 'ECONNABORTED') {
      return 'Request timeout';
    } else {
      return error.message || 'Unknown error';
    }
  }
}

module.exports = UptimeMonitor;

