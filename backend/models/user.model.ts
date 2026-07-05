import { Schema, model } from "mongoose";
import { createDefaultUserSettings } from "../Utils/userSettings.js";
import type { UserProps } from "../types.ts";

const isValidAvatar = (value: string) => {
  if (!value) return true;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const UserSchema = new Schema<UserProps>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  avatar: {
    type: String,
    default: "",
    validate: {
      validator: isValidAvatar,
      message: "Avatar must be a valid URL",
    },
  },
  bio: {
    type: String,
    default: "",
    trim: true,
    maxlength: 160,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  fcmToken: {
    type: String,
    default: null,
  },
  language: {
    type: String,
    enum: ["en", "hi", "es"],
    default: "en",
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  mutedConversations: [
    {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
    },
  ],
  privateProfile: {
    type: Boolean,
    default: false,
  },
  showOnlineStatus: {
    type: Boolean,
    default: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  accountStatus: {
    type: String,
    enum: ["active", "deactivated"],
    default: "active",
  },
  deactivatedAt: {
    type: Date,
    default: null,
  },
  scheduledDeletionAt: {
    type: Date,
    default: null,
  },
  publicEncryptionKey: {
    type: String,
    default: null,
  },
  publicEncryptionKeyVersion: {
    type: Number,
    default: 1,
  },
  publicEncryptionKeyUpdatedAt: {
    type: Date,
    default: null,
  },
  encryptedPrivateKeyBackup: {
    ciphertext: {
      type: String,
      default: null,
    },
    nonce: {
      type: String,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  twoStepVerificationPinHash: {
    type: String,
    default: null,
  },
  settings: {
    type: Schema.Types.Mixed,
    default: createDefaultUserSettings,
  },
});

export default model<UserProps>("User", UserSchema);
