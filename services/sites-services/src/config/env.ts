import 'dotenv/config';

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/sites_db',
  
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // API
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  
  // Cache
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Helpers
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

