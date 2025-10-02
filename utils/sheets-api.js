/**
 * Google Sheets API integration for credential and authentication management
 * Fetches data from Google Sheets using API key authentication
 */

class SheetsAPI {
  constructor(apiKey, spreadsheetId) {
    this.apiKey = apiKey;
    this.spreadsheetId = spreadsheetId;
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  /**
   * Fetch data from a specific sheet range
   * @param {string} range - Sheet range (e.g., "Sheet1!A1:C100")
   * @returns {Promise<Array>} - Array of row data
   */
  async fetchRange(range) {
    try {
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(range)}?key=${this.apiKey}`;

      console.log('Fetching from Google Sheets:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error Response:', errorData);

        if (response.status === 400) {
          const error = new Error(`Bad Request (400): Sheet or range "${range}" not found.`);
          error.isRangeNotFound = true;
          throw error;
        } else if (response.status === 403) {
          throw new Error(`Permission Denied (403): Sheet is not shared or API key doesn't have access.`);
        } else {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('Fetched data:', data);
      return data.values || [];
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Fetch credentials from the credentials sheet
   * Expected columns: Website URL | Username/ID | Password
   * @returns {Promise<Array>} - Array of credential objects
   */
  async fetchCredentials() {
    try {
      // Try "Credentials" first, fallback to "Sheet1" if not found
      let rows;
      try {
        console.log('Attempting to fetch from Credentials tab...');
        rows = await this.fetchRange('Credentials!A2:C');
      } catch (error) {
        if (error.isRangeNotFound) {
          console.log('Credentials tab not found, trying Sheet1...');
          rows = await this.fetchRange('Sheet1!A2:C');
        } else {
          throw error;
        }
      }

      return rows.map((row, index) => ({
        id: index + 2, // Row number in sheet (starting from 2)
        websiteUrl: row[0] || '',
        username: row[1] || '',
        password: row[2] || ''
      })).filter(cred => cred.websiteUrl && cred.username && cred.password);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw new Error('Failed to fetch credentials from Google Sheets');
    }
  }

  /**
   * Fetch user authentication data
   * Expected columns: User ID | Password Hash | Full Name | Email
   * @returns {Promise<Array>} - Array of user objects
   */
  async fetchUsers() {
    try {
      // Try "Users" first, fallback to "Sheet2" if not found
      let rows;
      try {
        console.log('Attempting to fetch from Users tab...');
        rows = await this.fetchRange('Users!A2:D');
      } catch (error) {
        if (error.isRangeNotFound) {
          console.log('Users tab not found, trying Sheet2...');
          rows = await this.fetchRange('Sheet2!A2:D');
        } else {
          throw error;
        }
      }

      return rows.map(row => ({
        userId: row[0] || '',
        password: row[1] || '', // Can be plain text or hash
        fullName: row[2] || '',
        email: row[3] || ''
      })).filter(user => user.userId && user.password);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch user data from Google Sheets');
    }
  }

  /**
   * Validate user credentials
   * @param {string} userId - User ID
   * @param {string} password - Plain text or hashed password
   * @returns {Promise<Object|null>} - User object if valid, null otherwise
   */
  async validateUser(userId, password) {
    try {
      // Fetch users from Google Sheets
      const users = await this.fetchUsers();

      // Find user and check password (plain text comparison)
      const user = users.find(u => {
        if (u.userId !== userId) return false;
        return u.password === password;
      });

      if (user) {
        console.log('User authenticated from Google Sheets:', user.userId);
      }

      return user || null;
    } catch (error) {
      console.error('Error validating user:', error);
      throw new Error('Failed to validate user credentials');
    }
  }

  /**
   * Find credentials matching a specific website URL
   * @param {string} websiteUrl - Target website URL (can be partial match)
   * @returns {Promise<Array>} - Array of matching credentials
   */
  async findCredentialsForUrl(websiteUrl) {
    try {
      const allCredentials = await this.fetchCredentials();

      // Normalize URL for matching
      const normalizedTarget = this.normalizeUrl(websiteUrl);

      return allCredentials.filter(cred => {
        const normalizedCred = this.normalizeUrl(cred.websiteUrl);
        return normalizedCred.includes(normalizedTarget) || normalizedTarget.includes(normalizedCred);
      });
    } catch (error) {
      console.error('Error finding credentials for URL:', error);
      return [];
    }
  }

  /**
   * Normalize URL for comparison (remove protocol, trailing slash, etc.)
   * @param {string} url - URL to normalize
   * @returns {string} - Normalized URL
   */
  normalizeUrl(url) {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .replace(/\?.+$/, ''); // Remove query parameters
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      const url = `${this.baseUrl}/${this.spreadsheetId}?key=${this.apiKey}`;
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SheetsAPI;
}
