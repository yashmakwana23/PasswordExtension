# Password Manager Backend - Vercel Deployment

This backend server handles authentication and credential fetching from Google Sheets using a service account, keeping the sheet completely private.

## Setup Instructions

### 1. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Sheets API**:
   - Navigation menu → APIs & Services → Library
   - Search "Google Sheets API" → Enable
4. Create Service Account:
   - APIs & Services → Credentials
   - Create Credentials → Service Account
   - Name: `password-manager-service`
   - Skip roles → Done
5. Create JSON Key:
   - Click on the service account
   - Keys tab → Add Key → Create new key → JSON
   - Download the JSON file
6. **Copy the service account email** (e.g., `password-manager-service@project-id.iam.gserviceaccount.com`)

### 2. Share Google Sheet with Service Account

1. Open your Google Sheet
2. Click **Share**
3. Paste the service account email
4. Set permission to **Viewer**
5. Uncheck "Notify people"
6. Click Share

Now your sheet is private - only accessible by the service account!

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Easiest)

1. **Install Vercel CLI** (one-time):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Navigate to backend folder**:
   ```bash
   cd backend-server
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   - Follow prompts (press Enter to accept defaults)
   - When asked "Set up and deploy?", select **Yes**

5. **Add Environment Variables**:

   After deployment, add your service account credentials:

   ```bash
   vercel env add SERVICE_ACCOUNT_CREDENTIALS
   ```

   - Select "Production"
   - Paste the **entire contents** of your service account JSON file (copy from the downloaded JSON)
   - Press Enter

   Also add the spreadsheet ID:
   ```bash
   vercel env add SPREADSHEET_ID
   ```
   - Select "Production"
   - Enter: `1dNODVhGoOdGSsgpS1u8HXjVItrZV_otAtJQv0sW-nNI`

6. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

7. **Copy your deployment URL** (e.g., `https://your-project.vercel.app`)

#### Option B: Deploy via Vercel Website

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New** → **Project**
3. Import your Git repository (or upload folder)
4. Configure:
   - Framework Preset: **Other**
   - Root Directory: `backend-server`
5. Add Environment Variables:
   - `SERVICE_ACCOUNT_CREDENTIALS`: Paste entire JSON content
   - `SPREADSHEET_ID`: `1dNODVhGoOdGSsgpS1u8HXjVItrZV_otAtJQv0sW-nNI`
6. Click **Deploy**
7. Copy your deployment URL

### 4. Update Extension Configuration

1. Open `config.js` in your extension
2. Update the backend URL:
   ```javascript
   BACKEND_URL: 'https://your-project.vercel.app/api'
   ```
3. Reload the extension

## API Endpoints

### POST /api/validate-user
Authenticate user against Google Sheets Users tab.

**Request:**
```json
{
  "userId": "yash",
  "password": "yash"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "yash",
    "fullName": "Yash",
    "email": "yash@example.com"
  }
}
```

### GET /api/credentials
Get all credentials from Google Sheets Credentials tab.

**Response:**
```json
{
  "success": true,
  "credentials": [
    {
      "id": 2,
      "websiteUrl": "https://app.yaballe.com/",
      "username": "ABC",
      "password": "123"
    }
  ]
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Testing Locally

```bash
cd backend-server
npm install

# Set environment variables
export SERVICE_ACCOUNT_CREDENTIALS='{"type":"service_account",...}'
export SPREADSHEET_ID='1dNODVhGoOdGSsgpS1u8HXjVItrZV_otAtJQv0sW-nNI'

# Run
npm run dev
```

Server will run on http://localhost:3000

## Security Notes

- ✅ Service account credentials stored securely in Vercel environment variables
- ✅ Google Sheet can be completely private
- ✅ Extension never sees service account credentials
- ✅ Staff members can't access sheet directly
- ⚠️ Currently allows all CORS origins - update in production to only allow your extension ID

## Troubleshooting

**Error: "Service account credentials not found"**
- Make sure you added `SERVICE_ACCOUNT_CREDENTIALS` environment variable in Vercel
- Redeploy after adding environment variables

**Error: "Permission denied"**
- Make sure you shared the Google Sheet with the service account email
- Check service account has "Viewer" permission

**Error: "Spreadsheet not found"**
- Verify `SPREADSHEET_ID` environment variable is correct
- Check sheet ID in the URL matches the environment variable
