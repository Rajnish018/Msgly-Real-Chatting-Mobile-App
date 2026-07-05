import mongoose, { Schema, Types } from "mongoose";

export interface BlockProps {
  blockerId: Types.ObjectId;
  blockedId: Types.ObjectId;
  created?: Date;
}

const BlockSchema = new Schema<BlockProps>(
  {
    blockerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blockedId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    created: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// COMPOUND INDEXES FOR MAXIMUM LOOKUP PERFORMANCE
BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
BlockSchema.index({ blockedId: 1 });

export default mongoose.model<BlockProps>("Block", BlockSchema);
