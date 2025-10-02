# Password Manager Backend - Vercel Serverless API

This is the backend API for the Secure Password Manager Chrome Extension. It provides secure access to Google Sheets credentials using service account authentication, ensuring your spreadsheet remains completely private.

## 🎯 Purpose

- **Secure Sheet Access** - Keep Google Sheet private using service account credentials
- **Authentication API** - Validate user login credentials from Google Sheets
- **Credential Fetching** - Retrieve stored credentials without exposing the sheet
- **Serverless Deployment** - No server maintenance required

---

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Google Cloud Service Account** with JSON key file
2. **Google Sheet** with credentials and users data
3. **Vercel Account** (free tier works)
4. **Node.js** installed (v18+ recommended)
5. **Vercel CLI** installed globally

---

## 🚀 Deployment Guide

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### Step 3: Deploy Backend

Navigate to the backend directory and deploy:

```bash
cd backend-server
vercel
```

- Press **Enter** to accept defaults
- Select **"Yes"** when asked to setup and deploy

### Step 4: Add Environment Variables

You need to add two environment variables to Vercel:

#### 1. Service Account Credentials

```bash
vercel env add SERVICE_ACCOUNT_CREDENTIALS
```

- Select: **Production**
- Paste: **Entire JSON content** from your service account file
- Press **Enter**

**Example format:**
```json
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"password-manager-service@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

#### 2. Spreadsheet ID

```bash
vercel env add SPREADSHEET_ID
```

- Select: **Production**
- Paste: Your Google Sheet ID (from the URL)
- Press **Enter**

**Example:**
```
1dNODVhGoOdGSsgpS1u8HXjVItrZV_otAtJQv0sW-nNI
```

### Step 5: Redeploy with Environment Variables

After adding environment variables, redeploy to production:

```bash
vercel --prod
```

### Step 6: Copy Deployment URL

Vercel will provide a deployment URL like:
```
https://your-project.vercel.app
```

Use this URL in your extension's `config.js`:
```javascript
BACKEND_URL: 'https://your-project.vercel.app/api'
```

---

## 🔌 API Endpoints

### 1. Health Check

**GET** `/api/health`

Check if the backend is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### 2. Validate User

**POST** `/api/validate-user`

Validate user login credentials from Google Sheets.

**Request Body:**
```json
{
  "userId": "john",
  "password": "john123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "userId": "john",
    "fullName": "John Doe",
    "email": "john@company.com"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### 3. Get Credentials

**GET** `/api/credentials`

Fetch all credentials from Google Sheets.

**Success Response (200):**
```json
{
  "success": true,
  "credentials": [
    {
      "id": 2,
      "websiteUrl": "https://example.com",
      "username": "admin@company.com",
      "password": "SecurePass123"
    },
    {
      "id": 3,
      "websiteUrl": "https://app.service.com",
      "username": "team@company.com",
      "password": "AnotherPass456"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## 📊 Google Sheets Format

Your Google Sheet must have the following structure:

### Sheet 1: "Credentials" or "Sheet1"

| Column A       | Column B            | Column C      |
|----------------|---------------------|---------------|
| Website URL    | Username/ID         | Password      |
| https://example.com | admin@company.com | SecurePass123 |
| https://app.service.com | team@company.com | AnotherPass456 |

### Sheet 2: "Users" or "Sheet2"

| Column A | Column B | Column C        | Column D            |
|----------|----------|-----------------|---------------------|
| User ID  | Password | Full Name       | Email               |
| john     | john123  | John Doe        | john@company.com    |
| sarah    | sarah456 | Sarah Smith     | sarah@company.com   |

---

## 🔒 Security Features

- **Service Account Auth** - Google Sheet never needs to be public
- **Read-Only Access** - Service account only has Viewer permission
- **No API Keys in Extension** - API key stays secure in Vercel
- **CORS Configured** - Only allows requests from extension
- **Environment Variables** - Sensitive data stored securely in Vercel

---

## 🔄 Updating the Backend

### Update Code

If you modify any code in `backend-server/`:

```bash
cd backend-server
vercel --prod
```

### Update Environment Variables

If you need to change environment variables:

```bash
# Remove old variable
vercel env rm SERVICE_ACCOUNT_CREDENTIALS production

# Add new variable
vercel env add SERVICE_ACCOUNT_CREDENTIALS
# Then paste new value and select Production

# Redeploy
vercel --prod
```

---

## 🐛 Troubleshooting

### Error: "Permission Denied (403)"

**Cause:** Service account doesn't have access to the Google Sheet.

**Fix:**
1. Go to your Google Sheet
2. Click "Share"
3. Add the service account email (e.g., `password-manager-service@project.iam.gserviceaccount.com`)
4. Set permission to **Viewer**
5. Click Share

### Error: "Sheet or range not found (400)"

**Cause:** Sheet tabs are not named correctly.

**Fix:**
- Ensure you have tabs named **"Credentials"** and **"Users"**
- Or use default names **"Sheet1"** and **"Sheet2"**

### Error: "Invalid service account credentials"

**Cause:** `SERVICE_ACCOUNT_CREDENTIALS` environment variable is malformed.

**Fix:**
1. Verify JSON is valid (use jsonlint.com)
2. Ensure entire JSON is pasted (including curly braces)
3. Remove and re-add the environment variable:
   ```bash
   vercel env rm SERVICE_ACCOUNT_CREDENTIALS production
   vercel env add SERVICE_ACCOUNT_CREDENTIALS
   vercel --prod
   ```

### Error: "Spreadsheet not found"

**Cause:** Wrong `SPREADSHEET_ID` or service account lacks access.

**Fix:**
1. Verify spreadsheet ID from URL
2. Ensure sheet is shared with service account
3. Update `SPREADSHEET_ID` environment variable:
   ```bash
   vercel env rm SPREADSHEET_ID production
   vercel env add SPREADSHEET_ID
   vercel --prod
   ```

### Backend Returns 500 Error

**Check Vercel Logs:**
```bash
vercel logs
```

Look for specific error messages to diagnose the issue.

---

## 📁 Project Structure

```
backend-server/
├── api/
│   └── index.js                 # Main API handler
├── package.json                 # Dependencies
├── vercel.json                  # Vercel configuration
└── README.md                    # This file
```

---

## 🔍 Monitoring

### View Logs

```bash
vercel logs
```

### View Deployments

```bash
vercel ls
```

### View Environment Variables

```bash
vercel env ls
```

---

## 📦 Dependencies

- **googleapis** - Google Sheets API client
- **Node.js** - Runtime environment

All dependencies are automatically installed by Vercel during deployment.

---

## ⚠️ Important Notes

1. **Keep Service Account JSON Secure** - Never commit to Git
2. **Use Environment Variables** - Never hardcode credentials
3. **Monitor Usage** - Check Vercel dashboard for API usage
4. **Keep Sheet Private** - Only share with service account
5. **Use Read-Only Permission** - Service account should only be Viewer

---

## 🆘 Support

- **Backend Issues:** Check Vercel logs (`vercel logs`)
- **Google Sheets Issues:** Verify sheet structure and sharing
- **Deployment Issues:** See Vercel documentation at vercel.com/docs

---

## 📖 Related Documentation

- [Main Extension README](../README.md)
- [Vercel Setup Guide](../VERCEL_SETUP_GUIDE.md)
- [Security Policy](../SECURITY.md)

---

**Made with ❤️ for secure team password management**
