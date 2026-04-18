import { Schema, model } from "mongoose";
import type { UserProps } from "../types.ts";

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
  },
  avatar: {
    type: String,
    default: "",
  },
  created: {
    type: Date,
    default: Date.now,
  },
  expoPushToken: {
    type: String,
    default: null,
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  lastSeen: { 
    type: Date, 
    default: null 
  },

});

export default model<UserProps>("User", UserSchema);
