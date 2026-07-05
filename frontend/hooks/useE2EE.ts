import { useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import {
  decodeBase64,
  encodeBase64,
  decodeUTF8,
  encodeUTF8,
} from "tweetnacl-util";
import axios from "axios";
import { API_URL } from "@/constants";

// Pure TypeScript PBKDF2 implementation using nacl.hash (SHA-512)
export const pbkdf2SHA512 = (
  password: string,
  salt: string,
  iterations = 2000,
  keyLen = 32
): Uint8Array => {
  const pwBytes = decodeUTF8(password);
  const saltBytes = decodeUTF8(salt);

  let block = new Uint8Array(pwBytes.length + saltBytes.length + 4);
  block.set(pwBytes, 0);
  block.set(saltBytes, pwBytes.length);
  block[block.length - 1] = 1;

  let u = nacl.hash(block);
  let result = new Uint8Array(u);

  for (let i = 1; i < iterations; i++) {
    // Hash password + previous hash
    const combined = new Uint8Array(pwBytes.length + u.length);
    combined.set(pwBytes, 0);
    combined.set(u, pwBytes.length);
    u = nacl.hash(combined);
    
    for (let j = 0; j < result.length; j++) {
      result[j] ^= u[j];
    }
  }

  return result.slice(0, keyLen);
};

// Memory cache for public keys
const publicKeyCache: Record<string, string> = {};

export const useE2EE = () => {
  const [loading, setLoading] = useState(false);

  // Fetch a user's public key with in-memory caching
  const fetchPublicKey = useCallback(async (userId: string, token: string): Promise<string | null> => {
    if (publicKeyCache[userId]) {
      return publicKeyCache[userId];
    }

    try {
      const response = await axios.get(`${API_URL}/conversations/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const publicKey = response.data?.user?.publicEncryptionKey || response.data?.publicEncryptionKey;
      if (publicKey) {
        publicKeyCache[userId] = publicKey;
        return publicKey;
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch public key for user ${userId}:`, error);
      return null;
    }
  }, []);

  // Generate Curve25519 identity key pair and store private key encrypted by password
  const generateAndStoreKeys = useCallback(async (userId: string, password: string, email: string) => {
    setLoading(true);
    try {
      const keyPair = nacl.box.keyPair();
      const publicKey = encodeBase64(keyPair.publicKey);
      const privateKey = encodeBase64(keyPair.secretKey);

      // Derive encryption key from password + email salt
      const salt = email.toLowerCase().trim();
      const derivedKey = pbkdf2SHA512(password, salt);

      // Encrypt the private key using the derived key
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const encryptedPrivateKey = nacl.secretbox(
        decodeUTF8(privateKey),
        nonce,
        derivedKey
      );

      const privateKeyBundle = {
        ciphertext: encodeBase64(encryptedPrivateKey),
        nonce: encodeBase64(nonce),
      };

      // Store private key bundle and public key in SecureStore
      await SecureStore.setItemAsync(`msglyPrivateKey_${userId}`, JSON.stringify(privateKeyBundle));
      await SecureStore.setItemAsync(`msglyPublicKey_${userId}`, publicKey);

      return publicKey;
    } catch (error) {
      console.error("Failed to generate and store keys:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Retrieve and decrypt the private key using password
  const getPrivateKey = useCallback(async (userId: string, password: string, email: string): Promise<string | null> => {
    try {
      const rawBundle = await SecureStore.getItemAsync(`msglyPrivateKey_${userId}`);
      if (!rawBundle) return null;

      const { ciphertext, nonce } = JSON.parse(rawBundle);
      const salt = email.toLowerCase().trim();
      const derivedKey = pbkdf2SHA512(password, salt);

      const decrypted = nacl.secretbox.open(
        decodeBase64(ciphertext),
        decodeBase64(nonce),
        derivedKey
      );

      if (!decrypted) {
        throw new Error("Invalid password or corrupted private key");
      }

      return encodeUTF8(decrypted);
    } catch (error) {
      console.error("Failed to decrypt private key:", error);
      return null;
    }
  }, []);

  // Asymmetric/Symmetric Hybrid Encryption (Per-Message AES/XSalsa20 equivalent)
  const encryptMessage = useCallback(async (
    plainText: string,
    recipientPublicKey: string,
    senderPrivateKeyB64: string,
    senderPublicKeyB64: string
  ) => {
    try {
      // 1. Generate a symmetric session key (32 bytes) and random nonce (24 bytes)
      const symmetricKey = nacl.randomBytes(32);
      const messageNonce = nacl.randomBytes(nacl.secretbox.nonceLength);

      // 2. Encrypt actual message body with symmetric key
      const encryptedMsg = nacl.secretbox(
        decodeUTF8(plainText),
        messageNonce,
        symmetricKey
      );

      // 3. Encrypt symmetric key with recipient's public key
      const keyNonce = nacl.randomBytes(nacl.box.nonceLength);
      const encryptedKey = nacl.box(
        symmetricKey,
        keyNonce,
        decodeBase64(recipientPublicKey),
        decodeBase64(senderPrivateKeyB64)
      );

      return {
        encryptedMessage: encodeBase64(encryptedMsg),
        encryptedAESKey: encodeBase64(encryptedKey),
        iv: encodeBase64(messageNonce),
        keyIv: encodeBase64(keyNonce),
        senderPublicKey: senderPublicKeyB64,
      };
    } catch (error) {
      console.error("Encryption failed:", error);
      return null;
    }
  }, []);

  // Decrypt Hybrid Envelope
  const decryptMessage = useCallback(async (
    encryptedPayload: {
      encryptedMessage: string;
      encryptedAESKey: string;
      iv: string;
      keyIv?: string; // Optional nonce for the encrypted key
      senderPublicKey: string;
    },
    userPrivateKeyB64: string
  ): Promise<string | null> => {
    try {
      // 1. Decrypt symmetric key using sender's public key and user's private key
      // If keyIv (nonce used for key box) is missing, fall back to message nonce (iv)
      const keyNonce = encryptedPayload.keyIv
        ? decodeBase64(encryptedPayload.keyIv)
        : decodeBase64(encryptedPayload.iv);

      const symmetricKey = nacl.box.open(
        decodeBase64(encryptedPayload.encryptedAESKey),
        keyNonce,
        decodeBase64(encryptedPayload.senderPublicKey),
        decodeBase64(userPrivateKeyB64)
      );

      if (!symmetricKey) {
        console.error("Failed to decrypt symmetric key envelope");
        return null;
      }

      // 2. Decrypt actual message body using decrypted symmetric key
      const decryptedMessageBytes = nacl.secretbox.open(
        decodeBase64(encryptedPayload.encryptedMessage),
        decodeBase64(encryptedPayload.iv),
        symmetricKey
      );

      if (!decryptedMessageBytes) {
        console.error("Failed to decrypt message body with symmetric key");
        return null;
      }

      return encodeUTF8(decryptedMessageBytes);
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }, []);

  return {
    loading,
    fetchPublicKey,
    generateAndStoreKeys,
    getPrivateKey,
    encryptMessage,
    decryptMessage,
  };
};
