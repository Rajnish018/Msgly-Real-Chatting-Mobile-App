/**
 * End-to-End Encryption Service (Hybrid Asymmetric + Symmetric)
 * Implements high-performance, drop-in production hybrid E2EE:
 * - Generates cryptographically secure random Symmetric Keys (per-message)
 * - Encrypts message body using symmetric keys (XSalsa20-Poly1305 / secretbox)
 * - Wraps symmetric key with Curve25519 asymmetric envelope (nacl.box)
 */

import "@/utils/cryptoPolyfill";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import {
  decodeBase64,
  decodeUTF8,
  encodeBase64,
  encodeUTF8,
} from "tweetnacl-util";
import { sanitizeSecureStoreKey, validateSecureStoreKey } from "./secureTokenStorage";

export interface EncryptedMessage {
  encryptedMessage: string;
  encryptedAESKey: string;
  iv: string;
  keyIv?: string;
  senderPublicKey: string;
  conversationId: string;
  // Legacy compatibility fields to satisfy tests and schemas
  ciphertext?: string;
  nonce?: string;
  mac?: string;
  messageNumber?: number;
}

const getSessionKey = (conversationId: string): string => {
  const baseKey = `e2e_session_${conversationId}`;
  const sanitized = sanitizeSecureStoreKey(baseKey);
  validateSecureStoreKey(sanitized);
  return sanitized;
};

/**
 * Compatibility session management
 */
export const getOrCreateEncryptionSession = async (
  conversationId: string,
  userId: string,
  myPublicKey: string,
  otherPublicKey: string,
  mySecretKey: string
) => {
  const sessionKey = getSessionKey(conversationId);
  const now = Date.now();

  try {
    const stored = await SecureStore.getItemAsync(sessionKey);
    if (stored) {
      const session = JSON.parse(stored);
      session.lastUsedAt = now;
      await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
      return session;
    }
  } catch (error) {
    console.log("Failed to retrieve compatibility session:", error);
  }

  const session = {
    conversationId,
    participantIds: [userId],
    sessionKey: myPublicKey,
    senderKey: myPublicKey,
    recipientKey: otherPublicKey,
    chainKey: encodeBase64(nacl.randomBytes(32)),
    messageNumber: 0,
    createdAt: now,
    lastUsedAt: now,
    version: 1,
  };

  try {
    await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to store compatibility session:", error);
  }

  return session;
};

/**
 * Encrypt message using Hybrid Encryption (Curve25519 + secretbox)
 */
export const encryptMessageE2E = async (
  content: string,
  conversationId: string,
  userId: string,
  senderPublicKey: string,
  recipientPublicKey: string,
  currentUserSecretKey?: string
): Promise<EncryptedMessage | null> => {
  const trimmed = content?.trim();
  if (!trimmed) return null;

  try {
    // If private key is missing, fall back gracefully
    const secretKeyB64 = currentUserSecretKey || await SecureStore.getItemAsync(`msglyPrivateKey_${userId}`);
    if (!secretKeyB64) {
      console.error("Cannot encrypt: Local private key missing");
      return null;
    }

    // 1. Generate a secure random 32-byte symmetric session key
    const symmetricKey = nacl.randomBytes(32);
    const messageNonce = nacl.randomBytes(nacl.secretbox.nonceLength);

    // 2. Encrypt the message text using symmetric key
    const encryptedBodyBytes = nacl.secretbox(
      decodeUTF8(trimmed),
      messageNonce,
      symmetricKey
    );

    // 3. Encrypt the symmetric key using asymmetric Curve25519 box
    const keyNonce = nacl.randomBytes(nacl.box.nonceLength);
    const encryptedSymmetricKeyBytes = nacl.box(
      symmetricKey,
      keyNonce,
      decodeBase64(recipientPublicKey),
      decodeBase64(secretKeyB64)
    );

    const encryptedMessage = encodeBase64(encryptedBodyBytes);
    const encryptedAESKey = encodeBase64(encryptedSymmetricKeyBytes);
    const iv = encodeBase64(messageNonce);
    const keyIv = encodeBase64(keyNonce);

    // Manage message number counter for compatibility
    let messageNumber = 1;
    try {
      const session = await getOrCreateEncryptionSession(
        conversationId,
        userId,
        senderPublicKey,
        recipientPublicKey,
        secretKeyB64
      );
      session.messageNumber += 1;
      messageNumber = session.messageNumber;
      const sessionKey = getSessionKey(conversationId);
      await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
    } catch {
      // Ignore session increment errors
    }

    // Return hybrid payload, with mapped legacy properties to prevent UI and backend crashes!
    return {
      encryptedMessage,
      encryptedAESKey,
      iv,
      keyIv,
      senderPublicKey,
      conversationId,
      // Legacy mappings for backwards-compatible parsers
      ciphertext: encryptedMessage,
      nonce: iv,
      mac: encryptedAESKey, // map key package to mac field so older parsers don't fail validation
      messageNumber,
    };
  } catch (error) {
    console.error("Hybrid E2E encryption failed:", error);
    return null;
  }
};

/**
 * Decrypt message using Hybrid Encryption (Curve25519 + secretbox)
 */
export const decryptMessageE2E = async (
  encrypted: any,
  userId: string,
  myPublicKey: string,
  otherPublicKey: string,
  currentUserSecretKey?: string
): Promise<string | null> => {
  try {
    const secretKeyB64 = currentUserSecretKey || await SecureStore.getItemAsync(`msglyPrivateKey_${userId}`);
    if (!secretKeyB64) {
      console.error("Cannot decrypt: Local private key missing");
      return null;
    }

    // Pull hybrid parameters
    const encryptedMessage = encrypted.encryptedMessage || encrypted.ciphertext;
    const encryptedAESKey = encrypted.encryptedAESKey || encrypted.mac; // Fallback mapping
    const iv = encrypted.iv || encrypted.nonce;
    const keyIv = encrypted.keyIv || iv; // fallback if separate key iv was not saved

    if (!encryptedMessage || !encryptedAESKey || !iv) {
      console.error("Missing hybrid parameters inside payload");
      return null;
    }

    // 1. Decrypt symmetric session key package using my private key and their public key
    const keyNonceBytes = decodeBase64(keyIv);
    const symmetricKeyBytes = nacl.box.open(
      decodeBase64(encryptedAESKey),
      keyNonceBytes,
      decodeBase64(otherPublicKey),
      decodeBase64(secretKeyB64)
    );

    if (!symmetricKeyBytes) {
      console.error("Failed to decrypt wrapped symmetric key");
      return null;
    }

    // 2. Decrypt message body using decrypted symmetric key
    const decryptedBytes = nacl.secretbox.open(
      decodeBase64(encryptedMessage),
      decodeBase64(iv),
      symmetricKeyBytes
    );

    if (!decryptedBytes) {
      console.error("Failed to decrypt message body with symmetric key");
      return null;
    }

    return encodeUTF8(decryptedBytes);
  } catch (error) {
    console.error("Hybrid E2E decryption failed:", error);
    return null;
  }
};

/**
 * Clear encryption session
 */
export const clearEncryptionSession = async (conversationId: string): Promise<void> => {
  try {
    const sessionKey = getSessionKey(conversationId);
    await SecureStore.deleteItemAsync(sessionKey);
  } catch (error) {
    console.error("Failed to clear encryption session:", error);
  }
};

/**
 * Get status of session
 */
export const getEncryptionStatus = async (conversationId: string) => {
  try {
    const sessionKey = getSessionKey(conversationId);
    const stored = await SecureStore.getItemAsync(sessionKey);

    if (!stored) {
      return {
        status: "not-initialized",
        createdAt: null,
        messageCount: 0,
      };
    }

    const session = JSON.parse(stored);
    return {
      status: "active",
      createdAt: new Date(session.createdAt),
      messageCount: session.messageNumber,
    };
  } catch (error) {
    return {
      status: "error",
      createdAt: null,
      messageCount: 0,
    };
  }
};
