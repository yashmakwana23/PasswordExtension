/**
 * Cryptographic utilities for secure password handling
 * Uses Web Crypto API for encryption/decryption
 */

class CryptoUtils {
  /**
   * Generate a cryptographic key from session token
   * @param {string} sessionToken - User session token
   * @returns {Promise<CryptoKey>} - Encryption key
   */
  static async generateKey(sessionToken) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionToken),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('secure-password-manager-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-GCM
   * @param {string} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @returns {Promise<Object>} - Encrypted data with IV
   */
  static async encrypt(data, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoder.encode(data)
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData))
    };
  }

  /**
   * Decrypt data using AES-GCM
   * @param {Object} encryptedObj - Object with iv and data arrays
   * @param {CryptoKey} key - Decryption key
   * @returns {Promise<string>} - Decrypted data
   */
  static async decrypt(encryptedObj, key) {
    const decoder = new TextDecoder();
    const iv = new Uint8Array(encryptedObj.iv);
    const data = new Uint8Array(encryptedObj.data);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    return decoder.decode(decryptedData);
  }

  /**
   * Hash password using SHA-256
   * @param {string} password - Password to hash
   * @returns {Promise<string>} - Hashed password (hex string)
   */
  static async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a secure random session token
   * @returns {string} - Random session token
   */
  static generateSessionToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Securely clear sensitive data from memory
   * @param {Object} obj - Object containing sensitive data
   */
  static clearSensitiveData(obj) {
    if (typeof obj === 'object' && obj !== null) {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = '';
        } else if (typeof obj[key] === 'object') {
          this.clearSensitiveData(obj[key]);
        }
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CryptoUtils;
}
