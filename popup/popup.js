/**
 * Popup script - Main extension popup interface
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const notAuthView = document.getElementById('notAuthView');
  const authView = document.getElementById('authView');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const tabTitle = document.getElementById('tabTitle');
  const tabUrl = document.getElementById('tabUrl');
  const credentialsList = document.getElementById('credentialsList');
  const noCredentials = document.getElementById('noCredentials');
  const refreshBtn = document.getElementById('refreshBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const manualFillBtn = document.getElementById('manualFillBtn');
  const statusMessage = document.getElementById('statusMessage');

  let currentTab = null;
  let availableCredentials = [];

  /**
   * Initialize popup
   */
  async function init() {
    // Check authentication
    const isAuth = await StorageUtils.isAuthenticated();

    if (!isAuth) {
      showNotAuthView();
    } else {
      await showAuthView();
    }
  }

  /**
   * Show not authenticated view
   */
  function showNotAuthView() {
    notAuthView.style.display = 'block';
    authView.style.display = 'none';
  }

  /**
   * Show authenticated view
   */
  async function showAuthView() {
    notAuthView.style.display = 'none';
    authView.style.display = 'block';

    // Load user info
    const session = await StorageUtils.getSession();
    if (session) {
      userName.textContent = session.fullName || session.userId;
      userEmail.textContent = session.email || '';
    }

    // Load current tab info
    await loadCurrentTab();

    // Load credentials for current tab
    await loadCredentials();
  }

  /**
   * Load current tab information
   */
  async function loadCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        currentTab = tabs[0];
        tabTitle.textContent = currentTab.title || 'Unknown Page';
        tabUrl.textContent = new URL(currentTab.url).hostname;
      }
    } catch (error) {
      console.error('Error loading current tab:', error);
    }
  }

  /**
   * Load credentials for current tab
   */
  async function loadCredentials() {
    try {
      credentialsList.innerHTML = '<div class="loading">Loading credentials...</div>';
      noCredentials.style.display = 'none';

      if (!currentTab || !currentTab.url) {
        credentialsList.innerHTML = '';
        noCredentials.style.display = 'block';
        return;
      }

      // Fetch credentials from background
      const response = await chrome.runtime.sendMessage({
        action: 'fetchCredentials',
        url: currentTab.url
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      availableCredentials = response.credentials || [];

      // Display credentials
      if (availableCredentials.length === 0) {
        credentialsList.innerHTML = '';
        noCredentials.style.display = 'block';
        manualFillBtn.style.display = 'none';
      } else {
        displayCredentials(availableCredentials);
        noCredentials.style.display = 'none';
        manualFillBtn.style.display = 'block';
      }

    } catch (error) {
      console.error('Error loading credentials:', error);

      // If Google Sheets not configured, show friendly message instead of error
      if (error.message.includes('not configured') || error.message.includes('Extension not configured')) {
        credentialsList.innerHTML = '<div class="loading">Google Sheets not configured yet. Configure in Options to use autofill.</div>';
        noCredentials.style.display = 'none';
      } else {
        showStatus('Failed to load credentials: ' + error.message, true);
        credentialsList.innerHTML = '';
        noCredentials.style.display = 'block';
      }
    }
  }

  /**
   * Display credentials list
   */
  function displayCredentials(credentials) {
    credentialsList.innerHTML = '';

    credentials.forEach(cred => {
      const item = document.createElement('div');
      item.className = 'credential-item';
      item.innerHTML = `
        <div class="credential-icon">${cred.username.charAt(0).toUpperCase()}</div>
        <div class="credential-info">
          <div class="credential-username">${escapeHtml(cred.username)}</div>
          <div class="credential-url">${escapeHtml(cred.websiteUrl)}</div>
        </div>
      `;
      item.addEventListener('click', () => autofillCredential(cred.id));
      credentialsList.appendChild(item);
    });
  }

  /**
   * Autofill credential
   */
  async function autofillCredential(credentialId) {
    try {
      // Get decrypted credential
      const response = await chrome.runtime.sendMessage({
        action: 'getCredentialForAutofill',
        credentialId: credentialId
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Inject credential into current tab
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'fillCredential',
        credential: response.credential
      });

      showStatus('Credential autofilled successfully');

      // Close popup after brief delay
      setTimeout(() => window.close(), 1000);

    } catch (error) {
      console.error('Error autofilling credential:', error);
      showStatus('Failed to autofill: ' + error.message, true);
    }
  }

  /**
   * Refresh credentials cache
   */
  async function refreshCredentials() {
    try {
      refreshBtn.disabled = true;
      showStatus('Refreshing credentials...');

      const response = await chrome.runtime.sendMessage({
        action: 'refreshCredentials'
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      showStatus(`Refreshed ${response.count} credentials`);

      // Reload credentials
      await loadCredentials();

    } catch (error) {
      console.error('Error refreshing credentials:', error);
      showStatus('Failed to refresh: ' + error.message, true);
    } finally {
      refreshBtn.disabled = false;
    }
  }

  /**
   * Trigger manual autofill
   */
  async function triggerManualFill() {
    try {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'triggerAutofill'
      });
      window.close();
    } catch (error) {
      console.error('Error triggering autofill:', error);
      showStatus('Failed to trigger autofill', true);
    }
  }

  /**
   * Show status message
   */
  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message' + (isError ? ' error' : '');
    statusMessage.style.display = 'block';

    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle logout
   */
  async function handleLogout() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'logout' });

      if (response.success) {
        showNotAuthView();
      }
    } catch (error) {
      console.error('Error logging out:', error);
      showStatus('Logout failed', true);
    }
  }

  /**
   * Open login page
   */
  function openLogin() {
    chrome.tabs.create({ url: chrome.runtime.getURL('auth/login.html') });
    window.close();
  }

  /**
   * Open options page
   */
  function openOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  // Event listeners
  loginBtn.addEventListener('click', openLogin);
  logoutBtn.addEventListener('click', handleLogout);
  refreshBtn.addEventListener('click', refreshCredentials);
  optionsBtn.addEventListener('click', openOptions);
  manualFillBtn.addEventListener('click', triggerManualFill);

  // Initialize
  init();
});
