const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const axios = require('axios');
const logger = require('../utils/logger');

class GoogleAuth {
  constructor(refreshToken) {
    this.oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'https://yourdomain.com/auth/google/callback'
    );
    
    if (refreshToken) {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    }
  }

  async getAnalyticsData(viewId) {
    try {
      const analytics = google.analyticsreporting({
        version: 'v4',
        auth: this.oauth2Client
      });

      const response = await analytics.reports.batchGet({
        requestBody: {
          reportRequests: [
            {
              viewId,
              dateRanges: [
                {
                  startDate: '7daysAgo',
                  endDate: 'today'
                }
              ],
              metrics: [
                { expression: 'ga:sessions' },
                { expression: 'ga:users' },
                { expression: 'ga:pageviews' }
              ],
              dimensions: [{ name: 'ga:date' }]
            }
          ]
        }
      });

      return this.formatAnalyticsData(response.data);
    } catch (error) {
      logger.error('Google Analytics error:', error);
      throw new Error('Failed to fetch analytics data');
    }
  }

  formatAnalyticsData(data) {
    // Implementação da formatação dos dados
    return {
      sessions: 0,
      users: 0,
      pageviews: 0,
      chartData: []
    };
  }

  static getAuthUrl() {
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/webmasters.readonly'
      ],
      prompt: 'consent'
    });
  }

  static async getTokens(code) {
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }
}

module.exports = GoogleAuth;

