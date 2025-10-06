/**
 * Backend API Client
 * Communicates with Vercel backend server instead of Google Sheets directly
 */

class BackendAPI {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
  }

  /**
   * Validate user credentials via backend
   * @param {string} userId - User ID
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} - User object if valid, null otherwise
   */
  async validateUser(userId, password) {
    try {
      const response = await fetch(`${this.backendUrl}/validate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null; // Invalid credentials
        }
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.user : null;
    } catch (error) {
      console.error('Error validating user via backend:', error);
      throw new Error('Failed to validate user');
    }
  }

  /**
   * Fetch all credentials from backend with RBAC filtering
   * @param {string} userId - User ID for permission filtering
   * @param {string} role - User role (Admin/Staff)
   * @param {string} fullName - User's full name for VA Name matching
   * @returns {Promise<Array>} - Array of credential objects
   */
  async fetchCredentials(userId, role, fullName) {
    try {
      const params = new URLSearchParams({
        userId: userId || '',
        role: role || 'Staff',
        fullName: fullName || ''
      });

      const response = await fetch(`${this.backendUrl}/credentials?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.credentials : [];
    } catch (error) {
      console.error('Error fetching credentials via backend:', error);
      throw new Error('Failed to fetch credentials');
    }
  }

  /**
   * Test backend connection
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackendAPI;
}
