// Migration Bridge: Bridges legacy flat Customer records into Lobby Multi-Tenant Schema
const Customer = require("../../models/Customer");
const store = require("./store");

async function syncLegacyData() {
  try {
    let legacyCustomers = [];
    try {
      legacyCustomers = await Customer.find().lean().exec();
      console.log(`[MigrationBridge] Fetched ${legacyCustomers.length} existing customer records from MongoDB Atlas.`);
    } catch (dbErr) {
      console.log(`[MigrationBridge] MongoDB Atlas query skipped or offline: ${dbErr.message}`);
    }

    await store.init(legacyCustomers);
    console.log("[MigrationBridge] Store synchronization complete.");
  } catch (err) {
    console.error("[MigrationBridge] Error during sync:", err);
    await store.init([]);
  }
}

module.exports = { syncLegacyData };
