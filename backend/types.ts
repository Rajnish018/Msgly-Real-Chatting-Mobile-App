import { Document, Types } from "mongoose";

export interface UserProps extends Document {
  _id: Types.ObjectId; 
  email: string;
  password: string;
  name?: string;
  avatar?: string;
  created?: Date;
  isOnline?:Boolean,
  lastSeen?:Date,
  expoPushToken?: string;
}

export interface ConversationProps extends Document {
  _id: Types.ObjectId;
  type: "direct" | "group";
  name?: string;
  participants: Types.ObjectId[]; 
  lastMessage?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PopulatedUser = {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  avatar?: string;
  expoPushToken?: string | null;
};

export interface PushNotificationParams {
  expoPushToken: string;
  title: string;
  body: string;
  data?: any;
}
