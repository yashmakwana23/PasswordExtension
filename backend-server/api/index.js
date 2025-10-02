/**
 * Password Manager Backend API - Vercel Serverless Function
 * Handles authentication and credential fetching from Google Sheets
 */

const { google } = require('googleapis');

// CORS headers for allowing extension to access API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Main handler for all API requests
 */
module.exports = async (req, res) => {
  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  try {
    const path = req.url.replace('/api', '');

    // Route requests
    if (path === '/validate-user' && req.method === 'POST') {
      return await validateUser(req, res);
    } else if (path === '/credentials' && req.method === 'GET') {
      return await getCredentials(req, res);
    } else if (path === '/health' && req.method === 'GET') {
      return res.status(200).json({ status: 'ok', message: 'Server is running' });
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get Google Sheets client with service account auth
 */
async function getSheetsClient() {
  // Service account credentials from environment variable
  const credentials = JSON.parse(process.env.SERVICE_ACCOUNT_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * Fetch data from Google Sheets
 */
async function fetchSheetData(range) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

/**
 * Validate user credentials
 * POST /api/validate-user
 * Body: { userId, password }
 */
async function validateUser(req, res) {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ error: 'Missing userId or password' });
    }

    // Fetch users from Google Sheets
    let rows;
    try {
      rows = await fetchSheetData('Users!A2:D');
    } catch (error) {
      // Fallback to Sheet2 if Users tab doesn't exist
      rows = await fetchSheetData('Sheet2!A2:D');
    }

    // Find matching user
    const users = rows.map(row => ({
      userId: row[0] || '',
      password: row[1] || '',
      fullName: row[2] || '',
      email: row[3] || ''
    }));

    const user = users.find(u => u.userId === userId && u.password === password);

    if (user) {
      // Don't send password back
      return res.status(200).json({
        success: true,
        user: {
          userId: user.userId,
          fullName: user.fullName,
          email: user.email
        }
      });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Validate user error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all credentials
 * GET /api/credentials
 */
async function getCredentials(req, res) {
  try {
    // Fetch credentials from Google Sheets
    let rows;
    try {
      rows = await fetchSheetData('Credentials!A2:C');
    } catch (error) {
      // Fallback to Sheet1 if Credentials tab doesn't exist
      rows = await fetchSheetData('Sheet1!A2:C');
    }

    // Map to credential objects
    const credentials = rows.map((row, index) => ({
      id: index + 2, // Row number in sheet
      websiteUrl: row[0] || '',
      username: row[1] || '',
      password: row[2] || ''
    })).filter(cred => cred.websiteUrl && cred.username && cred.password);

    return res.status(200).json({
      success: true,
      credentials
    });
  } catch (error) {
    console.error('Get credentials error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
