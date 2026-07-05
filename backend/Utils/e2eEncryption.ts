/**
 * End-to-End Encryption Service for Backend (WhatsApp-like)
 * Handles encryption session management and message validation
 */

import crypto from "crypto";
import { promisify } from "util";

const randomBytes = promisify(crypto.randomBytes);

/**
 * Message encryption metadata stored in DB
 */
export interface MessageEncryptionMetadata {
  encrypted: boolean;
  encryptionVersion: number;
  messageNumber: number;
  encryptedAt: Date;
  sessionId: string;
}

/**
 * Encryption session tracked on backend
 */
export interface EncryptionSessionRecord {
  conversationId: string;
  participantIds: string[];
  messageCount: number;
  createdAt: Date;
  lastUpdatedAt: Date;
  version: number;
}

/**
 * Validate E2E encrypted message payload
 */
export const validateE2EEncryptedPayload = (payload: any): boolean => {
  if (!payload) return false;

  // Always require senderPublicKey
  if (!payload.senderPublicKey || typeof payload.senderPublicKey !== "string") {
    return false;
  }

  // Check if it's Hybrid format
  const isHybrid = payload.encryptedMessage && payload.encryptedAESKey && payload.iv;
  // Check if it's Legacy format
  const isLegacy = payload.ciphertext && payload.nonce && payload.mac;

  if (!isHybrid && !isLegacy) {
    return false;
  }

  // Validate base64 encoding
  try {
    if (isHybrid) {
      Buffer.from(payload.encryptedMessage, "base64");
      Buffer.from(payload.encryptedAESKey, "base64");
      Buffer.from(payload.iv, "base64");
      if (payload.keyIv) {
        Buffer.from(payload.keyIv, "base64");
      }
    } else {
      Buffer.from(payload.ciphertext, "base64");
      Buffer.from(payload.nonce, "base64");
      Buffer.from(payload.mac, "base64");
    }
    Buffer.from(payload.senderPublicKey, "base64");
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Verify message counter for replay attack protection
 */
export const verifyMessageCounter = (
  expectedNext: number,
  receivedCounter: number
): boolean => {
  // Allow for some out-of-order delivery
  const MAX_OUT_OF_ORDER = 100;
  return receivedCounter >= expectedNext && receivedCounter <= expectedNext + MAX_OUT_OF_ORDER;
};

/**
 * Create encryption session record
 */
export const createEncryptionSession = (
  conversationId: string,
  participantIds: string[]
): EncryptionSessionRecord => {
  return {
    conversationId,
    participantIds: Array.from(new Set(participantIds)), // Remove duplicates
    messageCount: 0,
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
    version: 1,
  };
};

/**
 * Increment message count in session
 */
export const incrementSessionMessageCount = (
  session: EncryptionSessionRecord
): EncryptionSessionRecord => {
  return {
    ...session,
    messageCount: session.messageCount + 1,
    lastUpdatedAt: new Date(),
  };
};

/**
 * Generate encryption metadata for outgoing message
 */
export const generateEncryptionMetadata = (
  sessionId: string,
  messageNumber: number
): MessageEncryptionMetadata => {
  return {
    encrypted: true,
    encryptionVersion: 1,
    messageNumber,
    encryptedAt: new Date(),
    sessionId,
  };
};

/**
 * Validate all participants can decrypt (have public keys)
 */
export const validateParticipantEncryption = (
  participants: any[]
): { valid: boolean; missingKeys: string[] } => {
  const missingKeys: string[] = [];

  for (const participant of participants) {
    if (!participant?.publicEncryptionKey) {
      missingKeys.push(String(participant._id || participant.id || "unknown"));
    }
  }

  return {
    valid: missingKeys.length === 0,
    missingKeys,
  };
};

/**
 * Format E2E encrypted message for transmission
 */
export const formatE2EEncryptedMessage = (message: any) => {
  const encryptedPayloads: Record<string, any> = {};

  if (message.encryptedPayloads instanceof Map) {
    for (const [userId, payload] of message.encryptedPayloads.entries()) {
      if (validateE2EEncryptedPayload(payload)) {
        encryptedPayloads[String(userId)] = payload;
      }
    }
  } else if (message.encryptedPayloads && typeof message.encryptedPayloads === "object") {
    for (const [userId, payload] of Object.entries(message.encryptedPayloads)) {
      if (validateE2EEncryptedPayload(payload)) {
        encryptedPayloads[userId] = payload;
      }
    }
  }

  return {
    ...message,
    encryptedPayloads: Object.keys(encryptedPayloads).length ? encryptedPayloads : undefined,
    encrypted: Boolean(Object.keys(encryptedPayloads).length),
  };
};

/**
 * Check if message is properly encrypted for all participants
 */
export const isMessageFullyEncrypted = (
  message: any,
  participantIds: string[]
): boolean => {
  if (!message?.encrypted) return false;

  const encryptedPayloads = message.encryptedPayloads || {};
  const encryptedCount = Object.keys(encryptedPayloads).length;

  // Message should be encrypted for all participants
  return encryptedCount === participantIds.length;
};

/**
 * Log encryption event for audit trail
 */
export const createEncryptionAuditLog = (
  conversationId: string,
  messageId: string,
  userId: string,
  action: "send" | "decrypt" | "verify-failed" | "decrypt-failed",
  details?: string
) => {
  return {
    timestamp: new Date(),
    conversationId,
    messageId,
    userId,
    action,
    details: details || null,
  };
};

/**
 * Sanitize encryption metadata before sending to client
 */
export const sanitizeEncryptionMetadata = (metadata: MessageEncryptionMetadata) => {
  return {
    encrypted: metadata.encrypted,
    encryptionVersion: metadata.encryptionVersion,
    messageNumber: metadata.messageNumber,
    encryptedAt: metadata.encryptedAt,
  };
};
