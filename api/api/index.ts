// Load environment variables first (only in non-production)
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import app from '../src/app';
import { connectDB } from '../src/config/db';
import mongoose from 'mongoose';

// For serverless: connect to DB on cold start
// Connection is cached for subsequent invocations
let connectionPromise: Promise<void> | null = null;

const ensureDBConnection = async (): Promise<void> => {
  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If connection is already in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start connection
  connectionPromise = (async () => {
    try {
      await connectDB();
      console.log('✅ Database connected successfully');
      connectionPromise = null; // Reset so we can reconnect if needed
    } catch (error: any) {
      console.error('❌ Failed to connect to database:', error?.message || error);
      connectionPromise = null; // Allow retry on next request
      throw error;
    }
  })();

  return connectionPromise;
};

// Middleware to ensure DB connection before handling requests
// This must be added to the app BEFORE routes are registered
// We'll add it in app.ts instead to ensure proper order

// Connect to DB in background (non-blocking) for faster first request
ensureDBConnection().catch((error) => {
  console.error('Background DB connection failed:', error?.message || error);
  // Connection will be retried on first request via middleware
});

// Export the Express app as a serverless function for Vercel
// Vercel will handle the request/response
export default app;
