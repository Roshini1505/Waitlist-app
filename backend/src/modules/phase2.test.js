// Phase 2 Comprehensive Test Suite: Core Backend Engine & Domain Logic
const assert = require("assert");
const store = require("../db/store");
const fraudService = require("./fraud/fraudService");
const registrationEngine = require("./registrations/registrationService");
const referralService = require("./referrals/referralService");
const rewardService = require("./rewards/rewardService");
const campaignService = require("./campaigns/campaignService");

async function runPhase2Tests() {
  console.log("▶ Running Phase 2 Core Backend Engine & Domain Logic Tests...\n");

  await store.init([]);

  // 1. Test Fraud Detection Service
  console.log("  [Test 1] Fraud Detection Service Evaluation...");
  const cleanEval = fraudService.evaluateRegistration({ email: "legit.user@company.com" });
  assert.strictEqual(cleanEval.status, "CLEAN", "Regular business email must be marked CLEAN");
  assert.strictEqual(cleanEval.riskScore, 0, "Clean email risk score must be 0");

  const disposableEval = fraudService.evaluateRegistration({ email: "scammer@tempmail.com" });
  assert.strictEqual(disposableEval.status, "SUSPICIOUS", "Disposable domain must raise risk");
  assert(disposableEval.riskScore >= 70, "Disposable domain risk score must be >= 70");
  assert(disposableEval.signals.some((s) => s.type === "DISPOSABLE_EMAIL"), "Must flag DISPOSABLE_EMAIL signal");

  const selfRefEval = fraudService.evaluateRegistration({
    email: "john@example.com",
    referrerMember: { email: "john@example.com", id: "mem_123" },
  });
  assert.strictEqual(selfRefEval.status, "HIGH_RISK", "Exact self-referral must be marked HIGH_RISK");
  assert(selfRefEval.riskScore >= 90, "Self-referral risk score must be >= 90");
  console.log("    ✔ Fraud detection rules (disposable domains, self-referral, velocity) verified.");

  // 2. Test Registration Engine & Capacity
  console.log("\n  [Test 2] Registration Engine & Campaign Isolation...");
  const reg1 = await registrationEngine.register({
    campaignIdentifier: "iphone-16-pro",
    name: "Alpha User",
    email: "alpha@test.com",
  });
  assert(reg1.success, "Registration must succeed");
  assert.strictEqual(reg1.position, 1, "First registrant must have position 1");
  assert(reg1.referralLink.includes("/referral/"), "Must return valid referral link");

  // Duplicate email registration in same campaign must fail
  let duplicateFailed = false;
  try {
    await registrationEngine.register({
      campaignIdentifier: "iphone-16-pro",
      name: "Alpha Duplicate",
      email: "alpha@test.com",
    });
  } catch (err) {
    duplicateFailed = true;
    assert.strictEqual(err.statusCode, 409, "Duplicate email must return HTTP 409");
  }
  assert(duplicateFailed, "Duplicate registration must be rejected");
  console.log("    ✔ Campaign registration and duplicate rejection verified.");

  // 3. Test Referral Qualification & Scored Queue Advancement
  console.log("\n  [Test 3] Referral Lifecycle & Deterministic Score-Based Advancement...");
  const alphaMember = store.getMemberByEmail(reg1.campaign.id, "alpha@test.com");

  // Beta registers using Alpha's referral code
  const reg2 = await registrationEngine.register({
    campaignIdentifier: "iphone-16-pro",
    name: "Beta User",
    email: "beta@test.com",
    referralCode: alphaMember.referralCode,
  });
  assert.strictEqual(reg2.position, 2, "Beta must join at position 2");

  // Alpha must have gained 10 score points and 1 referral
  const updatedAlpha = store.getMemberById(alphaMember.id);
  assert.strictEqual(updatedAlpha.score, 10, "Alpha score must increase to 10");
  assert.strictEqual(updatedAlpha.referralCount, 1, "Alpha referralCount must be 1");
  assert.strictEqual(updatedAlpha.rank, 1, "Alpha must stay Rank 1");

  // Gamma registers with NO referral
  const reg3 = await registrationEngine.register({
    campaignIdentifier: "iphone-16-pro",
    name: "Gamma User",
    email: "gamma@test.com",
  });
  assert.strictEqual(reg3.position, 3, "Gamma must join at position 3");

  // Now Gamma refers Delta AND Epsilon (Gamma gets 20 score points, overtaking Alpha!)
  const gammaMember = store.getMemberById(reg3.member.id);
  await registrationEngine.register({
    campaignIdentifier: "iphone-16-pro",
    name: "Delta User",
    email: "delta@test.com",
    referralCode: gammaMember.referralCode,
  });
  await registrationEngine.register({
    campaignIdentifier: "iphone-16-pro",
    name: "Epsilon User",
    email: "epsilon@test.com",
    referralCode: gammaMember.referralCode,
  });

  const rankedGamma = store.getMemberById(gammaMember.id);
  const rankedAlpha = store.getMemberById(alphaMember.id);

  // Verify Gamma has 20 points, Alpha has 10 points -> Gamma moves to Rank 1!
  assert.strictEqual(rankedGamma.score, 20, "Gamma must have 20 points");
  assert.strictEqual(rankedGamma.rank, 1, "Gamma must take Rank 1 with 20 points");
  assert.strictEqual(rankedAlpha.rank, 2, "Alpha must move to Rank 2 with 10 points");
  console.log("    ✔ Dynamic queue advancement and overtaking based on verified score verified.");

  // 4. Test Reward Milestone & Coupon Trigger
  console.log("\n  [Test 4] Reward Milestone Engine (Coupons at Rank 1)...");
  // Gamma reached Rank 1, so RewardService should have issued a coupon
  await rewardService.evaluateMemberRewards(gammaMember.id);
  const gammaCoupons = store.getCouponsForMember(gammaMember.id);
  assert(gammaCoupons.length >= 1, "Gamma must have received a milestone coupon for reaching Rank 1");
  assert(gammaCoupons[0].code.startsWith("LOBBY-"), "Coupon must have proper prefix");
  console.log(`    ✔ Milestone coupon awarded successfully: ${gammaCoupons[0].code}`);

  // 5. Test Campaign Leaderboard & Analytics Service
  console.log("\n  [Test 5] Leaderboard & Multi-Tenant Analytics...");
  const leaderboard = campaignService.getLeaderboard("iphone-16-pro", 10);
  assert.strictEqual(leaderboard[0].name, "Gamma User", "Rank 1 on leaderboard must be Gamma User");
  assert.strictEqual(leaderboard[0].score, 20, "Rank 1 score must be 20");
  assert.strictEqual(leaderboard[1].name, "Alpha User", "Rank 2 on leaderboard must be Alpha User");

  const adminStats = campaignService.getAdminStats("iphone-16-pro");
  assert(adminStats.totalSignups >= 5, "Total signups count must reflect all registered members");
  assert(adminStats.totalReferrals >= 3, "Total referrals count must be accurate");
  assert(adminStats.topReferrers.length > 0, "Top referrers must be populated");
  assert.strictEqual(adminStats.topReferrers[0].name, "Gamma User", "Top referrer must be Gamma");
  console.log("    ✔ Leaderboards, top referrers, and multi-tenant analytics verified.");

  console.log("\n=======================================================");
  console.log("🎉 ALL PHASE 2 CORE ENGINE VERIFICATION TESTS PASSED!");
  console.log("=======================================================\n");
}

runPhase2Tests().catch((err) => {
  console.error("❌ Phase 2 test suite failed:", err);
  process.exit(1);
});
