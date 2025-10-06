/**
 * Simplified popup - Login then show all credentials with search
 */

document.addEventListener('DOMContentLoaded', async () => {
  const notAuthView = document.getElementById('notAuthView');
  const authView = document.getElementById('authView');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const userName = document.getElementById('userName');
  const searchInput = document.getElementById('searchInput');
  const credentialsContainer = document.getElementById('credentialsContainer');

  let allCredentials = [];
  let isLoggingIn = false;

  /**
   * Initialize - Check if user is logged in
   */
  async function init() {
    const isAuth = await StorageUtils.isAuthenticated();

    if (!isAuth) {
      showLoginView();
    } else {
      await showCredentialsView();
    }
  }

  /**
   * Show login view with inline form
   */
  function showLoginView() {
    notAuthView.innerHTML = `
      <div class="popup-header">
        <img src="../icons/icon48.png" alt="Logo" class="logo">
        <h2>Login Required</h2>
      </div>
      <div class="popup-body" style="padding: 20px;">
        <form id="inlineLoginForm">
          <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600;">User ID</label>
            <input
              type="text"
              id="loginUserId"
              style="width: 100%; padding: 10px; border: 2px solid #e1e4e8; border-radius: 6px; font-size: 14px;"
              placeholder="Enter your user ID"
              autocomplete="username"
              required
            >
          </div>
          <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600;">Password</label>
            <input
              type="password"
              id="loginPassword"
              style="width: 100%; padding: 10px; border: 2px solid #e1e4e8; border-radius: 6px; font-size: 14px;"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
            >
          </div>
          <div id="loginError" style="display: none; padding: 10px; background: #fee; color: #c33; border-radius: 6px; margin-bottom: 16px; font-size: 13px;"></div>
          <button type="submit" class="btn btn-primary" id="loginSubmitBtn" style="width: 100%;">
            <span id="loginBtnText">Login</span>
            <span id="loginBtnSpinner" class="spinner" style="display: none; width: 16px; height: 16px; border-width: 2px;"></span>
          </button>
        </form>
      </div>
    `;

    notAuthView.style.display = 'block';
    authView.style.display = 'none';

    // Setup login form handler
    const loginForm = document.getElementById('inlineLoginForm');
    loginForm.addEventListener('submit', handleLogin);

    // Focus on user ID field
    setTimeout(() => document.getElementById('loginUserId').focus(), 100);
  }

  /**
   * Handle login submission
   */
  async function handleLogin(e) {
    e.preventDefault();

    if (isLoggingIn) return;
    isLoggingIn = true;

    const userId = document.getElementById('loginUserId').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginError = document.getElementById('loginError');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnSpinner = document.getElementById('loginBtnSpinner');

    // Show loading
    loginSubmitBtn.disabled = true;
    loginBtnText.style.display = 'none';
    loginBtnSpinner.style.display = 'inline-block';
    loginError.style.display = 'none';

    try {
      console.log('Login attempt:', userId);

      // Validate user via backend or Google Sheets
      const response = await chrome.runtime.sendMessage({
        action: 'validateUser',
        userId: userId,
        password: password
      });

      if (response.success && response.user) {
        // User validated
        const sessionToken = CryptoUtils.generateSessionToken();
        await StorageUtils.saveSession({
          userId: response.user.userId,
          fullName: response.user.fullName,
          email: response.user.email,
          role: response.user.role || 'Staff', // Store user role
          sessionToken: sessionToken,
          loginTime: Date.now()
        });

        console.log('User logged in:', userId, '- Role:', response.user.role);
        await showCredentialsView();
      } else {
        throw new Error('Invalid user ID or password');
      }

    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = error.message || 'Login failed';
      loginError.style.display = 'block';
      loginSubmitBtn.disabled = false;
      loginBtnText.style.display = 'inline';
      loginBtnSpinner.style.display = 'none';
      isLoggingIn = false;
    }
  }

  /**
   * Show credentials view
   */
  async function showCredentialsView() {
    notAuthView.style.display = 'none';
    authView.style.display = 'block';

    // Show user info
    const session = await StorageUtils.getSession();
    if (session) {
      userName.textContent = session.fullName || session.userId;

      // Display role with badge styling
      const userRoleElement = document.getElementById('userRole');
      if (userRoleElement && session.role) {
        const role = session.role;
        const roleColor = role.toLowerCase() === 'admin' ? '#28a745' : '#6c757d';
        userRoleElement.innerHTML = `<span style="background: ${roleColor}; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 600;">${role}</span>`;
      }
    }

    // Load credentials
    await loadAllCredentials();

    // Setup search
    searchInput.addEventListener('input', filterCredentials);
  }

  /**
   * Load all credentials from backend
   */
  async function loadAllCredentials() {
    credentialsContainer.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading credentials...</p>
      </div>
    `;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchAllCredentials'
      });

      if (response.success) {
        allCredentials = response.credentials || [];
        displayCredentials(allCredentials);
      } else {
        throw new Error(response.error || 'Failed to load credentials');
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      credentialsContainer.innerHTML = `
        <div class="no-results">
          <p>Failed to load credentials</p>
          <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Display credentials list
   */
  function displayCredentials(credentials) {
    if (credentials.length === 0) {
      credentialsContainer.innerHTML = `
        <div class="no-results">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3; margin-bottom: 12px;">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <p>No credentials found</p>
        </div>
      `;
      return;
    }

    credentialsContainer.innerHTML = credentials.map(cred => `
      <div class="credential-card">
        <div class="credential-icon">${getInitial(cred.websiteUrl || cred.username)}</div>
        <div class="credential-details">
          <div class="credential-website">${escapeHtml(cred.websiteUrl)}</div>
          <div class="credential-username">${escapeHtml(cred.username)}</div>
        </div>
        <button class="fill-btn" data-id="${cred.id}">Fill Password</button>
      </div>
    `).join('');

    // Add click handlers to Fill Password buttons
    document.querySelectorAll('.fill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const credId = parseInt(btn.dataset.id);
        fillPassword(credId);
      });
    });
  }

  /**
   * Filter credentials based on search
   */
  function filterCredentials() {
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
      displayCredentials(allCredentials);
      return;
    }

    const filtered = allCredentials.filter(cred => {
      const website = (cred.websiteUrl || '').toLowerCase();
      const username = (cred.username || '').toLowerCase();
      return website.includes(query) || username.includes(query);
    });

    displayCredentials(filtered);
  }

  /**
   * Fill password on active tab
   */
  async function fillPassword(credId) {
    console.log('Fill password for credential:', credId);

    try {
      // Get full credential with password
      const response = await chrome.runtime.sendMessage({
        action: 'getCredentialForAutofill',
        credentialId: credId
      });

      if (response.success) {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab) {
          try {
            // Try to send to content script
            await chrome.tabs.sendMessage(tab.id, {
              action: 'fillCredentials',
              username: response.credential.username,
              password: response.credential.password
            });

            showToast('✓ Password filled');
            setTimeout(() => window.close(), 800);
          } catch (contentScriptError) {
            // Content script not loaded - inject it first
            console.log('Content script not found, injecting...');

            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content/content-script.js']
              });

              // Wait a bit for script to load
              await new Promise(resolve => setTimeout(resolve, 100));

              // Try again
              await chrome.tabs.sendMessage(tab.id, {
                action: 'fillCredentials',
                username: response.credential.username,
                password: response.credential.password
              });

              showToast('✓ Password filled');
              setTimeout(() => window.close(), 800);
            } catch (injectError) {
              console.error('Failed to inject content script:', injectError);
              showToast('✗ Cannot fill on this page');
            }
          }
        } else {
          showToast('✗ No active tab found');
        }
      } else {
        showToast('✗ Failed to get credentials');
      }
    } catch (error) {
      console.error('Error filling password:', error);
      showToast('✗ Error: ' + error.message);
    }
  }

  /**
   * Show toast notification
   */
  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      right: 16px;
      background: #333;
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      text-align: center;
      z-index: 10000;
      animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  /**
   * Get initial letter for icon
   */
  function getInitial(text) {
    if (!text) return '?';
    // Extract domain from URL or use first letter
    const match = text.match(/(?:https?:\/\/)?(?:www\.)?([^\/\.]+)/);
    return match ? match[1].charAt(0).toUpperCase() : text.charAt(0).toUpperCase();
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /**
   * Refresh credentials
   */
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.5';

    try {
      await chrome.runtime.sendMessage({ action: 'refreshCredentials' });
      await loadAllCredentials();
      showToast('✓ Credentials refreshed');
    } catch (error) {
      showToast('✗ Failed to refresh');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.style.opacity = '1';
    }
  });

  /**
   * Logout
   */
  logoutBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'logout' });
    showLoginView();
  });

  // Initialize
  init();
});
