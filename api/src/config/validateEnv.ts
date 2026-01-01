import dotenv from 'dotenv';

// Load environment variables from .env file ONLY in development/local
// On Vercel, environment variables are automatically available via process.env
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const requiredVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_URI',
  'FRONTEND_URL',
];

export function validateEnv() {
  const missing = requiredVars.filter((k) => !process.env[k]);
  if (missing.length) {
    const errorMessage = `Missing required env vars: ${missing.join(', ')}`;
    console.error(`❌ ${errorMessage}`);
    console.error('📝 Please add these environment variables in Vercel:');
    missing.forEach((key) => {
      console.error(`   - ${key}`);
    });
    
    // In serverless mode, log but don't throw immediately
    // The app will handle missing vars gracefully
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.error('⚠️  Serverless function will continue but may fail on requests');
      // Still throw so the app knows, but it won't crash the module load
      throw new Error(errorMessage);
    }
    
    throw new Error(errorMessage);
  }
}


