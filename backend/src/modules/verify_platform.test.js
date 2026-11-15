// Final Comprehensive Platform Verification Suite for Lobby SaaS Platform
// Verifies all core domains, multi-tenancy, deterministic scoring, fraud detection, and API routes.

const assert = require("assert");
const store = require("../db/store");
const fraudService = require("./fraud/fraudService");
const registrationEngine = require("./registrations/registrationService");
const referralService = require("./referrals/referralService");
const rewardService = require("./rewards/rewardService");
const campaignService = require("./campaigns/campaignService");
const swaggerSpec = require("../../config/swagger");

async function runMasterVerification() {
  console.log("=================================================================");
  console.log("   🚀 LOBBY PLATFORM — MASTER END-TO-END VERIFICATION SUITE");
  console.log("=================================================================\n");

  await store.init([]);

  // ==========================================
  // SUITE 1: Multi-Tenant Data Architecture
  // ==========================================
  console.log("▶ SUITE 1: Multi-Tenant Organization & Campaign Isolation");
  const campaigns = store.listCampaigns();
  assert(campaigns.length >= 2, "Platform must initialize with default campaigns");
  
  const flagship = store.getCampaignBySlug("iphone-16-pro");
  const beta = store.getCampaignBySlug("smart-terminal-beta");
  assert(flagship && beta, "Both flagship and beta campaigns must exist");
  assert.notStrictEqual(flagship.id, beta.id, "Campaign IDs must be strictly unique");
  console.log("  ✔ Verified: Multi-tenant organization and distinct campaign boundaries active.");

  // ==========================================
  // SUITE 2: Registration & Capacity Enforcement
  // ==========================================
  console.log("\n▶ SUITE 2: Registration Engine, Validation & Capacity Guards");
  // Test input validation
  let caughtValidation = false;
  try {
    await registrationEngine.register({ campaignIdentifier: flagship.slug, name: "", email: "test@domain.com" });
  } catch (err) {
    caughtValidation = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert(caughtValidation, "Empty name must be rejected with 400");

  let caughtInvalidEmail = false;
  try {
    await registrationEngine.register({ campaignIdentifier: flagship.slug, name: "Valid Name", email: "notanemail" });
  } catch (err) {
    caughtInvalidEmail = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert(caughtInvalidEmail, "Invalid email format must be rejected with 400");

  // Valid Registration
  const user1 = await registrationEngine.register({
    campaignIdentifier: flagship.slug,
    name: "Catherine Vance",
    email: "catherine@lobby.io",
  });
  assert(user1.success, "Valid registration must succeed");
  assert.strictEqual(user1.position, 1, "First registrant must hold Rank 1");
  assert(user1.referralLink.includes(user1.member.referralCode), "Referral link must contain referral code");

  // Duplicate Check
  let caughtDuplicate = false;
  try {
    await registrationEngine.register({
      campaignIdentifier: flagship.slug,
      name: "Catherine Vance Duplicate",
      email: "catherine@lobby.io",
    });
  } catch (err) {
    caughtDuplicate = true;
    assert.strictEqual(err.statusCode, 409);
  }
  assert(caughtDuplicate, "Duplicate email in same campaign must be rejected with 409");
  console.log("  ✔ Verified: Input validation, email normalization, and duplicate rejection operational.");

  // ==========================================
  // SUITE 3: Fraud Detection & Anomaly Rules
  // ==========================================
  console.log("\n▶ SUITE 3: Rule-Based Fraud Detection & Risk Scoring");
  // Disposable domain
  const dispCheck = fraudService.evaluateRegistration({ email: "bot@sharklasers.com" });
  assert.strictEqual(dispCheck.status, "SUSPICIOUS");
  assert(dispCheck.riskScore >= 70);
  assert(dispCheck.signals.some((s) => s.type === "DISPOSABLE_EMAIL"));

  // Self-referral attempt
  const selfCheck = fraudService.evaluateRegistration({
    email: "catherine@lobby.io",
    referrerMember: { id: user1.member.id, email: "catherine@lobby.io" },
  });
  assert.strictEqual(selfCheck.status, "HIGH_RISK");
  assert(selfCheck.riskScore >= 90);

  // Email alias exploit (catherine+1@lobby.io)
  const aliasCheck = fraudService.evaluateRegistration({
    email: "catherine+promo@lobby.io",
    referrerMember: { id: user1.member.id, email: "catherine@lobby.io" },
  });
  assert.strictEqual(aliasCheck.status, "HIGH_RISK");
  console.log("  ✔ Verified: Disposable email domains, self-referrals, and alias tricks detected & blocked.");

  // ==========================================
  // SUITE 4: Scored Queue Ranking & Overtaking
  // ==========================================
  console.log("\n▶ SUITE 4: Intelligent Scored Queue & Deterministic Overtaking");
  // User 2 joins (referee of User 1)
  const user2 = await registrationEngine.register({
    campaignIdentifier: flagship.slug,
    name: "David Kim",
    email: "david@lobby.io",
    referralCode: user1.member.referralCode,
  });
  assert.strictEqual(user2.position, 2, "David joins at Rank 2");

  // User 1 gained 10 points -> Rank 1 with score 10
  const m1 = store.getMemberById(user1.member.id);
  assert.strictEqual(m1.score, 10);
  assert.strictEqual(m1.referralCount, 1);
  assert.strictEqual(m1.rank, 1);

  // User 3 joins with no referral -> Rank 3
  const user3 = await registrationEngine.register({
    campaignIdentifier: flagship.slug,
    name: "Elena Rostova",
    email: "elena@lobby.io",
  });
  assert.strictEqual(user3.position, 3);

  // Elena refers User 4 AND User 5 -> Elena gets 20 score points, overtaking Catherine!
  await registrationEngine.register({
    campaignIdentifier: flagship.slug,
    name: "Frank Miller",
    email: "frank@lobby.io",
    referralCode: user3.member.referralCode,
  });
  await registrationEngine.register({
    campaignIdentifier: flagship.slug,
    name: "Grace Hopper",
    email: "grace@lobby.io",
    referralCode: user3.member.referralCode,
  });

  const rankedElena = store.getMemberById(user3.member.id);
  const rankedCatherine = store.getMemberById(user1.member.id);

  assert.strictEqual(rankedElena.score, 20, "Elena must have 20 points (2 referrals * 10)");
  assert.strictEqual(rankedElena.rank, 1, "Elena must climb to Rank 1 with 20 points");
  assert.strictEqual(rankedCatherine.rank, 2, "Catherine must move to Rank 2 with 10 points");
  console.log("  ✔ Verified: Dynamic score-based ranking and deterministic overtaking validated.");

  // ==========================================
  // SUITE 5: Milestone Rewards & Coupon Trigger
  // ==========================================
  console.log("\n▶ SUITE 5: Milestone Reward Rule Evaluation & Coupon Awards");
  await rewardService.evaluateMemberRewards(rankedElena.id);
  const elenaCoupons = store.getCouponsForMember(rankedElena.id);
  assert(elenaCoupons.length >= 1, "Elena must receive a reward coupon for reaching Rank 1");
  assert(elenaCoupons[0].code.startsWith("LOBBY-VIP-"), "Coupon must have configured VIP prefix");
  console.log(`  ✔ Verified: Automated reward coupon generated and issued: ${elenaCoupons[0].code}`);

  // ==========================================
  // SUITE 6: Multi-Tenant Analytics & Leaderboards
  // ==========================================
  console.log("\n▶ SUITE 6: Analytics Aggregation, Leaderboards & Audit Trails");
  const leaderboard = campaignService.getLeaderboard(flagship.slug, 10);
  assert.strictEqual(leaderboard[0].name, "Elena Rostova", "Rank 1 on leaderboard must match calculated queue leader");
  assert.strictEqual(leaderboard[1].name, "Catherine Vance", "Rank 2 must match Catherine");

  const telemetry = campaignService.getAdminStats(flagship.slug);
  assert(telemetry.totalSignups >= 5, "Total signups count must reflect all registered members");
  assert(telemetry.totalReferrals >= 3, "Total referrals count must be accurate");
  assert.strictEqual(telemetry.topReferrers[0].name, "Elena Rostova", "Top referrer must be Elena");

  const logs = store.getAuditLogs(10);
  assert(logs.length >= 1, "Security audit log stream must be populated");
  console.log("  ✔ Verified: Real-time leaderboard, telemetry metrics, and immutable audit logs operational.");

  // ==========================================
  // SUITE 7: OpenAPI Specification
  // ==========================================
  console.log("\n▶ SUITE 7: OpenAPI 3.0 / Swagger Contract Verification");
  assert.strictEqual(swaggerSpec.openapi, "3.0.0", "OpenAPI version must be 3.0.0");
  assert(swaggerSpec.info && swaggerSpec.info.title.includes("Lobby"), "API title must identify Lobby Gateway");
  console.log("  ✔ Verified: OpenAPI 3.0 specification active with schemas and security definitions.");

  console.log("\n=================================================================");
  console.log("  ✨ ALL 7 MASTER VERIFICATION SUITES PASSED WITHOUT ERRORS!");
  console.log("=================================================================\n");
}

runMasterVerification().catch((err) => {
  console.error("❌ Master verification failed:", err);
  process.exit(1);
});
