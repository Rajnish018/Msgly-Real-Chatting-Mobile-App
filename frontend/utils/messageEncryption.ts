import "@/utils/cryptoPolyfill";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import {
  decodeBase64,
  decodeUTF8,
  encodeBase64,
  encodeUTF8,
} from "tweetnacl-util";

import { updateEncryptionKey } from "@/services/authService";
import { sanitizeSecureStoreKey, validateSecureStoreKey } from "@/services/secureTokenStorage";
import { MessageProps } from "@/types";

// Use underscore instead of colon (not allowed in SecureStore keys)
const getKeyPairStorageKey = (userId: string) => {
  const baseKey = `msglyEncryptionKeyPair_${userId}`;
  const sanitizedKey = sanitizeSecureStoreKey(baseKey);
  validateSecureStoreKey(sanitizedKey);
  return sanitizedKey;
};

type StoredKeyPair = {
  publicKey: string;
  secretKey: string;
  version: number;
  token?: string;
};

const getStoredKeyPair = async (userId: string) => {
  const raw = await SecureStore.getItemAsync(getKeyPairStorageKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredKeyPair;
  } catch {
    return null;
  }
};

const publishEncryptionIdentity = async (
  token: string | null | undefined,
  identity: StoredKeyPair
) => {
  if (!token) return undefined;

  try {
    const response = await updateEncryptionKey(token, identity.publicKey);
    return response?.data?.token;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.warn(
        "Encryption key sync endpoint is unavailable. Deploy the latest backend to persist encryption identity across reinstalls."
      );
      return undefined;
    }

    throw error;
  }
};

export const getOrCreateEncryptionIdentity = async (
  userId: string,
  token?: string | null,
  serverPublicKey?: string | null
) => {
  const stored = await getStoredKeyPair(userId);
  if (stored?.publicKey && stored?.secretKey) {
    let refreshedToken: string | undefined;
    if (token && stored.publicKey !== serverPublicKey) {
      refreshedToken = await publishEncryptionIdentity(token, stored);
    }
    return { ...stored, token: refreshedToken };
  }

  const keyPair = nacl.box.keyPair();
  const nextIdentity: StoredKeyPair = {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
    version: 1,
  };

  await SecureStore.setItemAsync(
    getKeyPairStorageKey(userId),
    JSON.stringify(nextIdentity)
  );

  const refreshedToken = await publishEncryptionIdentity(token, nextIdentity);
  return { ...nextIdentity, token: refreshedToken };
};

/**
 * Build encrypted payloads for legacy encryption (kept for backward compatibility)
 */
export const buildEncryptedPayloads = async ({
  content,
  currentUserId,
  token,
  currentUserPublicKey,
  participants,
}: {
  content: string;
  currentUserId: string;
  token?: string | null;
  currentUserPublicKey?: string | null;
  participants: { _id?: string; id?: string; publicEncryptionKey?: string | null }[];
}) => {
  const trimmedContent = content.trim();
  if (!trimmedContent) return null;

  const identity = await getOrCreateEncryptionIdentity(
    currentUserId,
    token,
    currentUserPublicKey
  );
  const senderSecretKey = decodeBase64(identity.secretKey);
  const payloads: Record<string, { ciphertext: string; nonce: string; senderPublicKey: string }> = {};

  for (const participant of participants) {
    const participantId = String(participant._id || participant.id || "");
    if (!participantId) continue;

    const recipientPublicKey =
      String(participantId) === String(currentUserId)
        ? identity.publicKey
        : participant.publicEncryptionKey;

    if (!recipientPublicKey) {
      return null;
    }

    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encrypted = nacl.box(
      decodeUTF8(trimmedContent),
      nonce,
      decodeBase64(recipientPublicKey),
      senderSecretKey
    );

    payloads[participantId] = {
      ciphertext: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      senderPublicKey: identity.publicKey,
    };
  }

  return Object.keys(payloads).length ? payloads : null;
};

/**
 * Build Hybrid E2E encrypted payloads
 * Generates a per-message symmetric session key, encrypts message body, and wraps session key with participant keys
 */
export const buildE2EEncryptedPayloads = async ({
  content,
  conversationId,
  currentUserId,
  currentUserPublicKey,
  participants,
}: {
  content: string;
  conversationId: string;
  currentUserId: string;
  currentUserPublicKey?: string | null;
  participants: { _id?: string; id?: string; publicEncryptionKey?: string | null }[];
}) => {
  const trimmedContent = content.trim();
  if (!trimmedContent) return null;

  if (!currentUserPublicKey) return null;

  const identity = await getStoredKeyPair(currentUserId);
  if (!identity?.secretKey) return null;

  try {
    // 1. Generate a single symmetric session key (32 bytes) and random nonce/IV (24 bytes)
    const symmetricKey = nacl.randomBytes(32);
    const messageNonce = nacl.randomBytes(nacl.secretbox.nonceLength);

    // 2. Encrypt the actual message body using this symmetric session key
    const encryptedMsg = nacl.secretbox(
      decodeUTF8(trimmedContent),
      messageNonce,
      symmetricKey
    );

    const encryptedMessageBase64 = encodeBase64(encryptedMsg);
    const messageNonceBase64 = encodeBase64(messageNonce);

    const payloads: Record<
      string,
      {
        encryptedMessage: string;
        encryptedAESKey: string;
        iv: string;
        keyIv?: string;
        senderPublicKey: string;
      }
    > = {};

    const senderPrivateKeyBytes = decodeBase64(identity.secretKey);

    // 3. Encrypt the symmetric key for each participant using their Curve25519 public key
    for (const participant of participants) {
      const participantId = String(participant._id || participant.id || "");
      if (!participantId) continue;

      const recipientPublicKey =
        String(participantId) === String(currentUserId)
          ? currentUserPublicKey
          : participant.publicEncryptionKey;

      if (!recipientPublicKey) {
        continue;
      }

      try {
        const keyNonce = nacl.randomBytes(nacl.box.nonceLength);
        const encryptedKey = nacl.box(
          symmetricKey,
          keyNonce,
          decodeBase64(recipientPublicKey),
          senderPrivateKeyBytes
        );

        payloads[participantId] = {
          encryptedMessage: encryptedMessageBase64,
          encryptedAESKey: encodeBase64(encryptedKey),
          iv: messageNonceBase64,
          keyIv: encodeBase64(keyNonce),
          senderPublicKey: identity.publicKey,
        };
      } catch (innerError) {
        console.error(`Failed key wrapping for participant ${participantId}:`, innerError);
      }
    }

    return Object.keys(payloads).length ? payloads : null;
  } catch (error) {
    console.error("Hybrid E2E encryption failed:", error);
    return null;
  }
};

/**
 * Decrypt message using legacy Box E2E scheme (for backward compatibility)
 */
export const decryptMessageForUser = async (
  message: MessageProps,
  userId?: string | null
) => {
  if (!message?.encrypted || !userId) return message;

  const payload = (message.encryptedPayloads as any)?.[String(userId)];
  const identity = await getStoredKeyPair(String(userId));

  if (!payload || !identity?.secretKey) {
    return {
      ...message,
      content: "This message could not be decrypted",
      decryptionFailed: true,
    };
  }

  // Handle standard box format fallback
  const ciphertext = payload.ciphertext || payload.encryptedMessage;
  const nonce = payload.nonce || payload.iv;

  if (!ciphertext || !nonce) {
    return {
      ...message,
      content: "This message could not be decrypted",
      decryptionFailed: true,
    };
  }

  try {
    const decrypted = nacl.box.open(
      decodeBase64(ciphertext),
      decodeBase64(nonce),
      decodeBase64(payload.senderPublicKey),
      decodeBase64(identity.secretKey)
    );

    if (!decrypted) {
      return {
        ...message,
        content: "This message could not be decrypted",
        decryptionFailed: true,
      };
    }

    return {
      ...message,
      content: encodeUTF8(decrypted),
      decryptionFailed: false,
    };
  } catch {
    return {
      ...message,
      content: "This message could not be decrypted",
      decryptionFailed: true,
    };
  }
};

/**
 * Decrypt message using Hybrid Encryption (Per-Message session keys)
 */
export const decryptMessageE2EForUser = async (
  message: MessageProps,
  userId?: string | null
) => {
  if (!message?.encrypted || !userId) return message;

  const payload = message.encryptedPayloads?.[String(userId)];
  if (!payload) {
    return {
      ...message,
      content: "This message could not be decrypted",
      decryptionFailed: true,
    };
  }

  // Fallback to legacy decryption if payload is not in the new hybrid format
  if (!payload.encryptedAESKey) {
    return decryptMessageForUser(message, userId);
  }

  const identity = await getStoredKeyPair(String(userId));
  if (!identity?.secretKey) {
    return {
      ...message,
      content: "This message could not be decrypted",
      decryptionFailed: true,
    };
  }

  try {
    // 1. Decrypt symmetric key envelope using recipient's secret key and sender's public key
    const keyNonce = (payload as any).keyIv
      ? decodeBase64((payload as any).keyIv)
      : decodeBase64(payload.iv);

    const symmetricKey = nacl.box.open(
      decodeBase64(payload.encryptedAESKey),
      keyNonce,
      decodeBase64(payload.senderPublicKey),
      decodeBase64(identity.secretKey)
    );

    if (!symmetricKey) {
      return {
        ...message,
        content: "This message could not be decrypted",
        decryptionFailed: true,
      };
    }

    // 2. Decrypt actual message body with decrypted symmetric key
    const decryptedMessageBytes = nacl.secretbox.open(
      decodeBase64(payload.encryptedMessage),
      decodeBase64(payload.iv),
      symmetricKey
    );

    if (!decryptedMessageBytes) {
      return {
        ...message,
        content: "This message could not be decrypted",
        decryptionFailed: true,
      };
    }

    return {
      ...message,
      content: encodeUTF8(decryptedMessageBytes),
      decryptionFailed: false,
    };
  } catch (error) {
    console.error("Hybrid E2E decryption failed:", error);
    return {
      ...message,
      content: "This message could not be decrypted",
      decryptionFailed: true,
    };
  }
};

export const decryptMessagesForUser = async (
  messages: MessageProps[],
  userId?: string | null
) => Promise.all(messages.map((message) => decryptMessageE2EForUser(message, userId)));
