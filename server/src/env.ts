import { config as dotenvConfig } from 'dotenv';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
dotenvConfig({ path: join(root, '.env'), quiet: true });

export const env = {
  DATABASE_URL:
    process.env.DATABASE_URL || 'postgres://postgres:darkianmail@localhost:5432/darkianmail',
  DOMAIN_NAME: process.env.DOMAIN_NAME || 'localhost',
  SMTP_BIND_HOST: process.env.SMTP_BIND_HOST || '0.0.0.0',
  SMTP_INBOUND_PORT: parseInt(process.env.SMTP_INBOUND_PORT || '25', 10),
  SMTP_SUBMISSION_PORT: parseInt(process.env.SMTP_SUBMISSION_PORT || '587', 10),
  SMTP_RELAY_HOST: process.env.SMTP_RELAY_HOST || '',
  SMTP_RELAY_PORT: parseInt(process.env.SMTP_RELAY_PORT || '587', 10),
  SMTP_RELAY_USER: process.env.SMTP_RELAY_USER || '',
  SMTP_RELAY_PASS: process.env.SMTP_RELAY_PASS || '',
  SMTP_RELAY_SECURE: process.env.SMTP_RELAY_SECURE === 'true',
  ATTACHMENT_DIR: process.env.ATTACHMENT_DIR || join(root, 'data', 'attachments'),
  PRIVATE_S3_ENDPOINT: process.env.PRIVATE_S3_ENDPOINT || 'http://localhost:9000',
  PRIVATE_S3_ACCESS_KEY: process.env.PRIVATE_S3_ACCESS_KEY || 'minioadmin',
  PRIVATE_S3_SECRET_KEY: process.env.PRIVATE_S3_SECRET_KEY || 'minioadmin',
  PRIVATE_S3_BUCKET: process.env.PRIVATE_S3_BUCKET || 'darkianmail',
  PRIVATE_S3_REGION: process.env.PRIVATE_S3_REGION || 'us-east-1',
  WEBHOOK_BIND_HOST: process.env.WEBHOOK_BIND_HOST || '127.0.0.1',
  WEBHOOK_PORT: parseInt(process.env.WEBHOOK_PORT || '8080', 10),
  SMTP_WEBHOOK_TOKEN: process.env.SMTP_WEBHOOK_TOKEN || '',
  DELIVERY_INTERVAL_MS: parseInt(process.env.DELIVERY_INTERVAL_MS || '30000', 10),
  MAX_MESSAGE_SIZE: parseInt(process.env.MAX_MESSAGE_SIZE || '26214400', 10),
  HELO_NAME: process.env.HELO_NAME || process.env.DOMAIN_NAME || 'localhost'
};

export function isRelayConfigured(): boolean {
  return Boolean(env.SMTP_RELAY_HOST);
}