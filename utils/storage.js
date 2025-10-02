/**
 * Storage utilities for secure browser extension storage
 * Handles session management and temporary credential storage
 */

class StorageUtils {
  /**
   * Save user session data
   * @param {Object} sessionData - Session information
   */
  static async saveSession(sessionData) {
    await chrome.storage.session.set({
      userSession: sessionData,
      sessionTimestamp: Date.now()
    });
  }

  /**
   * Get current user session
   * @returns {Promise<Object|null>} - Session data or null
   */
  static async getSession() {
    const result = await chrome.storage.session.get(['userSession', 'sessionTimestamp']);

    // Check session expiry (30 minutes)
    if (result.sessionTimestamp && (Date.now() - result.sessionTimestamp > 1800000)) {
      await this.clearSession();
      return null;
    }

    return result.userSession || null;
  }

  /**
   * Clear user session
   */
  static async clearSession() {
    await chrome.storage.session.clear();
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} - True if authenticated
   */
  static async isAuthenticated() {
    const session = await this.getSession();
    return session !== null && session.userId && session.sessionToken;
  }

  /**
   * Save extension configuration
   * @param {Object} config - Configuration object
   */
  static async saveConfig(config) {
    await chrome.storage.local.set({ config: config });
  }

  /**
   * Get extension configuration
   * @returns {Promise<Object>} - Configuration object
   */
  static async getConfig() {
    const result = await chrome.storage.local.get('config');
    const config = result.config || {
      sheetsApiKey: '',
      credentialsSpreadsheetId: '',
      authSpreadsheetId: '',
      targetWebsiteUrl: ''
    };

    // Hardcoded API key fallback for testing
    // API Key: AIzaSyD_5jeJBOjXnFmzcT8eHndSuNMK6YfMh1Q
    if (!config.sheetsApiKey) {
      config.sheetsApiKey = 'AIzaSyD_5jeJBOjXnFmzcT8eHndSuNMK6YfMh1Q';
    }

    return config;
  }

  /**
   * Store encrypted credentials temporarily (in-memory only, session storage)
   * @param {Array} credentials - Array of credential objects
   */
  static async cacheCredentials(credentials) {
    await chrome.storage.session.set({
      cachedCredentials: credentials,
      cacheTimestamp: Date.now()
    });
  }

  /**
   * Get cached credentials
   * @returns {Promise<Array|null>} - Cached credentials or null
   */
  static async getCachedCredentials() {
    const result = await chrome.storage.session.get(['cachedCredentials', 'cacheTimestamp']);

    // Cache expires after 10 minutes
    if (result.cacheTimestamp && (Date.now() - result.cacheTimestamp > 600000)) {
      await chrome.storage.session.remove(['cachedCredentials', 'cacheTimestamp']);
      return null;
    }

    return result.cachedCredentials || null;
  }

  /**
   * Clear all cached data
   */
  static async clearCache() {
    await chrome.storage.session.remove(['cachedCredentials', 'cacheTimestamp']);
  }

  /**
   * Save last autofill timestamp for rate limiting
   * @param {string} url - Website URL
   */
  static async recordAutofill(url) {
    const result = await chrome.storage.session.get('autofillHistory') || {};
    const history = result.autofillHistory || {};
    history[url] = Date.now();
    await chrome.storage.session.set({ autofillHistory: history });
  }

  /**
   * Check if autofill was recently performed (prevent double-fills)
   * @param {string} url - Website URL
   * @returns {Promise<boolean>} - True if recently autofilled
   */
  static async wasRecentlyAutofilled(url) {
    const result = await chrome.storage.session.get('autofillHistory');
    const history = result.autofillHistory || {};
    const lastFill = history[url];

    // Consider "recent" as within last 5 seconds
    return lastFill && (Date.now() - lastFill < 5000);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageUtils;
}
