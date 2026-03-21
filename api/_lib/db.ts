import dns from 'dns';
import mongoose from 'mongoose';

// Force Google DNS so SRV lookups work regardless of local router DNS
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

declare global {
  // eslint-disable-next-line no-var
  var __mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

if (!global.__mongoose) {
  global.__mongoose = { conn: null, promise: null };
}

const cached = global.__mongoose;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');

    cached.promise = mongoose.connect(uri, {
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 15000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
