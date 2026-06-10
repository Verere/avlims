// Run this script with: node scripts/cleanupLabs.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

const labSchema = new mongoose.Schema({}, { strict: false, collection: 'labs' });
const Lab = mongoose.model('Lab', labSchema);

async function cleanup() {
  await mongoose.connect(uri);
  const result = await Lab.deleteMany({ $or: [ { slug: { $exists: false } }, { owner: { $exists: false } } ] });
  console.log(`Deleted ${result.deletedCount} labs missing slug or owner.`);
  await mongoose.disconnect();
}

cleanup().catch(e => { console.error(e); process.exit(1); });
