# Secure Password Manager - Chrome Extension

A secure password manager Chrome extension for teams, featuring centralized credential management via Google Sheets, one-click autofill, and enterprise-grade security with private backend deployment.

## 🎯 What Does This Extension Do?

- **Centralized Password Storage** - Store all team credentials in a private Google Sheet
- **One-Click Autofill** - Fill login forms automatically without copying/pasting
- **No Password Visibility** - Staff never see actual passwords
- **Session-Based Access** - Login once per session (30 min auto-logout)
- **Private & Secure** - Google Sheet stays completely private via Vercel backend
- **Admin Control** - Only administrators manage credentials in Google Sheet

## 🚀 Quick Start (For Users)

### Installation

1. Download/clone this extension
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the extension folder

### Using the Extension

1. **Login:**
   - Click the extension icon
   - Enter your User ID and Password (provided by admin)
   - Login valid for 30 minutes

2. **Fill Passwords:**
   - Navigate to a website that needs login
   - Click the extension icon
   - Search for the credential (if needed)
   - Click **"Fill Password"** button
   - Username and password auto-fill on the page

3. **Refresh Credentials:**
   - Click the refresh icon (↻) to load latest credentials from sheet

4. **Logout:**
   - Click logout icon when done

---

## 🛠️ Setup Guide (For Administrators)

This extension requires configuration before use. Choose one of two setup options:

### ⭐ Option 1: Vercel Backend (Recommended - Secure)

**Best for:** Production use, teams, sensitive credentials

**Features:**
- ✅ Google Sheet stays completely private
- ✅ Service account credentials hidden
- ✅ Production-ready security

**Setup Time:** ~15 minutes

**Steps:**

#### 1. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. **Enable Google Sheets API:**
   - Navigation menu → APIs & Services → Library
   - Search "Google Sheets API" → Enable

4. **Create Service Account:**
   - APIs & Services → Credentials
   - Create Credentials → Service Account
   - Name: `password-manager-service`
   - Click CREATE AND CONTINUE
   - Skip roles → DONE

5. **Download JSON Key:**
   - Click on the service account you created
   - Keys tab → ADD KEY → Create new key
   - Choose JSON → CREATE
   - Save the downloaded JSON file securely

6. **Copy Service Account Email:**
   - Example: `password-manager-service@project-id.iam.gserviceaccount.com`

#### 2. Create Google Sheet

1. **Create new Google Spreadsheet**

2. **Add "Credentials" tab:**
   ```
   Column A: Website URL
   Column B: Username/ID
   Column C: Password
   Column D: VA Name (Staff assigned - optional)

   Example:
   Row 1: Website URL              | Username/ID           | Password      | VA Name
   Row 2: https://example.com      | admin@company.com     | SecurePass123 | John Doe
   Row 3: https://app.service.com  | team@company.com      | AnotherPass456| Sarah Smith
   Row 4: https://shared.site.com  | shared@company.com    | SharedPass789 |
   ```

3. **Add "Users" tab:**
   ```
   Column A: User ID
   Column B: Password
   Column C: Full Name
   Column D: Email
   Column E: Role (Admin/Staff)

   Example:
   Row 1: User ID  | Password    | Full Name   | Email               | Role
   Row 2: admin1   | admin123    | Admin User  | admin@company.com   | Admin
   Row 3: john     | john123     | John Doe    | john@company.com    | Staff
   Row 4: sarah    | sarah456    | Sarah Smith | sarah@company.com   | Staff
   ```

4. **Add "Permissions" tab (optional - for fine-grained access):**
   ```
   Column A: Credential ID (row number from Credentials sheet)
   Column B: Allowed User IDs (comma-separated)

   Example:
   Row 1: Credential ID | Allowed User IDs
   Row 2: 2             | john,sarah
   Row 3: 4             | mike,john

   This allows specific users to access credentials beyond VA Name matching
   ```

5. **Share with Service Account:**
   - Click "Share" button
   - Paste the service account email
   - Set permission to **Viewer**
   - Uncheck "Notify people"
   - Click Share

6. **Copy Spreadsheet ID:**
   - From URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`
   - Copy the `SPREADSHEET_ID` part

#### 3. Deploy Backend to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy Backend:**
   ```bash
   cd backend-server
   vercel
   ```
   - Press Enter to accept defaults
   - Select "Yes" for setup and deploy

4. **Add Environment Variables:**

   Add service account credentials:
   ```bash
   vercel env add SERVICE_ACCOUNT_CREDENTIALS
   ```
   - Select: Production
   - Paste: ENTIRE JSON content from service account file
   - Press Enter

   Add spreadsheet ID:
   ```bash
   vercel env add SPREADSHEET_ID
   ```
   - Select: Production
   - Paste: Your spreadsheet ID
   - Press Enter

5. **Redeploy with Environment Variables:**
   ```bash
   vercel --prod
   ```

6. **Copy Deployment URL:**
   - Example: `https://your-project.vercel.app`

#### 4. Configure Extension

1. **Copy config template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Edit `config.js`:**
   ```javascript
   const CONFIG = {
     BACKEND_URL: 'https://your-project.vercel.app/api',
     SHEETS_API_KEY: '',  // Not needed with backend
     CREDENTIALS_SPREADSHEET_ID: 'your_spreadsheet_id',
     AUTH_SPREADSHEET_ID: 'your_spreadsheet_id',
     SESSION_TIMEOUT: 1800000,  // 30 minutes
     CACHE_TIMEOUT: 600000      // 10 minutes
   };
   ```

3. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click refresh icon on the extension

4. **Test:**
   - Click extension icon
   - Login with credentials from Users sheet
   - Should load credentials successfully

**✅ Done! Extension is ready for your team.**

**Full detailed guide:** See [VERCEL_SETUP_GUIDE.md](VERCEL_SETUP_GUIDE.md)

---

### Option 2: Direct API Access (Simple - Less Secure)

**Best for:** Testing, personal use, non-sensitive data

**Features:**
- ✅ Quick 5-minute setup
- ⚠️ Requires public Google Sheet
- ⚠️ API key visible in extension

**Setup Time:** ~5 minutes

**Steps:**

#### 1. Get Google Sheets API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google Sheets API
4. Create Credentials → API Key
5. Copy the API key

#### 2. Create Google Sheet

1. Create spreadsheet with "Credentials" and "Users" tabs (same structure as Option 1)
2. **Make sheet public:**
   - Click Share
   - Change to: "Anyone with the link"
   - Permission: Viewer
3. Copy spreadsheet ID from URL

#### 3. Configure Extension

1. **Copy config template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Edit `config.js`:**
   ```javascript
   const CONFIG = {
     BACKEND_URL: '',  // Leave empty for direct API
     SHEETS_API_KEY: 'YOUR_API_KEY_HERE',
     CREDENTIALS_SPREADSHEET_ID: 'your_spreadsheet_id',
     AUTH_SPREADSHEET_ID: 'your_spreadsheet_id',
     SESSION_TIMEOUT: 1800000,
     CACHE_TIMEOUT: 600000
   };
   ```

3. Reload extension and test

**⚠️ Warning:** Sheet must be public. Not recommended for real passwords.

**Comparison:** See [DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md)

---

## 📚 Project Structure

```
PasswordExtension/
├── README.md                    # This file
├── config.js                    # Your configuration (gitignored)
├── config.example.js            # Configuration template
├── manifest.json                # Extension manifest
│
├── popup/                       # Extension popup UI
│   ├── popup-new.html           # Main popup interface
│   ├── popup-new.js             # Popup logic
│   └── popup.css                # Styles
│
├── background/                  # Background service worker
│   └── service-worker.js        # Handles API calls & caching
│
├── content/                     # Content scripts
│   └── content-script.js        # Autofill functionality
│
├── utils/                       # Utility modules
│   ├── crypto.js                # AES-256 encryption
│   ├── storage.js               # Chrome storage wrapper
│   ├── sheets-api.js            # Google Sheets client
│   └── backend-api.js           # Vercel backend client
│
├── backend-server/              # Vercel serverless backend
│   ├── api/index.js             # API endpoints
│   ├── package.json
│   └── vercel.json
│
└── docs/                        # Documentation
    ├── SECURITY.md              # Security policy
    ├── VERCEL_SETUP_GUIDE.md    # Detailed setup guide
    └── DEPLOYMENT_OPTIONS.md    # Options comparison
```

---

## 🔐 Role-Based Access Control (RBAC)

This extension now supports role-based access control to manage credential visibility per user.

### How RBAC Works

**Two Roles:**
- **Admin** - Full access to ALL credentials in the sheet
- **Staff** - Limited access based on assignment

**Staff Access Rules:**
1. **VA Name Matching**: Staff can access credentials where the "VA Name" column (Column D in Credentials sheet) matches their Full Name
2. **Permissions Override**: Staff can also access credentials listed in the Permissions sheet where their User ID is included
3. **Combined Access**: Staff gets credentials from BOTH rules above

**Example:**

If John Doe (Staff) logs in:
- ✅ Can access credentials with VA Name = "John Doe"
- ✅ Can access credentials where his user ID "john" is in Permissions sheet
- ❌ Cannot access other credentials

If Admin User (Admin) logs in:
- ✅ Can access ALL credentials (no filtering)

### Setting Up RBAC

1. **Add Role column to Users sheet** (Column E):
   - Set to "Admin" or "Staff"
   - Defaults to "Staff" if blank

2. **Add VA Name to Credentials** (Column D):
   - Enter the full name of the staff member who should access this credential
   - Leave blank for credentials that should be Admin-only or managed via Permissions

3. **Optional: Create Permissions sheet** for fine-grained control:
   - Column A: Credential ID (row number from Credentials, e.g., 2, 3, 4)
   - Column B: Comma-separated User IDs (e.g., "john,sarah,mike")

### RBAC Best Practices

✅ **Do:**
- Assign Admin role only to trusted administrators
- Use VA Name for default staff assignments (easier to manage)
- Use Permissions sheet for special cases (shared credentials, temporary access)
- Regularly audit credential assignments

❌ **Don't:**
- Give everyone Admin access
- Leave sensitive credentials without VA Name or Permissions (they'll be Admin-only)
- Share credentials between too many users (use separate accounts if possible)

---

## 🔒 Security Features

### Built-in Security

- **AES-256-GCM Encryption** - Passwords encrypted in memory
- **Session Management** - 30-minute auto-logout
- **No Persistent Storage** - Passwords never saved unencrypted locally
- **Content Security Policy** - Prevents unauthorized connections
- **Input Sanitization** - XSS protection
- **Service Account Auth** - Least-privilege backend access
- **Role-Based Access Control** - Granular credential access management

### Best Practices

**For Administrators:**
- ✅ Keep Google Sheet private (share only with service account)
- ✅ Use strong passwords in Users sheet
- ✅ Regularly audit credentials
- ✅ Remove old/unused credentials
- ✅ Monitor Vercel logs

**For Staff:**
- ✅ Logout when finished
- ✅ Don't share login credentials
- ✅ Use on trusted devices only
- ❌ Don't install from unknown sources

**Full security policy:** [SECURITY.md](SECURITY.md)

---

## 🐛 Troubleshooting

### Extension Won't Load
- Check for errors in `chrome://extensions/`
- Verify all files are present
- Check `manifest.json` is valid

### Login Fails
- Verify credentials exist in Google Sheet Users tab
- Check sheet is shared with service account
- Check Vercel backend is running: `https://your-project.vercel.app/api/health`
- View Vercel logs: `vercel logs`

### Credentials Don't Load
- Click refresh button (↻)
- Check "Credentials" tab exists in sheet
- Verify sheet has correct structure (columns A, B, C)
- Check browser console (F12) for errors

### "Permission Denied" Error
- Verify Google Sheet shared with service account email
- Check service account has "Viewer" permission
- Ensure `SERVICE_ACCOUNT_CREDENTIALS` set in Vercel

### Autofill Doesn't Work
- Ensure you're on a page with login form
- Check password field is visible
- Try clicking "Fill Password" button manually
- Check browser console (F12) for errors

### Backend 500 Error
- Check Vercel logs: `vercel logs`
- Verify `SERVICE_ACCOUNT_CREDENTIALS` environment variable
- Verify `SPREADSHEET_ID` environment variable
- Ensure service account JSON is complete

---

## 📖 Documentation

- [SECURITY.md](SECURITY.md) - Security policy and best practices
- [VERCEL_SETUP_GUIDE.md](VERCEL_SETUP_GUIDE.md) - Complete Vercel deployment guide
- [DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md) - Backend vs Direct API comparison
- [BEFORE_COMMIT.md](BEFORE_COMMIT.md) - Security checklist for developers
- [backend-server/README.md](backend-server/README.md) - Backend API documentation

---

## 🔄 Updating

### Updating Credentials

When you add/edit credentials in Google Sheet:
1. Changes are available immediately
2. Click refresh button (↻) in extension to reload
3. No code changes needed

### Updating Backend

If you modify `backend-server/` code:
```bash
cd backend-server
vercel --prod
```

### Updating Extension

If you modify extension code:
1. Make changes to files
2. Go to `chrome://extensions/`
3. Click refresh icon on the extension

---

## ⚠️ Important Notes

### This Extension Is:

✅ **Perfect for:**
- Internal team credentials
- Development/staging environments
- Shared service accounts
- Non-critical passwords

❌ **NOT recommended for:**
- Personal banking passwords
- Production database credentials
- Highly regulated industries (without proper assessment)
- Customer PII or payment data

### For Enterprise Password Management:

Consider dedicated solutions:
- HashiCorp Vault
- AWS Secrets Manager
- 1Password Teams
- LastPass Enterprise

---

## 🤝 Contributing

Contributions welcome! Before contributing:

1. Read [SECURITY.md](SECURITY.md)
2. Read [BEFORE_COMMIT.md](BEFORE_COMMIT.md)
3. Never commit `config.js` or service account JSON
4. Test changes thoroughly
5. Update documentation

---

## 📞 Support

- **Documentation:** See files in root directory
- **Issues:** Check troubleshooting section above
- **Security Issues:** See [SECURITY.md](SECURITY.md)

---

## ⚖️ License

[Add your chosen license here - MIT, Apache 2.0, GPL, etc.]

---

## 🙏 Acknowledgments

Built with:
- Chrome Extensions Manifest V3
- Google Sheets API v4
- Vercel Serverless Functions
- Web Crypto API (AES-256-GCM)

---

## 📊 FAQ

**Q: Do staff members need access to Google Sheet?**
A: No! Only the service account needs access. Staff only use the extension.

**Q: Can staff see passwords?**
A: No. Passwords are encrypted and only decrypted when filling forms.

**Q: What happens if I lose my Vercel deployment?**
A: Redeploy using the same service account and spreadsheet ID. No data loss.

**Q: How do I add a new staff member?**
A: Add their credentials to the Users tab in Google Sheet with appropriate Role (Admin/Staff).

**Q: How do I revoke access?**
A: Remove their row from the Users tab. They can't login anymore.

**Q: How do I assign credentials to a staff member?**
A: Either add their Full Name to the "VA Name" column in Credentials sheet, or add their User ID to the Permissions sheet for specific credentials.

**Q: What's the difference between VA Name and Permissions sheet?**
A: VA Name is simpler for default assignments (one staff per credential). Permissions sheet allows multiple users to access the same credential and is better for shared access.

**Q: Is the Google Sheet required to be public?**
A: With Vercel backend: NO (private). With direct API: YES (public).

**Q: Can I use this commercially?**
A: Depends on your license. Add appropriate license file.

**Q: What's the difference between the two setup options?**
A: See [DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md) for detailed comparison.

---

**Made with ❤️ for secure team password management**
