/**
 * E2E Encryption Tests - Hybrid Encryption (Curve25519 + secretbox)
 * Verifies round-trip encryption, ciphertext uniqueness, and tampering detection
 */

import {
  encryptMessageE2E,
  decryptMessageE2E,
  getOrCreateEncryptionSession,
  clearEncryptionSession,
} from "@/services/e2eEncryption";

import nacl from "tweetnacl";
import { encodeBase64 } from "tweetnacl-util";

describe("Hybrid E2E Encryption", () => {
  const testConversationId = "test-conv-123";
  const testUserId = "user-1";
  const testContent = "Hello, World!";
  
  // Generate real keys for testing
  const senderKeys = nacl.box.keyPair();
  const recipientKeys = nacl.box.keyPair();

  const senderPubKey = encodeBase64(senderKeys.publicKey);
  const senderSecKey = encodeBase64(senderKeys.secretKey);
  const recipientPubKey = encodeBase64(recipientKeys.publicKey);
  const recipientSecKey = encodeBase64(recipientKeys.secretKey);

  beforeEach(async () => {
    // Clear sessions before each test
    await clearEncryptionSession(testConversationId);
  });

  describe("Session Management", () => {
    it("should create compatibility session on first call", async () => {
      const session = await getOrCreateEncryptionSession(
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      expect(session).toBeDefined();
      expect(session.conversationId).toBe(testConversationId);
      expect(session.messageNumber).toBe(0);
    });

    it("should retrieve existing session on subsequent calls", async () => {
      const session1 = await getOrCreateEncryptionSession(
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      const session2 = await getOrCreateEncryptionSession(
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      expect(session1.chainKey).toBeDefined();
      expect(session2.chainKey).toBeDefined();
    });
  });

  describe("Message Encryption", () => {
    it("should encrypt message successfully", async () => {
      const encrypted = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      expect(encrypted).toBeDefined();
      expect(encrypted?.encryptedMessage).toBeDefined();
      expect(encrypted?.encryptedAESKey).toBeDefined();
      expect(encrypted?.iv).toBeDefined();
      expect(encrypted?.senderPublicKey).toBe(senderPubKey);
    });

    it("should return null for empty content", async () => {
      const encrypted = await encryptMessageE2E(
        "",
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      expect(encrypted).toBeNull();
    });

    it("should produce different ciphertexts for same content", async () => {
      const encrypted1 = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      const encrypted2 = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      // Different due to per-message random symmetric keys & IVs
      expect(encrypted1?.encryptedMessage).not.toBe(encrypted2?.encryptedMessage);
      expect(encrypted1?.iv).not.toBe(encrypted2?.iv);
    });
  });

  describe("Message Authentication and Integrity Check", () => {
    it("should include valid Base64 wrapped key and ciphertext in encrypted package", async () => {
      const encrypted = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      expect(encrypted?.encryptedAESKey).toBeDefined();
      expect(encrypted?.encryptedAESKey?.length).toBeGreaterThan(0);
      expect(/^[A-Za-z0-9+/=]+$/.test(encrypted?.encryptedAESKey || "")).toBe(true);
    });

    it("should detect tampering with encrypted message", async () => {
      const encrypted = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      if (encrypted) {
        // Tamper with ciphertext
        const tamperedCiphertext = Buffer.from(encrypted.encryptedMessage, "base64");
        tamperedCiphertext[0] = (tamperedCiphertext[0] + 1) % 256;
        const tamperedEncrypted = {
          ...encrypted,
          encryptedMessage: tamperedCiphertext.toString("base64"),
          ciphertext: tamperedCiphertext.toString("base64"), // Keep legacy field updated as well
        };

        // Decryption should fail
        const decrypted = await decryptMessageE2E(
          tamperedEncrypted,
          testUserId,
          recipientPubKey,
          senderPubKey,
          recipientSecKey
        );

        expect(decrypted).toBeNull();
      }
    });

    it("should detect tampering with wrapped symmetric key package", async () => {
      const encrypted = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      if (encrypted) {
        // Tamper with wrapped AES key
        const tamperedKey = Buffer.from(encrypted.encryptedAESKey, "base64");
        tamperedKey[0] = (tamperedKey[0] + 1) % 256;
        const tamperedEncrypted = {
          ...encrypted,
          encryptedAESKey: tamperedKey.toString("base64"),
          mac: tamperedKey.toString("base64"), // Keep legacy field updated as well
        };

        const decrypted = await decryptMessageE2E(
          tamperedEncrypted,
          testUserId,
          recipientPubKey,
          senderPubKey,
          recipientSecKey
        );

        expect(decrypted).toBeNull();
      }
    });
  });

  describe("Round-trip Encryption/Decryption", () => {
    it("should decrypt message to original content", async () => {
      const encrypted = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      if (encrypted) {
        const decrypted = await decryptMessageE2E(
          encrypted,
          testUserId,
          recipientPubKey,
          senderPubKey,
          recipientSecKey
        );

        expect(decrypted).toBe(testContent);
      }
    });

    it("should handle unicode content", async () => {
      const unicodeContent = "Hello 👋 World 🌍 こんにちは 你好";

      const encrypted = await encryptMessageE2E(
        unicodeContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      if (encrypted) {
        const decrypted = await decryptMessageE2E(
          encrypted,
          testUserId,
          recipientPubKey,
          senderPubKey,
          recipientSecKey
        );

        expect(decrypted).toBe(unicodeContent);
      }
    });

    it("should handle long content", async () => {
      const longContent = "x".repeat(10000);

      const encrypted = await encryptMessageE2E(
        longContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      if (encrypted) {
        const decrypted = await decryptMessageE2E(
          encrypted,
          testUserId,
          recipientPubKey,
          senderPubKey,
          recipientSecKey
        );

        expect(decrypted).toBe(longContent);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle decryption with missing wrapped symmetric key gracefully", async () => {
      const encrypted = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      if (encrypted) {
        const noKeyEncrypted = {
          ...encrypted,
          encryptedAESKey: "",
          mac: "",
        };

        const decrypted = await decryptMessageE2E(
          noKeyEncrypted,
          testUserId,
          recipientPubKey,
          senderPubKey,
          recipientSecKey
        );

        expect(decrypted).toBeNull();
      }
    });

    it("should handle decryption with corrupted nonce gracefully", async () => {
      const encrypted = await encryptMessageE2E(
        testContent,
        testConversationId,
        testUserId,
        senderPubKey,
        recipientPubKey,
        senderSecKey
      );

      if (encrypted) {
        const corruptedEncrypted = {
          ...encrypted,
          iv: "aW52YWxpZGJhc2U2NA==", // Invalid/different nonce
          nonce: "aW52YWxpZGJhc2U2NA==",
        };

        const decrypted = await decryptMessageE2E(
          corruptedEncrypted,
          testUserId,
          recipientPubKey,
          senderPubKey,
          recipientSecKey
        );

        expect(decrypted).toBeNull();
      }
    });
  });
});
