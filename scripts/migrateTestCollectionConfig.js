// Safe, idempotent migration for legacy test catalogue records.
// Run with: node scripts/migrateTestCollectionConfig.js --apply
// Without --apply this only reports the number of records that need review.
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('Missing MONGODB_URI or MONGO_URL');
  process.exit(1);
}

const Test = mongoose.model('Test', new mongoose.Schema({}, { strict: false, collection: 'tests' }));

async function migrate() {
  await mongoose.connect(uri);
  const collection = Test.collection;
  const missingRequirementCount = await collection.countDocuments({ requires_specimen_collection: { $exists: false } });
  const missingReviewStatusCount = await collection.countDocuments({ collection_config_status: { $exists: false } });
  console.log(`Tests without an explicit collection requirement: ${missingRequirementCount}`);
  console.log(`Tests without a collection review status: ${missingReviewStatusCount}`);

  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Review catalogue records, then rerun with --apply to flag them for configuration.');
    return;
  }

  const requirementResult = await collection.updateMany(
    { requires_specimen_collection: { $exists: false } },
    { $set: { requires_specimen_collection: false } }
  );
  const statusResult = await collection.updateMany(
    { collection_config_status: { $exists: false } },
    { $set: { collection_config_status: 'needs_review' } }
  );
  const priorityResult = await collection.updateMany(
    { collection_priority: { $exists: false } },
    { $set: { collection_priority: 'routine' } }
  );
  console.log(`Set a neutral false value on ${requirementResult.modifiedCount} legacy records; all remain marked needs_review.`);
  console.log(`Flagged ${statusResult.modifiedCount} legacy records for collection configuration.`);
  console.log(`Applied routine as the neutral default priority to ${priorityResult.modifiedCount} records.`);
}

migrate().catch((error) => {
  console.error('Test collection configuration migration failed:', error);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
