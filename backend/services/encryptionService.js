const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

class EncryptionService {
  constructor() {
    // Use environment variable for encryption key, fallback to generated key
    this.key = process.env.ENCRYPTION_KEY || this.generateKey();
  }

  // Generate a random encryption key
  generateKey() {
    return crypto.randomBytes(KEY_LENGTH);
  }

  // Encrypt sensitive data
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipher(ALGORITHM, this.key);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return format: iv:authTag:encryptedData
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(ALGORITHM, this.key);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Hash sensitive data (one-way)
  hash(text, saltRounds = 12) {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcrypt');
      bcrypt.hash(text, saltRounds, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });
  }

  // Verify hashed data
  verifyHash(text, hash) {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcrypt');
      bcrypt.compare(text, hash, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // Generate secure random token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash for integrity checking (not for passwords)
  createIntegrityHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

module.exports = new EncryptionService();