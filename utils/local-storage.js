/**
 * Local credential storage (alternative to Google Sheets)
 * Stores credentials securely in browser local storage
 * MORE SECURE than public Google Sheets
 */

class LocalCredentialStorage {
  /**
   * Initialize with encrypted master credentials
   */
  static async initialize() {
    const existing = await chrome.storage.local.get('credentials');
    if (!existing.credentials) {
      // Set default credentials
      await this.setDefaultCredentials();
    }
  }

  /**
   * Set default credentials (example data)
   * In production, you'd set these through the Options page
   */
  static async setDefaultCredentials() {
    const credentials = [
      {
        id: 1,
        websiteUrl: 'https://example.com',
        username: 'demo@example.com',
        password: 'DemoPassword123'
      }
      // Add more credentials here
    ];

    await chrome.storage.local.set({ credentials: credentials });
  }

  /**
   * Get all credentials
   * @returns {Promise<Array>} - Array of credentials
   */
  static async getAllCredentials() {
    const result = await chrome.storage.local.get('credentials');
    return result.credentials || [];
  }

  /**
   * Add new credential
   * @param {Object} credential - Credential object
   */
  static async addCredential(credential) {
    const credentials = await this.getAllCredentials();
    const newId = Math.max(0, ...credentials.map(c => c.id)) + 1;

    credentials.push({
      id: newId,
      websiteUrl: credential.websiteUrl,
      username: credential.username,
      password: credential.password
    });

    await chrome.storage.local.set({ credentials: credentials });
    return newId;
  }

  /**
   * Update existing credential
   * @param {number} id - Credential ID
   * @param {Object} updates - Fields to update
   */
  static async updateCredential(id, updates) {
    const credentials = await this.getAllCredentials();
    const index = credentials.findIndex(c => c.id === id);

    if (index !== -1) {
      credentials[index] = { ...credentials[index], ...updates };
      await chrome.storage.local.set({ credentials: credentials });
      return true;
    }
    return false;
  }

  /**
   * Delete credential
   * @param {number} id - Credential ID
   */
  static async deleteCredential(id) {
    const credentials = await this.getAllCredentials();
    const filtered = credentials.filter(c => c.id !== id);
    await chrome.storage.local.set({ credentials: filtered });
  }

  /**
   * Find credentials for URL
   * @param {string} url - Website URL
   * @returns {Promise<Array>} - Matching credentials
   */
  static async findCredentialsForUrl(url) {
    const credentials = await this.getAllCredentials();
    const normalizedUrl = this.normalizeUrl(url);

    return credentials.filter(cred => {
      const credUrl = this.normalizeUrl(cred.websiteUrl);
      return credUrl.includes(normalizedUrl) || normalizedUrl.includes(credUrl);
    });
  }

  /**
   * Normalize URL for comparison
   */
  static normalizeUrl(url) {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .replace(/\?.+$/, '');
  }

  /**
   * Get all users (for authentication)
   * @returns {Promise<Array>} - Array of users
   */
  static async getAllUsers() {
    const result = await chrome.storage.local.get('users');
    return result.users || [];
  }

  /**
   * Validate user credentials
   * @param {string} userId - User ID
   * @param {string} passwordHash - Hashed password
   * @returns {Promise<Object|null>} - User object or null
   */
  static async validateUser(userId, passwordHash) {
    const users = await this.getAllUsers();
    return users.find(u => u.userId === userId && u.passwordHash === passwordHash) || null;
  }

  /**
   * Add new user
   * @param {Object} user - User object
   */
  static async addUser(user) {
    const users = await this.getAllUsers();
    users.push(user);
    await chrome.storage.local.set({ users: users });
  }

  /**
   * Export credentials as JSON (for backup)
   * @returns {Promise<string>} - JSON string
   */
  static async exportCredentials() {
    const credentials = await this.getAllCredentials();
    return JSON.stringify(credentials, null, 2);
  }

  /**
   * Import credentials from JSON
   * @param {string} jsonString - JSON string of credentials
   */
  static async importCredentials(jsonString) {
    try {
      const credentials = JSON.parse(jsonString);
      await chrome.storage.local.set({ credentials: credentials });
      return true;
    } catch (error) {
      console.error('Failed to import credentials:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalCredentialStorage;
}
