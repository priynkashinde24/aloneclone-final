import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:Priyanka%4098@cluster0.mzws36m.mongodb.net/revocart';

export const connectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    // Validate MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      const error = new Error('MONGODB_URI environment variable is not set!');
      console.error('❌ MONGODB_URI environment variable is not set!');
      console.error('📝 Please add MONGODB_URI to your environment variables');
      console.error('   Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/revocart');
      // In serverless mode, throw error instead of exiting
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw error;
      }
      process.exit(1);
    }

    // Sanitize and validate connection string
    let connectionString = process.env.MONGODB_URI.trim();
    
    // Check if MONGODB_URI is a placeholder
    if (connectionString.includes('username:password') || 
        (connectionString.includes('cluster.mongodb.net') && 
         !connectionString.match(/@[a-z0-9]+\.mongodb\.net/))) {
      const error = new Error('MONGODB_URI appears to be a placeholder!');
      console.error('❌ MONGODB_URI appears to be a placeholder!');
      console.error('📝 Please replace it with your actual MongoDB Atlas connection string');
      console.error('   Current value:', connectionString.replace(/:[^:@]+@/, ':****@'));
      // In serverless mode, throw error instead of exiting
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw error;
      }
      process.exit(1);
    }

    // Validate connection string format
    if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
      const error = new Error('Invalid MONGODB_URI format!');
      console.error('❌ Invalid MONGODB_URI format!');
      console.error('   Connection string must start with "mongodb://" or "mongodb+srv://"');
      console.error('   Current value:', connectionString.substring(0, 50) + '...');
      // In serverless mode, throw error instead of exiting
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw error;
      }
      process.exit(1);
    }

    // Ensure database name is in the connection string
    if (!connectionString.includes('/') || connectionString.endsWith('/')) {
      const error = new Error('Invalid MONGODB_URI format! Database name missing');
      console.error('❌ Invalid MONGODB_URI format!');
      console.error('   Connection string must include database name after the host');
      console.error('   Example: mongodb+srv://user:pass@cluster.mongodb.net/revocart');
      // In serverless mode, throw error instead of exiting
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw error;
      }
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log('   URI:', connectionString.replace(/:[^:@]+@/, ':****@'));
    
    // Extract host and database name from connection string for logging
    const uriMatch = connectionString.match(/mongodb\+srv?:\/\/[^@]+@([^\/]+)\/([^?]+)/);
    const hostFromUri = uriMatch ? uriMatch[1] : 'unknown';
    const dbNameFromUri = uriMatch ? uriMatch[2] : 'revocart';
    
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout (matches error message)
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Maintain at least 1 socket connection
    });

    // Access connection info - use connection properties if available, otherwise use parsed URI
    const connection = mongoose.connection;
    const host = connection.host || hostFromUri;
    const dbName = connection.name || dbNameFromUri;
    
    console.log(`✅ MongoDB Connected`);
    console.log(`   Host: ${host}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Ready State: ${connection.readyState} (1=connected)`);
  } catch (error: any) {
    console.error('\n❌ Error connecting to MongoDB:');
    console.error('   Error Code:', error.code || 'UNKNOWN');
    console.error('   Error Message:', error.message || 'No message');
    
    // Show the connection string (masked) for debugging
    const maskedUri = process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':****@') || 'not set';
    console.error('   Connection String:', maskedUri);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n   ⚠️  Connection refused - trying to connect to localhost:27017');
      console.error('   This means MONGODB_URI is not set or is invalid.');
      console.error('\n📝 Solution:');
      console.error('   1. Check your .env file has a valid MONGODB_URI');
      console.error('   2. Make sure it\'s a MongoDB Atlas connection string (mongodb+srv://...)');
      console.error('   3. Replace any placeholder values with your actual credentials');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n   ⚠️  DNS lookup failed or connection timed out');
      console.error('   This usually means:');
      console.error('   - The cluster hostname is incorrect');
      console.error('   - Network/IP whitelist is blocking your connection');
      console.error('   - The cluster is paused or not accessible');
      console.error('\n📝 Solutions:');
      console.error('   1. Check MongoDB Atlas → Network Access → Add your IP (or 0.0.0.0/0 for testing)');
      console.error('   2. Verify the cluster hostname in your connection string is correct');
      console.error('   3. Check if your MongoDB Atlas cluster is running (not paused)');
    } else if (error.code === 'EAUTH' || error.message?.includes('authentication')) {
      console.error('\n   ⚠️  Authentication failed');
      console.error('   This means your username or password is incorrect.');
      console.error('\n📝 Solutions:');
      console.error('   1. Verify your database username in MongoDB Atlas → Database Access');
      console.error('   2. Make sure you replaced <password> with your actual password');
      console.error('   3. URL-encode special characters in password (e.g., @ becomes %40)');
      console.error('   4. Check if the database user has proper permissions');
    } else if (error.message?.includes('Invalid connection string') || error.message?.includes('Invalid URI')) {
      console.error('\n   ⚠️  Invalid connection string format detected');
      console.error('   The connection string is malformed or missing required parts.');
      console.error('\n📝 Common issues:');
      console.error('   1. Missing protocol (must start with mongodb:// or mongodb+srv://)');
      console.error('   2. Missing username or password');
      console.error('   3. Missing @ symbol before hostname');
      console.error('   4. Missing database name after hostname');
      console.error('   5. Extra spaces or newlines in the connection string');
      console.error('\n📝 Correct format:');
      console.error('   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/revocart?retryWrites=true&w=majority');
      console.error('\n📝 Check your .env file:');
      console.error('   1. Open api/.env');
      console.error('   2. Find the MONGODB_URI line');
      console.error('   3. Make sure it\'s all on one line (no line breaks)');
      console.error('   4. Ensure it starts with mongodb+srv://');
      console.error('   5. Remove any extra spaces or text');
    } else if (error.message?.includes('cluster0.tmaqm0h.mongodb.net')) {
      console.error('\n   ⚠️  Specific cluster connection issue detected');
      console.error('   Your connection string points to: cluster0.tmaqm0h.mongodb.net');
      console.error('\n📝 Check these in MongoDB Atlas:');
      console.error('   1. Go to https://cloud.mongodb.com/');
      console.error('   2. Select your cluster');
      console.error('   3. Click "Connect" → Check if cluster is running (not paused)');
      console.error('   4. Go to "Network Access" → Ensure your IP is whitelisted (0.0.0.0/0 for testing)');
      console.error('   5. Go to "Database Access" → Verify user exists and password is correct');
    } else {
      console.error('\n   ⚠️  Unexpected error occurred');
      if (error.message) {
        console.error(`   Details: ${error.message}`);
      }
    }
    
    console.error('\n📝 General Troubleshooting Steps:');
    console.error('   1. ✅ Verify MONGODB_URI in Vercel Environment Variables (check for typos)');
    console.error('   2. ✅ Check MongoDB Atlas cluster status (should be running, not paused)');
    console.error('   3. ✅ Verify Network Access → Add IP Address (0.0.0.0/0 for Vercel)');
    console.error('   4. ✅ Check Database Access → User exists with correct password');
    console.error('   5. ✅ URL-encode special characters in password (@ → %40, # → %23, etc.)');
    console.error('   6. ✅ Redeploy after updating environment variables');
    console.error('\n🔗 MongoDB Atlas Dashboard: https://cloud.mongodb.com/');
    
    // In serverless mode, throw error instead of exiting
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw error;
    }
    process.exit(1);
  }
};

