/**
 * One-time script to set a user as admin.
 * Usage: npx tsx scripts/set-admin.ts
 */
import 'dotenv/config';
import '../api/_lib/dns-fix.js';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Set the first user as admin (or pass a username as CLI arg)
  const targetUsername = process.argv[2];
  const filter = targetUsername ? { username: targetUsername } : {};

  const result = await db.collection('users').findOneAndUpdate(
    filter,
    { $set: { role: 'admin' } },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
  );

  if (result) {
    console.log(`Set ${result.username} (${result.displayName}) as admin`);
  } else {
    console.log('No user found');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
