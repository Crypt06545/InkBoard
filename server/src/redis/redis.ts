import 'dotenv/config';
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

redis
  .ping()
  .then(() => console.log('✅ Redis connected'))
  .catch((err: Error) =>
    console.error('❌ Redis connection failed:', err.message),
  );
