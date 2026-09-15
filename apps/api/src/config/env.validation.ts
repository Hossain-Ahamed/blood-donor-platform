import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  CORS_ORIGIN: z.string().url(),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = envSchema.safeParse(config);

  if (!validatedConfig.success) {
    console.error('❌ Invalid environment variables:', validatedConfig.error.format());
    process.exit(1);
  }
  return validatedConfig.data;
}

