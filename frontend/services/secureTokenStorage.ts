// Frontend secure token storage - Add to frontend/services/secureTokenStorage.ts
import "@/utils/cryptoPolyfill";
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ENCRYPTION_KEY = 'msgly_encryption_key';

/**
 * Validates that a key meets SecureStore requirements
 * Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_"
 */
function validateSecureStoreKey(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new Error('SecureStore key must not be empty');
  }

  const validKeyPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validKeyPattern.test(key)) {
    throw new Error(
      `SecureStore key "${key}" contains invalid characters. ` +
      'Only alphanumeric characters, ".", "-", and "_" are allowed.'
    );
  }
}

/**
 * Sanitizes a key by replacing invalid characters with underscores
 */
function sanitizeSecureStoreKey(key: string): string {
  if (!key || key.trim().length === 0) {
    throw new Error('Cannot sanitize empty key');
  }
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

class SecureTokenStorage {
  /**
   * Helper to store large strings in SecureStore by chunking them
   * SecureStore has a ~2048 byte limit per key
   */
  private async setLargeItemAsync(key: string, value: string): Promise<void> {
    const chunkSize = 2000;
    if (value.length <= chunkSize) {
      await SecureStore.deleteItemAsync(`${key}_chunks_count`);
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunksCount = Math.ceil(value.length / chunkSize);
    await SecureStore.setItemAsync(`${key}_chunks_count`, chunksCount.toString());
    
    for (let i = 0; i < chunksCount; i++) {
      const chunk = value.substring(i * chunkSize, (i + 1) * chunkSize);
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
    }
  }

  /**
   * Helper to retrieve large strings from SecureStore
   */
  private async getLargeItemAsync(key: string): Promise<string | null> {
    const chunksCountStr = await SecureStore.getItemAsync(`${key}_chunks_count`);
    
    if (!chunksCountStr) {
      return await SecureStore.getItemAsync(key);
    }

    const chunksCount = parseInt(chunksCountStr, 10);
    if (isNaN(chunksCount) || chunksCount <= 0) {
       return await SecureStore.getItemAsync(key);
    }

    let fullString = '';
    for (let i = 0; i < chunksCount; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (chunk) {
        fullString += chunk;
      }
    }
    return fullString;
  }

  /**
   * Helper to delete large strings from SecureStore
   */
  private async deleteLargeItemAsync(key: string): Promise<void> {
    const chunksCountStr = await SecureStore.getItemAsync(`${key}_chunks_count`);
    if (chunksCountStr) {
      const chunksCount = parseInt(chunksCountStr, 10);
      for (let i = 0; i < chunksCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks_count`);
    }
    await SecureStore.deleteItemAsync(key);
  }
  /**
   * Store token securely using platform-specific secure storage
   */
  async setToken(token: string): Promise<void> {
    try {
      await this.setLargeItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token securely', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Retrieve token from secure storage
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await this.getLargeItemAsync(TOKEN_KEY);
      return token || null;
    } catch (error) {
      console.error('Failed to retrieve token', error);
      return null;
    }
  }

  /**
   * Store refresh token securely
   */
  async setRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.setLargeItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Failed to store refresh token', error);
      throw new Error('Failed to store refresh token');
    }
  }

  /**
   * Retrieve refresh token from secure storage
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const refreshToken = await this.getLargeItemAsync(REFRESH_TOKEN_KEY);
      return refreshToken || null;
    } catch (error) {
      console.error('Failed to retrieve refresh token', error);
      return null;
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        this.deleteLargeItemAsync(TOKEN_KEY),
        this.deleteLargeItemAsync(REFRESH_TOKEN_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear tokens', error);
      throw new Error('Failed to clear authentication tokens');
    }
  }

  /**
   * Store sensitive offline data with encryption
   */
  async setEncryptedData(key: string, data: any): Promise<void> {
    try {
      // Validate and sanitize the key
      const sanitizedKey = sanitizeSecureStoreKey(key);
      validateSecureStoreKey(sanitizedKey);

      const jsonString = JSON.stringify(data);
      
      // Use TweetNaCl for encryption instead of expo-crypto
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const keyBytes = nacl.hash(new Uint8Array(Buffer.from(ENCRYPTION_KEY + sanitizedKey)));
      const secretKey = keyBytes.slice(0, 32); // Use first 32 bytes as key
      
      // Simple authenticated encryption
      const encrypted = nacl.secretbox(
        new Uint8Array(Buffer.from(jsonString)),
        nonce,
        secretKey
      );
      
      const encryptedData = {
        nonce: encodeBase64(nonce),
        ciphertext: encodeBase64(encrypted)
      };
      
      const storageKey = `enc_${sanitizedKey}`;
      validateSecureStoreKey(storageKey);
      await this.setLargeItemAsync(storageKey, JSON.stringify(encryptedData));
    } catch (error) {
      console.error('Failed to store encrypted data', error);
      throw error;
    }
  }

  /**
   * Retrieve encrypted data
   */
  async getEncryptedData(key: string): Promise<any> {
    try {
      // Validate and sanitize the key
      const sanitizedKey = sanitizeSecureStoreKey(key);
      validateSecureStoreKey(sanitizedKey);

      const storageKey = `enc_${sanitizedKey}`;
      validateSecureStoreKey(storageKey);
      
      const encryptedDataStr = await this.getLargeItemAsync(storageKey);
      if (!encryptedDataStr) return null;
      
      const encryptedData = JSON.parse(encryptedDataStr);
      const nonce = decodeBase64(encryptedData.nonce);
      const ciphertext = decodeBase64(encryptedData.ciphertext);
      
      const keyBytes = nacl.hash(new Uint8Array(Buffer.from(ENCRYPTION_KEY + sanitizedKey)));
      const secretKey = keyBytes.slice(0, 32);
      
      const decrypted = nacl.secretbox.open(ciphertext, nonce, secretKey);
      if (!decrypted) return null;
      
      const decryptedStr = Buffer.from(decrypted).toString();
      return JSON.parse(decryptedStr);
    } catch (error) {
      console.error('Failed to retrieve encrypted data', error);
      return null;
    }
  }

  /**
   * Check if token exists and is valid (not expired)
   */
  async isTokenValid(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      // Decode JWT to check expiry (without verification)
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      try {
        const decoded = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8')
        );
        const expiryTime = decoded.exp * 1000; // Convert to milliseconds
        return expiryTime > Date.now();
      } catch {
        return false;
      }
    } catch (error) {
      console.error('Token validation error', error);
      return false;
    }
  }
}

export const secureTokenStorage = new SecureTokenStorage();
export default secureTokenStorage;

// Export validation utilities for use in other modules
export { validateSecureStoreKey, sanitizeSecureStoreKey };
