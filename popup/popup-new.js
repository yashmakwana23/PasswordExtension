/**
 * Enhanced Popup - Modern password manager interface
 */

document.addEventListener('DOMContentLoaded', async () => {
  const notAuthView = document.getElementById('notAuthView');
  const authView = document.getElementById('authView');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const userName = document.getElementById('userName');
  const searchInput = document.getElementById('searchInput');
  const credentialsContainer = document.getElementById('credentialsContainer');
  const inlineLoginForm = document.getElementById('inlineLoginForm');

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
   * Show login view with enhanced form
   */
  function showLoginView() {
    notAuthView.style.display = 'block';
    authView.style.display = 'none';

    // Reset login flag
    isLoggingIn = false;

    // Focus on user ID field
    setTimeout(() => {
      const userIdField = document.getElementById('loginUserId');
      if (userIdField) userIdField.focus();
    }, 100);
  }

  /**
   * Handle login submission with enhanced UX
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
          role: response.user.role || 'User',
          sessionToken: sessionToken,
          loginTime: Date.now()
        });

        console.log('User logged in:', userId, '- Role:', response.user.role);
        await showCredentialsView();
      } else {
        throw new Error('Invalid credentials. Please try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = error.message || 'Login failed. Please check your credentials.';
      loginError.style.display = 'block';
      
      // Shake animation for error
      loginSubmitBtn.style.animation = 'shake 0.5s';
      setTimeout(() => {
        loginSubmitBtn.style.animation = '';
      }, 500);
      
      loginSubmitBtn.disabled = false;
      loginBtnText.style.display = 'inline';
      loginBtnSpinner.style.display = 'none';
      isLoggingIn = false;
    }
  }

  /**
   * Show credentials view with enhanced UI
   */
  async function showCredentialsView() {
    notAuthView.style.display = 'none';
    authView.style.display = 'block';

    // Show user info with enhanced display
    const session = await StorageUtils.getSession();
    if (session) {
      userName.textContent = session.fullName || session.userId;

      // Display role with enhanced badge styling
      const userRoleElement = document.getElementById('userRole');
      if (userRoleElement && session.role) {
        const role = session.role;
        const roleColor = role.toLowerCase() === 'admin' ? '#10b981' : '#8b5cf6';
        userRoleElement.innerHTML = `<span style="background: ${roleColor}; color: white; padding: 2px 10px; border-radius: 20px; font-weight: 600; font-size: 11px; letter-spacing: 0.5px;">${role.toUpperCase()}</span>`;
      }
    }

    // Load credentials
    await loadAllCredentials();

    // Setup search with enhanced functionality
    searchInput.addEventListener('input', debounce(filterCredentials, 300));
    
    // Focus on search input
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  }

  /**
   * Load all credentials from backend with enhanced loading
   */
  async function loadAllCredentials() {
    credentialsContainer.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Decrypting and loading your credentials...</p>
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3; margin-bottom: 12px;">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <p>Failed to load credentials</p>
          <p style="font-size: 12px; margin-top: 8px; color: #94a3b8;">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Display credentials list with enhanced UI
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
          <p style="font-size: 13px; margin-top: 8px; color: #94a3b8;">Add new credentials to get started</p>
        </div>
      `;
      return;
    }

    credentialsContainer.innerHTML = credentials.map(cred => {
      // Extract domain for icon
      const domainMatch = cred.websiteUrl?.match(/(?:https?:\/\/)?(?:www\.)?([^\/\.]+)/);
      const domainInitial = domainMatch ? domainMatch[1].charAt(0).toUpperCase() : (cred.username?.charAt(0).toUpperCase() || '?');
      
      return `
        <div class="credential-card" data-id="${cred.id}">
          <div class="credential-icon">${domainInitial}</div>
          <div class="credential-details">
            <div class="credential-website">${escapeHtml(cred.websiteUrl || 'Unknown Website')}</div>
            <div class="credential-username">${escapeHtml(cred.username || 'No username')}</div>
          </div>
          <button class="fill-btn" data-id="${cred.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Fill
          </button>
        </div>
      `;
    }).join('');

    // Add click handlers to credential cards and Fill buttons
    document.querySelectorAll('.credential-card, .fill-btn').forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const credId = parseInt(element.dataset.id);
        fillPassword(credId);
      });
    });
  }

  /**
   * Filter credentials based on search with enhanced matching
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
      const domainMatch = website.match(/(?:https?:\/\/)?(?:www\.)?([^\/\.]+)/);
      const domain = domainMatch ? domainMatch[1] : '';
      
      return website.includes(query) || 
             username.includes(query) || 
             domain.includes(query);
    });

    displayCredentials(filtered);
  }

  /**
   * Fill password on active tab with enhanced UX
   */
  async function fillPassword(credId) {
    console.log('Fill password for credential:', credId);

    try {
      // Show loading state on button
      const fillBtn = document.querySelector(`.fill-btn[data-id="${credId}"]`);
      const originalHTML = fillBtn ? fillBtn.innerHTML : '';
      if (fillBtn) {
        fillBtn.innerHTML = '<span class="spinner-inline" style="width: 14px; height: 14px; border-width: 2px;"></span>';
        fillBtn.disabled = true;
      }

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

            showToast('✓ Password filled successfully', 'success');
            setTimeout(() => window.close(), 1000);
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

              showToast('✓ Password filled successfully', 'success');
              setTimeout(() => window.close(), 1000);
            } catch (injectError) {
              console.error('Failed to inject content script:', injectError);
              showToast('✗ Cannot fill on this page', 'error');
            }
          }
        } else {
          showToast('✗ No active tab found', 'error');
        }
      } else {
        showToast('✗ Failed to get credentials', 'error');
      }
    } catch (error) {
      console.error('Error filling password:', error);
      showToast('✗ Error: ' + error.message, 'error');
    } finally {
      // Restore button state
      const fillBtn = document.querySelector(`.fill-btn[data-id="${credId}"]`);
      if (fillBtn) {
        fillBtn.innerHTML = originalHTML;
        fillBtn.disabled = false;
      }
    }
  }

  /**
   * Show enhanced toast notification
   */
  function showToast(message, type = 'info') {
    // Remove any existing toast
    const existingToast = document.getElementById('toastNotification');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#333'};
      color: white;
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s ease-out;
      min-width: 250px;
      max-width: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    `;
    toast.innerHTML = `
      ${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ️'} 
      ${message}
    `;
    document.body.appendChild(toast);

    // Add animation styles if not present
    if (!document.querySelector('#toastStyles')) {
      const style = document.createElement('style');
      style.id = 'toastStyles';
      style.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
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
   * Debounce function for search
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Refresh credentials with enhanced UX
   */
  refreshBtn.addEventListener('click', async () => {
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<span class="spinner-inline" style="width: 16px; height: 16px; border-width: 2px;"></span>';
    refreshBtn.disabled = true;

    try {
      await chrome.runtime.sendMessage({ action: 'refreshCredentials' });
      await loadAllCredentials();
      showToast('✓ Credentials refreshed successfully', 'success');
    } catch (error) {
      showToast('✗ Failed to refresh credentials', 'error');
    } finally {
      setTimeout(() => {
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
      }, 1000);
    }
  });

  /**
   * Logout with enhanced UX
   */
  logoutBtn.addEventListener('click', async () => {
    try {
      const originalHTML = logoutBtn.innerHTML;
      logoutBtn.innerHTML = '<span class="spinner-inline" style="width: 16px; height: 16px; border-width: 2px;"></span>';
      
      await chrome.runtime.sendMessage({ action: 'logout' });
      isLoggingIn = false; // Reset login flag
      
      setTimeout(() => {
        showLoginView();
        showToast('✓ Logged out successfully', 'success');
      }, 800);
    } catch (error) {
      showToast('✗ Logout failed', 'error');
    }
  });

  // Handle login form submission
  if (inlineLoginForm) {
    inlineLoginForm.addEventListener('submit', handleLogin);
  }

  // Initialize
  init();
});