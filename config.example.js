/**
 * Configuration Template
 * Copy this file to config.js and replace with your actual values
 */

const CONFIG = {
  // ============================================
  // OPTION 1: Backend API (Recommended - More Secure)
  // ============================================
  // If using Vercel backend with service account:
  // 1. Set BACKEND_URL to your deployed Vercel URL
  // 2. Leave SHEETS_API_KEY empty (not needed with backend)
  // 3. Only need spreadsheet IDs below
  //
  // Backend API URL: https://your-project.vercel.app/api
  BACKEND_URL: '',

  // ============================================
  // OPTION 2: Direct Google Sheets API (Simpler but Less Secure)
  // ============================================
  // If NOT using backend (sheet must be public):
  // 1. Leave BACKEND_URL empty
  // 2. Get API key from: https://console.cloud.google.com/apis/credentials
  // 3. Make Google Sheet public (Anyone with link can view)
  //
  // Google Sheets API Key (ONLY needed if BACKEND_URL is empty)
  SHEETS_API_KEY: '',

  // ============================================
  // Required for Both Options
  // ============================================
  // Credentials Spreadsheet ID
  // Get from sheet URL: https://docs.google.com/spreadsheets/d/[THIS_PART]/edit
  CREDENTIALS_SPREADSHEET_ID: '',

  // Users Spreadsheet ID (for authentication)
  // Can be the same sheet as above, just different tab
  AUTH_SPREADSHEET_ID: '',

  // Session timeout in milliseconds (30 minutes)
  SESSION_TIMEOUT: 1800000,

  // Cache timeout in milliseconds (10 minutes)
  CACHE_TIMEOUT: 600000
};

// Make config globally available
if (typeof window !== 'undefined') {
  window.APP_CONFIG = CONFIG;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
