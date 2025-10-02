/**
 * Content Script - Injected into web pages
 * Handles autofill detection and credential injection
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.securePasswordManagerInjected) {
    return;
  }
  window.securePasswordManagerInjected = true;

  let currentCredentials = [];
  let autofillOverlay = null;

  /**
   * Initialize content script
   */
  function init() {
    // Only listen for messages from popup, no automatic detection
    chrome.runtime.onMessage.addListener(handleMessage);
  }

  /**
   * Check if page has login form fields
   */
  function hasLoginForm() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    const usernameFields = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[id*="user"], input[id*="login"]'
    );
    return passwordFields.length > 0 && usernameFields.length > 0;
  }

  /**
   * Check for available credentials for current URL
   */
  async function checkForCredentials() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchCredentials',
        url: window.location.href
      });

      if (response.success && response.credentials.length > 0) {
        currentCredentials = response.credentials;
        showAutofillPrompt();
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
    }
  }

  /**
   * Show autofill prompt overlay
   */
  function showAutofillPrompt() {
    // Don't show if overlay already exists
    if (autofillOverlay) {
      return;
    }

    // Create overlay
    autofillOverlay = document.createElement('div');
    autofillOverlay.id = 'secure-password-manager-overlay';
    autofillOverlay.innerHTML = `
      <div class="spm-overlay-content">
        <div class="spm-header">
          <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="Logo" class="spm-logo">
          <h3>Autofill Login</h3>
          <button class="spm-close" id="spm-close-btn">&times;</button>
        </div>
        <div class="spm-body">
          <p class="spm-message">Select an account to autofill:</p>
          <div class="spm-credential-list" id="spm-credential-list"></div>
        </div>
      </div>
    `;

    // Apply styles
    applyOverlayStyles(autofillOverlay);

    // Add credential buttons
    const credentialList = autofillOverlay.querySelector('#spm-credential-list');
    currentCredentials.forEach((cred, index) => {
      const credButton = document.createElement('button');
      credButton.className = 'spm-credential-btn';
      credButton.innerHTML = `
        <div class="spm-cred-icon">${cred.username.charAt(0).toUpperCase()}</div>
        <div class="spm-cred-info">
          <div class="spm-cred-username">${escapeHtml(cred.username)}</div>
          <div class="spm-cred-url">${escapeHtml(cred.websiteUrl)}</div>
        </div>
      `;
      credButton.addEventListener('click', () => autofillCredential(cred.id));
      credentialList.appendChild(credButton);
    });

    // Close button
    autofillOverlay.querySelector('#spm-close-btn').addEventListener('click', closeOverlay);

    // Close on overlay background click
    autofillOverlay.addEventListener('click', (e) => {
      if (e.target === autofillOverlay) {
        closeOverlay();
      }
    });

    document.body.appendChild(autofillOverlay);
  }

  /**
   * Autofill credential into form
   */
  async function autofillCredential(credentialId) {
    try {
      // Get decrypted credential from background
      const response = await chrome.runtime.sendMessage({
        action: 'getCredentialForAutofill',
        credentialId: credentialId
      });

      if (!response.success) {
        alert('Failed to retrieve credential: ' + response.error);
        return;
      }

      const { username, password } = response.credential;

      // Find form fields
      const passwordField = findPasswordField();
      const usernameField = findUsernameField(passwordField);

      if (!passwordField || !usernameField) {
        alert('Could not find login form fields');
        return;
      }

      // Fill fields
      fillField(usernameField, username);
      fillField(passwordField, password);

      // Close overlay
      closeOverlay();

      // Clear credential from memory
      response.credential.username = '';
      response.credential.password = '';

    } catch (error) {
      console.error('Error autofilling credential:', error);
      alert('Failed to autofill credential');
    }
  }

  /**
   * Find password field on page
   */
  function findPasswordField() {
    const passwordFields = document.querySelectorAll('input[type="password"]:not([style*="display: none"]):not([disabled])');
    return passwordFields[0] || null;
  }

  /**
   * Find username field near password field
   */
  function findUsernameField(passwordField) {
    if (!passwordField) return null;

    // Try to find form containing password field
    const form = passwordField.closest('form');

    // Look for username-like fields
    const selectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[name*="user"]',
      'input[name*="login"]',
      'input[name*="email"]',
      'input[id*="user"]',
      'input[id*="login"]',
      'input[id*="email"]'
    ];

    for (const selector of selectors) {
      const fields = form ? form.querySelectorAll(selector) : document.querySelectorAll(selector);
      for (const field of fields) {
        if (!field.disabled && field.offsetParent !== null) {
          return field;
        }
      }
    }

    return null;
  }

  /**
   * Fill form field with value
   */
  function fillField(field, value) {
    // Set value
    field.value = value;

    // Trigger events to ensure site detects the change
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('keyup', { bubbles: true }));
  }

  /**
   * Close autofill overlay
   */
  function closeOverlay() {
    if (autofillOverlay) {
      autofillOverlay.remove();
      autofillOverlay = null;
    }
  }

  /**
   * Apply CSS styles to overlay
   */
  function applyOverlayStyles(overlay) {
    const style = document.createElement('style');
    style.textContent = `
      #secure-password-manager-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      }
      .spm-overlay-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 450px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        animation: spmSlideIn 0.3s ease-out;
      }
      @keyframes spmSlideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .spm-header {
        display: flex;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e1e4e8;
        gap: 12px;
      }
      .spm-logo {
        width: 32px;
        height: 32px;
      }
      .spm-header h3 {
        flex: 1;
        margin: 0;
        font-size: 18px;
        color: #333;
      }
      .spm-close {
        background: none;
        border: none;
        font-size: 28px;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      .spm-close:hover {
        background: #f6f8fa;
        color: #333;
      }
      .spm-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }
      .spm-message {
        margin: 0 0 16px 0;
        color: #666;
        font-size: 14px;
      }
      .spm-credential-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .spm-credential-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #f6f8fa;
        border: 2px solid #e1e4e8;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
        text-align: left;
      }
      .spm-credential-btn:hover {
        background: #e1e4e8;
        border-color: #667eea;
      }
      .spm-cred-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 18px;
      }
      .spm-cred-info {
        flex: 1;
      }
      .spm-cred-username {
        font-weight: 600;
        color: #333;
        font-size: 14px;
        margin-bottom: 4px;
      }
      .spm-cred-url {
        font-size: 12px;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Observe DOM for dynamically added forms
   */
  function observeFormAdditions() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          if (hasLoginForm() && currentCredentials.length === 0) {
            checkForCredentials();
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Handle messages from extension
   */
  function handleMessage(request, sender, sendResponse) {
    if (request.action === 'triggerAutofill') {
      if (currentCredentials.length > 0) {
        showAutofillPrompt();
      } else {
        checkForCredentials();
      }
      sendResponse({ success: true });
    } else if (request.action === 'fillCredentials') {
      // Fill credentials directly from popup
      fillCredentialsDirectly(request.username, request.password);
      sendResponse({ success: true });
    }
    return true;
  }

  /**
   * Fill credentials directly into form fields
   */
  function fillCredentialsDirectly(username, password) {
    console.log('Filling credentials:', username);

    // Find all password fields (visible ones)
    const passwordFields = Array.from(document.querySelectorAll('input[type="password"]'))
      .filter(field => field.offsetParent !== null); // Only visible fields

    if (passwordFields.length === 0) {
      console.error('No password field found on page');
      return;
    }

    // Use the first visible password field
    const passwordField = passwordFields[0];
    const form = passwordField.closest('form') || document;

    // Find username/email field - try multiple strategies
    let usernameField = null;

    // Strategy 1: Look for email type
    usernameField = form.querySelector('input[type="email"]:not([type="password"])');

    // Strategy 2: Look for common name/id attributes
    if (!usernameField) {
      const selectors = [
        'input[name*="email"]',
        'input[name*="user"]',
        'input[name*="login"]',
        'input[id*="email"]',
        'input[id*="user"]',
        'input[id*="login"]',
        'input[type="text"]',
        'input[autocomplete="username"]',
        'input[autocomplete="email"]'
      ];

      for (const selector of selectors) {
        const fields = Array.from(form.querySelectorAll(selector))
          .filter(field => field.type !== 'password' && field.offsetParent !== null);
        if (fields.length > 0) {
          usernameField = fields[0];
          break;
        }
      }
    }

    // Strategy 3: Find the first text input before password field
    if (!usernameField) {
      const allInputs = Array.from(form.querySelectorAll('input'));
      const passwordIndex = allInputs.indexOf(passwordField);
      for (let i = passwordIndex - 1; i >= 0; i--) {
        const field = allInputs[i];
        if ((field.type === 'text' || field.type === 'email') && field.offsetParent !== null) {
          usernameField = field;
          break;
        }
      }
    }

    // Fill the fields
    let filled = [];

    if (usernameField) {
      usernameField.value = username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
      usernameField.dispatchEvent(new Event('blur', { bubbles: true }));

      // Visual feedback
      usernameField.style.transition = 'background-color 0.3s';
      usernameField.style.backgroundColor = '#e8f5e9';
      setTimeout(() => {
        usernameField.style.backgroundColor = '';
      }, 1000);

      filled.push('username');
      console.log('Username filled:', username);
    } else {
      console.warn('No username field found');
    }

    // Fill password
    passwordField.value = password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    passwordField.dispatchEvent(new Event('blur', { bubbles: true }));

    // Visual feedback
    passwordField.style.transition = 'background-color 0.3s';
    passwordField.style.backgroundColor = '#e8f5e9';
    setTimeout(() => {
      passwordField.style.backgroundColor = '';
    }, 1000);

    filled.push('password');
    console.log('Password filled');

    console.log('Credentials filled successfully:', filled.join(', '));
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
