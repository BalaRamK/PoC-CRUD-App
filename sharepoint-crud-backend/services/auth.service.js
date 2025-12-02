const msal = require('@azure/msal-node');
const { msalConfig, tokenRequest } = require('../config/auth.config');

class AuthService {
  constructor() {
    this.cca = new msal.ConfidentialClientApplication(msalConfig);
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      // Check if token is cached and valid
      if (this.tokenCache && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.tokenCache;
      }

      // Get new token using client credentials flow
      const response = await this.cca.acquireTokenByClientCredential(tokenRequest);
      
      if (!response || !response.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Cache token and set expiry (5 minutes before actual expiry for safety)
      this.tokenCache = response.accessToken;
      this.tokenExpiry = new Date(new Date().getTime() + (response.expiresIn - 300) * 1000);

      console.log('✓ Access token acquired successfully');
      return this.tokenCache;
    } catch (error) {
      console.error('Error acquiring token:', error.message);
      throw error;
    }
  }

  clearTokenCache() {
    this.tokenCache = null;
    this.tokenExpiry = null;
  }
}

module.exports = new AuthService();