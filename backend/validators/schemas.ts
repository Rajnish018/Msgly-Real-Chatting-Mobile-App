// Backend input validation schemas - Add to backend/validators/schemas.ts
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .trim(),
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional(),
  publicEncryptionKey: z
    .string()
    .optional(),
  encryptedPrivateKeyBackup: z
    .object({
      ciphertext: z.string().min(1),
      nonce: z.string().min(1),
    })
    .optional(),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export const CreateConversationSchema = z.object({
  name: z
    .string()
    .min(1, 'Conversation name is required')
    .max(100, 'Conversation name must not exceed 100 characters')
    .trim(),
  participantEmails: z
    .array(z.string().email())
    .min(1, 'At least one participant is required'),
  isGroup: z.boolean().default(false),
});

export const SendMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must not exceed 5000 characters')
    .trim(),
  conversationId: z.string().nonempty('Conversation ID is required'),
  disappearAfterRead: z.boolean().default(false),
});

export const UpdateUserSettingsSchema = z.object({
  language: z.enum(['en', 'es', 'fr', 'de', 'hi']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  notificationsEnabled: z.boolean().optional(),
  twoStepVerificationEnabled: z.boolean().optional(),
});

// Type exports for TypeScript
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;
