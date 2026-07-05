import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const DELETED_MESSAGE_TEXT = "This message was deleted";

export const getAccountDeletionGraceDays = () => {
  const rawValue = Number(process.env.ACCOUNT_DELETION_GRACE_DAYS || 30);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 30;
};

export const getScheduledDeletionDate = () => {
  const days = getAccountDeletionGraceDays();
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const permanentlyDeleteAccountByUserId = async (userId: string) => {
  const affectedConversations = await Conversation.find({
    participants: userId,
  }).select("_id type participants createdBy");

  await Message.updateMany(
    { senderId: userId },
    {
      $set: {
        isDeleted: true,
        deletedForEveryone: true,
        content: DELETED_MESSAGE_TEXT,
        attachment: "",
        editedAt: new Date(),
      },
    }
  );

  for (const conversation of affectedConversations) {
    const remainingParticipants = (conversation.participants || []).filter(
      (participantId: any) => participantId.toString() !== userId.toString()
    );

    if (conversation.type === "direct" || remainingParticipants.length === 0) {
      await Message.deleteMany({ conversationId: conversation._id });
      await Conversation.findByIdAndDelete(conversation._id);
      continue;
    }

    const latestMessage = await Message.findOne({
      conversationId: conversation._id,
    })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();

    await Conversation.findByIdAndUpdate(conversation._id, {
      participants: remainingParticipants,
      lastMessage: latestMessage?._id || null,
      createdBy:
        conversation.createdBy?.toString?.() === userId ? null : conversation.createdBy,
    });
  }

  await User.findByIdAndDelete(userId);
};

export const purgeExpiredDeactivatedAccounts = async () => {
  const now = new Date();
  const expiredUsers = await User.find({
    accountStatus: "deactivated",
    scheduledDeletionAt: { $lte: now },
  })
    .select("_id")
    .lean();

  for (const user of expiredUsers) {
    await permanentlyDeleteAccountByUserId(user._id.toString());
  }

  return expiredUsers.length;
};
