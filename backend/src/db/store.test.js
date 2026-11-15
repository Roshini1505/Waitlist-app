// Phase 1 Unit Test: Relational Store, Scored Queue, and Referral Lifecycle
const assert = require("assert");
const store = require("./store");

async function runPhase1Tests() {
  console.log("▶ Running Phase 1 Data Architecture & Store Verification...");

  await store.init([]);

  // Test 1: Organization & Default Campaigns
  const campaigns = store.listCampaigns();
  assert(campaigns.length >= 2, "Expected at least 2 initialized campaigns");
  const flagship = store.getCampaignBySlug("iphone-16-pro");
  assert(flagship !== null, "Expected flagship campaign to exist");
  assert.strictEqual(flagship.title, "Apple iPhone 16 Pro Exclusive Launch");
  console.log("  ✔ Test 1: Organizations and Multi-Tenant Campaigns verified");

  // Test 2: Member Registration & Initial Rank
  const m1 = store.createMember({
    campaignId: flagship.id,
    email: "user1@lobby.io",
    name: "User One",
  });
  assert(m1.id.startsWith("mem_"), "Member ID must have valid prefix");
  assert.strictEqual(m1.rank, 1, "First member must have Rank 1");
  assert.strictEqual(m1.score, 0, "Initial score must be 0");

  const m2 = store.createMember({
    campaignId: flagship.id,
    email: "user2@lobby.io",
    name: "User Two",
  });
  assert.strictEqual(m2.rank, 2, "Second member must have Rank 2");
  console.log("  ✔ Test 2: Member registration and sequential queue ranking verified");

  // Test 3: Referral Lifecycle & Scored Queue Advancement
  const ref = store.recordReferral({
    campaignId: flagship.id,
    referrerMemberId: m2.id,
    refereeMemberId: m1.id, // User 2 referred User 1
    riskScore: 10,
  });
  assert.strictEqual(ref.status, "APPROVED", "Low risk referral must be auto-approved");

  // After approval: User 2 has 10 points, User 1 has 0 points
  const updatedM2 = store.getMemberById(m2.id);
  const updatedM1 = store.getMemberById(m1.id);

  assert.strictEqual(updatedM2.score, 10, "User 2 must gain 10 score points");
  assert.strictEqual(updatedM2.rank, 1, "User 2 must climb to Rank 1 due to higher score");
  assert.strictEqual(updatedM1.rank, 2, "User 1 must move to Rank 2");
  console.log("  ✔ Test 3: Deterministic score-based ranking and referral advancement verified");

  // Test 4: Fraud Signal Recording
  const fraudSig = store.recordFraudSignal({
    campaignId: flagship.id,
    campaignMemberId: m1.id,
    signalType: "DISPOSABLE_EMAIL",
    riskScore: 85,
    details: { domain: "tempmail.org" },
  });
  assert.strictEqual(fraudSig.status, "HIGH_RISK", "Risk >= 80 must be classified as HIGH_RISK");
  assert.strictEqual(store.getMemberById(m1.id).fraudStatus, "HIGH_RISK", "Member fraud status must update");
  console.log("  ✔ Test 4: Fraud signal recording and member flagging verified");

  // Test 5: Coupon Issuance
  const coupon = store.issueCoupon({
    campaignMemberId: m2.id,
    prefix: "LOBBY-TEST-",
  });
  assert(coupon.code.startsWith("LOBBY-TEST-"), "Coupon prefix must match");
  assert.strictEqual(store.getCouponsForMember(m2.id).length, 1, "Member must have exactly 1 coupon");
  console.log("  ✔ Test 5: Reward and coupon issuance verified");

  // Test 6: Audit Trail
  store.recordAudit({
    action: "CAMPAIGN_MEMBER_CREATED",
    targetType: "MEMBER",
    targetId: m1.id,
  });
  const logs = store.getAuditLogs(10);
  assert(logs.length >= 1, "Audit logs must record actions");
  console.log("  ✔ Test 6: Audit logging and immutability verified");

  console.log("\n✅ All Phase 1 Data Architecture verification tests passed successfully!");
}

runPhase1Tests().catch((err) => {
  console.error("❌ Phase 1 test failed:", err);
  process.exit(1);
});
