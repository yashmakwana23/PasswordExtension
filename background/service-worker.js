/**
 * Background Service Worker
 * Handles credential fetching, caching, and communication between components
 */

// Import utilities
importScripts(
  '../config.js',
  '../utils/crypto.js',
  '../utils/storage.js',
  '../utils/sheets-api.js',
  '../utils/backend-api.js'
);

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Secure Password Manager installed');
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async operations
  handleMessage(request, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

/**
 * Handle incoming messages
 */
async function handleMessage(request, sender) {
  try {
    switch (request.action) {
      case 'checkAuth':
        return await checkAuthentication();

      case 'fetchCredentials':
        return await fetchCredentialsForUrl(request.url);

      case 'refreshCredentials':
        return await refreshCredentialsCache();

      case 'logout':
        return await logout();

      case 'testConnection':
        return await testSheetsConnection();

      case 'getCredentialForAutofill':
        return await getCredentialForAutofill(request.credentialId);

      case 'fetchAllCredentials':
        return await fetchAllCredentials();

      case 'validateUser':
        return await validateUser(request.userId, request.password);

      case 'getCredentialForCopy':
        return await getCredentialForAutofill(request.credentialId);

      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('Error handling message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is authenticated
 */
async function checkAuthentication() {
  const isAuth = await StorageUtils.isAuthenticated();
  return { success: true, authenticated: isAuth };
}

/**
 * Fetch credentials for a specific URL
 */
async function fetchCredentialsForUrl(url) {
  try {
    // Check authentication
    const isAuth = await StorageUtils.isAuthenticated();
    if (!isAuth) {
      return { success: false, error: 'Not authenticated' };
    }

    // Use hardcoded configuration
    if (!CONFIG || !CONFIG.CREDENTIALS_SPREADSHEET_ID) {
      console.log('Google Sheets not configured, returning empty credentials');
      return { success: true, credentials: [] };
    }

    // Check cache first
    let credentials = await StorageUtils.getCachedCredentials();

    // If no cache, fetch from Sheets
    if (!credentials) {
      const sheetsApi = new SheetsAPI(CONFIG.SHEETS_API_KEY, CONFIG.CREDENTIALS_SPREADSHEET_ID);
      credentials = await sheetsApi.fetchCredentials();

      // Encrypt and cache credentials
      const session = await StorageUtils.getSession();
      const key = await CryptoUtils.generateKey(session.sessionToken);

      const encryptedCredentials = await Promise.all(
        credentials.map(async (cred) => ({
          id: cred.id,
          websiteUrl: cred.websiteUrl,
          username: cred.username,
          encryptedPassword: await CryptoUtils.encrypt(cred.password, key)
        }))
      );

      await StorageUtils.cacheCredentials(encryptedCredentials);
      credentials = encryptedCredentials;
    }

    // Filter credentials for the requested URL
    const normalizedUrl = normalizeUrl(url);
    const matchingCredentials = credentials.filter(cred => {
      const credUrl = normalizeUrl(cred.websiteUrl);
      return credUrl.includes(normalizedUrl) || normalizedUrl.includes(credUrl);
    });

    // Return only safe data (no passwords)
    const safeCredentials = matchingCredentials.map(cred => ({
      id: cred.id,
      websiteUrl: cred.websiteUrl,
      username: cred.username
    }));

    return { success: true, credentials: safeCredentials };

  } catch (error) {
    console.error('Error fetching credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get decrypted credential for autofill
 * Only called when user selects a credential
 */
async function getCredentialForAutofill(credentialId) {
  try {
    // Check authentication
    const isAuth = await StorageUtils.isAuthenticated();
    if (!isAuth) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get cached credentials
    const credentials = await StorageUtils.getCachedCredentials();
    if (!credentials) {
      return { success: false, error: 'No cached credentials' };
    }

    // Find the credential
    const credential = credentials.find(c => c.id === credentialId);
    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    // Decrypt password
    const session = await StorageUtils.getSession();
    const key = await CryptoUtils.generateKey(session.sessionToken);
    const password = await CryptoUtils.decrypt(credential.encryptedPassword, key);

    // Log credential access
    console.log(`Credential accessed: User ${session.userId} accessed credential ID ${credentialId} at ${new Date().toISOString()}`);

    return {
      success: true,
      credential: {
        username: credential.username,
        password: password
      }
    };

  } catch (error) {
    console.error('Error getting credential for autofill:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Refresh credentials cache from Google Sheets
 */
async function refreshCredentialsCache() {
  try {
    // Check authentication
    const isAuth = await StorageUtils.isAuthenticated();
    if (!isAuth) {
      return { success: false, error: 'Not authenticated' };
    }

    // Clear existing cache
    await StorageUtils.clearCache();

    // Use hardcoded configuration
    if (!CONFIG || !CONFIG.CREDENTIALS_SPREADSHEET_ID) {
      console.log('Google Sheets not configured, cannot refresh');
      return { success: true, count: 0 };
    }

    // Get user session for RBAC
    const session = await StorageUtils.getSession();

    // Fetch fresh credentials via backend or direct API
    let credentials;
    if (CONFIG.BACKEND_URL) {
      // Use backend API with RBAC filtering
      const backendApi = new BackendAPI(CONFIG.BACKEND_URL);
      credentials = await backendApi.fetchCredentials(
        session.userId,
        session.role || 'Staff',
        session.fullName
      );
    } else {
      // Fallback to direct Google Sheets API
      const sheetsApi = new SheetsAPI(CONFIG.SHEETS_API_KEY, CONFIG.CREDENTIALS_SPREADSHEET_ID);
      credentials = await sheetsApi.fetchCredentials();
    }

    // Encrypt and cache
    const key = await CryptoUtils.generateKey(session.sessionToken);

    const encryptedCredentials = await Promise.all(
      credentials.map(async (cred) => ({
        id: cred.id,
        websiteUrl: cred.websiteUrl,
        username: cred.username,
        encryptedPassword: await CryptoUtils.encrypt(cred.password, key)
      }))
    );

    await StorageUtils.cacheCredentials(encryptedCredentials);

    console.log(`Credentials cache refreshed: ${encryptedCredentials.length} credentials loaded`);

    return { success: true, count: encryptedCredentials.length };

  } catch (error) {
    console.error('Error refreshing credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Logout user
 */
async function logout() {
  try {
    await StorageUtils.clearSession();
    await StorageUtils.clearCache();
    console.log('User logged out');
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test Google Sheets API connection
 */
async function testSheetsConnection() {
  try {
    if (!CONFIG || !CONFIG.CREDENTIALS_SPREADSHEET_ID) {
      return { success: false, error: 'Not configured' };
    }

    const sheetsApi = new SheetsAPI(CONFIG.SHEETS_API_KEY, CONFIG.CREDENTIALS_SPREADSHEET_ID);
    const connected = await sheetsApi.testConnection();

    return { success: connected, connected: connected };
  } catch (error) {
    console.error('Connection test error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url) {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .replace(/\?.+$/, '');
}

/**
 * Fetch ALL credentials (for popup list view) with RBAC filtering
 */
async function fetchAllCredentials() {
  try {
    // Check authentication
    const isAuth = await StorageUtils.isAuthenticated();
    if (!isAuth) {
      return { success: false, error: 'Not authenticated' };
    }

    // Use hardcoded config from imported config.js
    if (!CONFIG || !CONFIG.CREDENTIALS_SPREADSHEET_ID) {
      return { success: false, error: 'Configuration error' };
    }

    // Get user session for RBAC
    const session = await StorageUtils.getSession();

    // Check cache first
    let credentials = await StorageUtils.getCachedCredentials();

    // If no cache, fetch from backend or Sheets
    if (!credentials) {
      // Use backend API if configured
      if (CONFIG.BACKEND_URL) {
        const backendApi = new BackendAPI(CONFIG.BACKEND_URL);
        credentials = await backendApi.fetchCredentials(
          session.userId,
          session.role || 'Staff',
          session.fullName
        );
      } else {
        // Fallback to direct Google Sheets API
        const sheetsApi = new SheetsAPI(CONFIG.SHEETS_API_KEY, CONFIG.CREDENTIALS_SPREADSHEET_ID);
        credentials = await sheetsApi.fetchCredentials();
      }

      // Encrypt and cache credentials
      const key = await CryptoUtils.generateKey(session.sessionToken);

      const encryptedCredentials = await Promise.all(
        credentials.map(async (cred) => ({
          id: cred.id,
          websiteUrl: cred.websiteUrl,
          username: cred.username,
          encryptedPassword: await CryptoUtils.encrypt(cred.password, key)
        }))
      );

      await StorageUtils.cacheCredentials(encryptedCredentials);
      credentials = encryptedCredentials;
    }

    // Return ALL credentials (without passwords) for list view
    const safeCredentials = credentials.map(cred => ({
      id: cred.id,
      websiteUrl: cred.websiteUrl,
      username: cred.username
    }));

    return { success: true, credentials: safeCredentials };

  } catch (error) {
    console.error('Error fetching all credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate user - uses backend API if configured, otherwise Google Sheets directly
 */
async function validateUser(userId, password) {
  try {
    // Use backend API if configured
    if (CONFIG && CONFIG.BACKEND_URL) {
      const backendApi = new BackendAPI(CONFIG.BACKEND_URL);
      const user = await backendApi.validateUser(userId, password);

      if (user) {
        return { success: true, user: user };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    }

    // Fallback to direct Google Sheets API
    if (!CONFIG || !CONFIG.AUTH_SPREADSHEET_ID) {
      return { success: false, error: 'Configuration error' };
    }

    const sheetsApi = new SheetsAPI(CONFIG.SHEETS_API_KEY, CONFIG.AUTH_SPREADSHEET_ID);
    const user = await sheetsApi.validateUser(userId, password);

    if (user) {
      return { success: true, user: user };
    } else {
      return { success: false, error: 'Invalid credentials' };
    }
  } catch (error) {
    console.error('Error validating user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-clear session on browser close (optional security feature)
 */
chrome.runtime.onSuspend.addListener(() => {
  // Optionally clear session when extension is suspended
  // Uncomment if you want users to re-authenticate after browser restart
  // StorageUtils.clearSession();
  // StorageUtils.clearCache();
});
