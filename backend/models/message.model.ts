import mongoose from "mongoose";

const encryptedRecipientPayloadSchema = new mongoose.Schema(
  {
    // Legacy fields (optional for backward compatibility)
    ciphertext: {
      type: String,
      required: false,
    },
    nonce: {
      type: String,
      required: false,
    },
    mac: {
      type: String,
      default: null,
    },
    messageNumber: {
      type: Number,
      default: null,
    },
    // Hybrid E2EE fields
    encryptedMessage: {
      type: String,
      required: false,
    },
    encryptedAESKey: {
      type: String,
      required: false,
    },
    iv: {
      type: String,
      required: false,
    },
    keyIv: {
      type: String,
      required: false,
    },
    senderPublicKey: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: String,
    attachment: String,
    encryptedPayloads: {
      type: Map,
      of: encryptedRecipientPayloadSchema,
      default: undefined,
    },
    encryption: {
      scheme: {
        type: String,
        default: null,
      },
      version: {
        type: Number,
        default: null,
      },
      messageNumber: {
        type: Number,
        default: null,
      },
      sessionId: {
        type: String,
        default: null,
      },
      encryptedAt: {
        type: Date,
        default: null,
      },
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    encrypted: {
      type: Boolean,
      default: false,
    },
    deliveredTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    firstSeenAt: {
      type: Date,
      default: null,
    },
    disappearAfterMs: {
      type: Number,
      default: null,
    },
    disappearAt: {
      type: Date,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
