// Backend environment validation - Add to backend/config/environment.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  mongoUri: string;
  jwtSecret: string;
  allowedOrigins: string[];
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  mailFrom?: string;
  accountDeletionGraceDays: number;
  firebaseServiceAccountPath?: string;
  sentryDsn?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const validateEnv = (): EnvironmentConfig => {
  const errors: string[] = [];

  // Required environment variables
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push('JWT_SECRET is required and must be at least 32 characters long');
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    errors.push('MONGO_URI is required');
  }

  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push('NODE_ENV must be development, production, or test');
  }

  // If production, enforce stricter checks
  if (nodeEnv === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
      errors.push('ALLOWED_ORIGINS is required in production (comma-separated list)');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment Validation Failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  const port = parseInt(process.env.PORT || '3000', 10);

  const config: EnvironmentConfig = {
    nodeEnv,
    port,
    mongoUri: mongoUri as string,
    jwtSecret: jwtSecret as string,
    allowedOrigins,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    mailFrom: process.env.MAIL_FROM,
    accountDeletionGraceDays: parseInt(process.env.ACCOUNT_DELETION_GRACE_DAYS || '30', 10),
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  };

  console.log('✅ Environment validation passed');
  console.log(`   - Environment: ${config.nodeEnv}`);
  console.log(`   - Allowed Origins: ${config.allowedOrigins.join(', ')}`);
  console.log(`   - Server Port: ${config.port}`);

  return config;
};

export const config = validateEnv();
export default config;
