// Master Modular API Router for Lobby SaaS Platform
const express = require("express");
const router = express.Router();

const registrationEngine = require("../modules/registrations/registrationService");
const campaignService = require("../modules/campaigns/campaignService");
const referralService = require("../modules/referrals/referralService");
const { requireAdminAuth } = require("../common/middleware/auth");
const store = require("../db/store");

// ==========================================
// 1. PUBLIC CAMPAIGN ROUTES
// ==========================================

// List all active campaigns
router.get("/v1/campaigns", (req, res) => {
  const campaigns = campaignService.listCampaigns().map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    status: c.status,
    currentCount: c.currentCount,
    maxCapacity: c.maxCapacity,
  }));
  res.json({ success: true, campaigns });
});

// Get single campaign details
router.get("/v1/campaigns/:slug", (req, res) => {
  const campaign = campaignService.getCampaign(req.params.slug);
  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found." });
  }
  res.json({
    success: true,
    campaign: {
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      description: campaign.description,
      status: campaign.status,
      currentCount: campaign.currentCount,
      maxCapacity: campaign.maxCapacity,
      registrationStart: campaign.registrationStart,
      registrationEnd: campaign.registrationEnd,
    },
  });
});

// Public Leaderboard for a campaign
router.get("/v1/campaigns/:slug/leaderboard", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const leaderboard = campaignService.getLeaderboard(req.params.slug, limit);
  res.json({ success: true, leaderboard });
});

// ==========================================
// 2. REGISTRATION & STANDING ROUTES
// ==========================================

// Register for a specific campaign (v1 endpoint)
router.post("/v1/campaigns/:slug/register", async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const result = await registrationEngine.register({
      campaignIdentifier: req.params.slug,
      name: req.body.name,
      email: req.body.email,
      referralCode: req.body.referralCode,
      ipAddress,
      io,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// Lookup standing in a specific campaign (v1 endpoint)
router.get("/v1/campaigns/:slug/members/:email", (req, res) => {
  const standing = campaignService.getMemberStanding(req.params.slug, req.params.email);
  if (!standing) {
    return res.status(404).json({ success: false, message: "No registration found for this email address." });
  }
  res.json({ success: true, member: standing });
});

// ==========================================
// 3. BACKWARD-COMPATIBLE LEGACY ROUTES
// ==========================================

// Legacy POST /api/customers/signup -> Maps to Flagship Campaign
router.post("/customers/signup", async (req, res) => {
  try {
    const io = req.app.get("io");
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const result = await registrationEngine.register({
      campaignIdentifier: "iphone-16-pro",
      name: req.body.name,
      email: req.body.email,
      referralCode: req.body.referralCode,
      ipAddress,
      io,
    });
    // Return backward-compatible shape expected by tests and UI
    res.status(201).json({
      message: "Signed up successfully! Check your email for confirmation.",
      position: result.position,
      referralLink: result.referralLink,
      member: result.member,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Legacy GET /api/customers/position/:email
router.get("/customers/position/:email", (req, res) => {
  const standing = campaignService.getMemberStanding("iphone-16-pro", req.params.email);
  if (!standing) {
    return res.status(404).json({ message: "Customer not found." });
  }
  res.json({
    position: standing.position,
    referralCount: standing.referralCount,
    referralLink: standing.referralLink,
    coupons: standing.coupons,
    score: standing.score,
  });
});

// ==========================================
// 4. ADMINISTRATIVE & ANALYTICS ROUTES
// ==========================================

// Admin Dashboard Stats (supports ?campaign=slug)
router.get("/admin/stats", requireAdminAuth, (req, res) => {
  const stats = campaignService.getAdminStats(req.query.campaign);
  res.json(stats);
});

router.get("/v1/admin/stats", requireAdminAuth, (req, res) => {
  const stats = campaignService.getAdminStats(req.query.campaign);
  res.json({ success: true, ...stats });
});

// Admin Paginated Customers
router.get("/admin/customers", requireAdminAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const sort = req.query.sort || "position";

  let members = Array.from(store.campaignMembers.values());
  if (sort === "createdAt") {
    members.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === "referralCount") {
    members.sort((a, b) => b.referralCount - a.referralCount);
  } else {
    members.sort((a, b) => a.rank - b.rank);
  }

  const total = members.length;
  const skip = (page - 1) * limit;
  const paginated = members.slice(skip, skip + limit).map((m) => ({
    name: m.name,
    email: m.email,
    position: m.rank,
    score: m.score,
    referralCount: m.referralCount,
    referralCode: m.referralCode,
    fraudStatus: m.fraudStatus,
    createdAt: m.createdAt,
  }));

  res.json({
    customers: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

// Admin: Create Campaign
router.post("/v1/admin/campaigns", requireAdminAuth, (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ success: false, message: "Campaign title is required." });
    }
    const campaign = campaignService.createCampaign(req.body);
    store.recordAudit({
      userId: req.user.id,
      action: "CAMPAIGN_CREATED",
      targetType: "CAMPAIGN",
      targetId: campaign.id,
      details: { title: campaign.title, slug: campaign.slug },
    });
    res.status(201).json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Approve a Referral
router.post("/v1/admin/referrals/:id/approve", requireAdminAuth, async (req, res) => {
  try {
    const updated = await referralService.approveReferral(req.params.id, req.user.id);
    if (!updated) return res.status(404).json({ success: false, message: "Referral not found." });
    res.json({ success: true, referral: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Reject a Referral
router.post("/v1/admin/referrals/:id/reject", requireAdminAuth, async (req, res) => {
  try {
    const reason = req.body.reason || "Administrative rejection";
    const updated = await referralService.rejectReferral(req.params.id, reason, req.user.id);
    if (!updated) return res.status(404).json({ success: false, message: "Referral not found." });
    res.json({ success: true, referral: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Member Journey & Profile
router.get("/v1/admin/members/:id", requireAdminAuth, (req, res) => {
  try {
    const journey = store.getMemberFullJourney(req.params.id);
    if (!journey) {
      for (const m of store.campaignMembers.values()) {
        if (m.email === req.params.id.toLowerCase().trim()) {
          const j = store.getMemberFullJourney(m.id);
          return res.json({ success: true, ...j });
        }
      }
      return res.status(404).json({ success: false, message: "Member not found." });
    }
    res.json({ success: true, ...journey });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Manual Priority Score Adjustment
router.post("/v1/admin/members/:id/adjust-score", requireAdminAuth, (req, res) => {
  try {
    const delta = parseInt(req.body.delta) || 0;
    const reason = req.body.reason || "Manual priority adjustment";
    const updated = store.adjustMemberScore(req.params.id, delta, reason, req.user?.id);
    if (!updated) return res.status(404).json({ success: false, message: "Member not found." });
    res.json({ success: true, member: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Update Member Status / Verification
router.post("/v1/admin/members/:id/status", requireAdminAuth, (req, res) => {
  try {
    const { status, fraudStatus, reason } = req.body;
    const updated = store.updateMemberStatus(req.params.id, status, fraudStatus, reason, req.user?.id);
    if (!updated) return res.status(404).json({ success: false, message: "Member not found." });
    res.json({ success: true, member: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: List All Referrals
router.get("/v1/admin/referrals", requireAdminAuth, (req, res) => {
  try {
    const referrals = store.listAllReferrals(req.query.campaignId);
    res.json({ success: true, referrals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: List All Rewards & Coupons
router.get("/v1/admin/coupons", requireAdminAuth, (req, res) => {
  try {
    const coupons = store.listAllCoupons(req.query.campaignId);
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Issue Manual Coupon
router.post("/v1/admin/coupons/issue", requireAdminAuth, (req, res) => {
  try {
    const { memberId, prefix } = req.body;
    if (!memberId) return res.status(400).json({ success: false, message: "memberId is required." });
    const coupon = store.issueCoupon({ campaignMemberId: memberId, prefix: prefix || "LOBBY-VIP-" });
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Fraud Signals & Risk Overview
router.get("/v1/admin/fraud", requireAdminAuth, (req, res) => {
  try {
    const signals = store.listFraudSignals(req.query.campaignId);
    const flaggedMembers = Array.from(store.campaignMembers.values())
      .filter((m) => m.fraudStatus !== "CLEAN")
      .map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        score: m.score,
        rank: m.rank,
        fraudStatus: m.fraudStatus,
        createdAt: m.createdAt,
      }));
    res.json({ success: true, signals, flaggedMembers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Audit Logs
router.get("/v1/admin/audit-logs", requireAdminAuth, (req, res) => {
  try {
    const logs = store.getAuditLogs(parseInt(req.query.limit) || 100);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Export Waitlist to CSV
router.get("/v1/admin/export", requireAdminAuth, (req, res) => {
  try {
    const campaignId = req.query.campaignId;
    let members = Array.from(store.campaignMembers.values());
    if (campaignId) {
      members = members.filter((m) => m.campaignId === campaignId);
    }
    members.sort((a, b) => a.rank - b.rank);

    let csv = "Rank,Name,Email,Score,Referrals,ReferralCode,FraudStatus,Status,CreatedAt\n";
    for (const m of members) {
      const row = [
        m.rank,
        `"${(m.name || "").replace(/"/g, '""')}"`,
        `"${m.email}"`,
        m.score,
        m.referralCount,
        m.referralCode,
        m.fraudStatus,
        m.status,
        m.createdAt ? new Date(m.createdAt).toISOString() : "",
      ].join(",");
      csv += row + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="lobby-waitlist-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
