// Registration Engine for Lobby SaaS Platform
const validator = require("validator");
const store = require("../../db/store");
const fraudService = require("../fraud/fraudService");
const referralService = require("../referrals/referralService");
const { sendWelcomeEmail } = require("../../../services/emailService");

class RegistrationEngine {
  /**
   * Registers a customer into a specific campaign with fraud screening,
   * capacity enforcement, and referral attribution.
   */
  async register({ campaignIdentifier = "iphone-16-pro", name, email, referralCode = null, ipAddress = "127.0.0.1", io = null }) {
    // 1. Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      const err = new Error("Full name is required.");
      err.statusCode = 400;
      throw err;
    }
    if (!email || !validator.isEmail(email)) {
      const err = new Error("A valid email address is required.");
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Resolve Campaign
    let campaign = store.getCampaignBySlug(campaignIdentifier) || store.getCampaignById(campaignIdentifier);
    if (!campaign) {
      // Default to flagship campaign if unspecified
      campaign = store.getCampaignBySlug("iphone-16-pro") || store.listCampaigns()[0];
    }
    if (!campaign) {
      const err = new Error("Target campaign not found.");
      err.statusCode = 404;
      throw err;
    }

    // 3. Campaign Status & Time Window
    if (campaign.status !== "ACTIVE") {
      const err = new Error(`Registration is currently ${campaign.status.toLowerCase()} for this campaign.`);
      err.statusCode = 403;
      throw err;
    }

    const now = new Date();
    if (campaign.registrationStart && now < new Date(campaign.registrationStart)) {
      const err = new Error("Registration for this campaign has not opened yet.");
      err.statusCode = 403;
      throw err;
    }
    if (campaign.registrationEnd && now > new Date(campaign.registrationEnd)) {
      const err = new Error("Registration for this campaign has concluded.");
      err.statusCode = 403;
      throw err;
    }

    // 4. Capacity Enforcement
    if (campaign.maxCapacity && campaign.currentCount >= campaign.maxCapacity) {
      const err = new Error("This campaign has reached its maximum registration capacity.");
      err.statusCode = 403;
      throw err;
    }

    // 5. Duplicate Check
    const existing = store.getMemberByEmail(campaign.id, normalizedEmail);
    if (existing) {
      const err = new Error("This email is already registered in this campaign.");
      err.statusCode = 409;
      throw err;
    }

    // 6. Pre-Registration Fraud Evaluation
    const fraudEval = fraudService.evaluateRegistration({
      email: normalizedEmail,
      ipAddress,
    });

    // 7. Create Campaign Member
    const member = store.createMember({
      campaignId: campaign.id,
      email: normalizedEmail,
      name: name.trim(),
      referredByCode: referralCode || null,
      metadata: { ipAddress, fraudStatus: fraudEval.status, riskScore: fraudEval.riskScore },
    });

    if (fraudEval.status === "HIGH_RISK") {
      store.recordFraudSignal({
        campaignId: campaign.id,
        campaignMemberId: member.id,
        signalType: "HIGH_RISK_REGISTRATION",
        riskScore: fraudEval.riskScore,
        details: { signals: fraudEval.signals },
      });
    }

    // 8. Process Referral Attribution if Code Provided
    let referralResult = null;
    if (referralCode) {
      referralResult = await referralService.processReferralAttribution({
        campaignId: campaign.id,
        refereeMember: member,
        referralCode: referralCode.trim(),
        ipAddress,
      });
    }

    // 9. Build Referral Link URL
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const referralLink = `${baseUrl}/referral/${member.referralCode}`;

    // 10. Non-blocking Welcome Email
    sendWelcomeEmail(normalizedEmail, member.name, referralLink, member.rank).catch((err) =>
      console.error(`[RegistrationEngine] Welcome email failed for ${normalizedEmail}:`, err.message)
    );

    // 11. Real-time Event Notification (Socket.io)
    if (io) {
      io.emit("signup-count", { campaignSlug: campaign.slug, count: campaign.currentCount });
      if (referralResult && referralResult.status === "APPROVED") {
        const referrer = store.getMemberById(referralResult.referrerMemberId);
        if (referrer) {
          io.emit("position-update", { email: referrer.email, newPosition: referrer.rank, score: referrer.score });
        }
      }
    }

    return {
      success: true,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        rank: member.rank,
        score: member.score,
        referralCode: member.referralCode,
        referralLink,
      },
      position: member.rank,
      referralLink,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
      },
    };
  }
}

module.exports = new RegistrationEngine();
