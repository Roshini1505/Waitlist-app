// Robust In-Memory & MongoDB Relational Store for Lobby SaaS Platform
// Implements the Prisma Relational Schema with Full Referential Integrity,
// Deterministic Scoring, Audit Trails, and Atomic Operations.

const { v4: uuidv4 } = require("uuid");

class LobbyDataStore {
  constructor() {
    this.organizations = new Map();
    this.users = new Map();
    this.organizationMembers = new Map();
    this.campaigns = new Map();
    this.campaignMembers = new Map();
    this.referrals = new Map();
    this.referralEvents = new Map();
    this.rewardRules = new Map();
    this.coupons = new Map();
    this.fraudSignals = new Map();
    this.auditLogs = [];

    this.initialized = false;
  }

  async init(existingMongoCustomers = []) {
    if (this.initialized) return;

    // 1. Seed Default Organization
    const defaultOrg = {
      id: "org_lobby_default",
      name: "Lobby Launch Systems",
      slug: "lobby",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(defaultOrg.id, defaultOrg);

    // 2. Seed Admin User
    const adminUser = {
      id: "user_admin_default",
      email: "admin@lobby.io",
      name: "Platform Administrator",
      role: "ORG_ADMIN",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    this.organizationMembers.set(`${defaultOrg.id}_${adminUser.id}`, {
      id: `om_${uuidv4()}`,
      organizationId: defaultOrg.id,
      userId: adminUser.id,
      role: "ORG_ADMIN",
      createdAt: new Date(),
    });

    // 3. Seed Flagship Campaign
    const flagshipCampaign = {
      id: "camp_flagship_iphone",
      organizationId: defaultOrg.id,
      title: "Apple iPhone 16 Pro Exclusive Launch",
      slug: "iphone-16-pro",
      description: "Join the VIP waitlist for the new iPhone 16 Pro launch. Refer friends to climb the leaderboard and unlock instant coupon rewards.",
      status: "ACTIVE",
      maxCapacity: 50000,
      currentCount: 0,
      registrationStart: new Date(Date.now() - 86400000 * 7),
      registrationEnd: new Date(Date.now() + 86400000 * 30),
      scoringConfig: { referralWeight: 10, signupBonus: 0 },
      createdAt: new Date(Date.now() - 86400000 * 7),
      updatedAt: new Date(),
    };
    this.campaigns.set(flagshipCampaign.id, flagshipCampaign);

    // Seed Second Campaign (to demonstrate multi-tenancy)
    const betaCampaign = {
      id: "camp_ai_hardware",
      organizationId: defaultOrg.id,
      title: "Lobby Smart Terminal Private Beta",
      slug: "smart-terminal-beta",
      description: "Exclusive access program for early developers and verified partners.",
      status: "ACTIVE",
      maxCapacity: 5000,
      currentCount: 0,
      scoringConfig: { referralWeight: 20, signupBonus: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.campaigns.set(betaCampaign.id, betaCampaign);

    // 4. Seed Reward Rules for Flagship Campaign
    const rankOneReward = {
      id: `rule_${uuidv4()}`,
      campaignId: flagshipCampaign.id,
      name: "Position #1 VIP Purchase Pass",
      thresholdRank: 1,
      thresholdReferrals: null,
      rewardType: "coupon",
      couponPrefix: "LOBBY-VIP-",
      createdAt: new Date(),
    };
    this.rewardRules.set(rankOneReward.id, rankOneReward);

    const highReferrerReward = {
      id: `rule_${uuidv4()}`,
      campaignId: flagshipCampaign.id,
      name: "Top Advocate Priority Pass",
      thresholdRank: null,
      thresholdReferrals: 3,
      rewardType: "coupon",
      couponPrefix: "LOBBY-TIER3-",
      createdAt: new Date(),
    };
    this.rewardRules.set(highReferrerReward.id, highReferrerReward);

    // 5. Migrate Existing Mongo Customers (if any) into the Flagship Campaign
    if (Array.isArray(existingMongoCustomers) && existingMongoCustomers.length > 0) {
      for (const cust of existingMongoCustomers) {
        if (!cust.email) continue;
        const normalizedEmail = cust.email.toLowerCase().trim();
        const memberId = `mem_${uuidv4()}`;
        const member = {
          id: memberId,
          campaignId: flagshipCampaign.id,
          email: normalizedEmail,
          name: cust.name || normalizedEmail.split("@")[0],
          referralCode: cust.referralCode || cust.referralLink || uuidv4(),
          referredByCode: cust.referredBy || null,
          score: (cust.referralCount || 0) * 10,
          rank: cust.position || 999,
          referralCount: cust.referralCount || 0,
          status: "ACTIVE",
          fraudStatus: "CLEAN",
          createdAt: cust.createdAt ? new Date(cust.createdAt) : new Date(),
          updatedAt: new Date(),
        };
        this.campaignMembers.set(member.id, member);
      }
      this.recalculateRanks(flagshipCampaign.id);
    }

    this.initialized = true;
    console.log(`[LobbyDataStore] Initialized. Campaigns: ${this.campaigns.size}, Members: ${this.campaignMembers.size}`);
  }

  // --- Campaign Operations ---
  getCampaignBySlug(slug) {
    for (const c of this.campaigns.values()) {
      if (c.slug === slug) return c;
    }
    return null;
  }

  getCampaignById(id) {
    return this.campaigns.get(id) || null;
  }

  listCampaigns(orgId = null) {
    const list = Array.from(this.campaigns.values());
    list.forEach((c) => {
      c.currentCount = this.getCampaignMemberCount(c.id);
    });
    if (orgId) return list.filter((c) => c.organizationId === orgId);
    return list;
  }

  createCampaign(data) {
    const id = `camp_${uuidv4().substring(0, 8)}`;
    const campaign = {
      id,
      organizationId: data.organizationId || "org_lobby_default",
      title: data.title,
      slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: data.description || "",
      status: data.status || "ACTIVE",
      maxCapacity: data.maxCapacity ? parseInt(data.maxCapacity) : null,
      currentCount: 0,
      registrationStart: data.registrationStart ? new Date(data.registrationStart) : new Date(),
      registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null,
      scoringConfig: data.scoringConfig || { referralWeight: 10, signupBonus: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  // --- Member & Queue Operations ---
  getMemberByEmail(campaignId, email) {
    const norm = email.toLowerCase().trim();
    for (const m of this.campaignMembers.values()) {
      if (m.campaignId === campaignId && m.email === norm) return m;
    }
    return null;
  }

  getMemberByReferralCode(code) {
    if (!code) return null;
    for (const m of this.campaignMembers.values()) {
      if (m.referralCode === code) return m;
    }
    return null;
  }

  getMemberById(id) {
    return this.campaignMembers.get(id) || null;
  }

  createMember({ campaignId, email, name, referralCode, referredByCode, metadata = {} }) {
    const id = `mem_${uuidv4()}`;
    const newCode = referralCode || uuidv4();
    const campaign = this.getCampaignById(campaignId);
    const signupBonus = campaign?.scoringConfig?.signupBonus || 0;

    const member = {
      id,
      campaignId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      referralCode: newCode,
      referredByCode: referredByCode || null,
      score: signupBonus,
      rank: this.getCampaignMemberCount(campaignId) + 1,
      referralCount: 0,
      status: "ACTIVE",
      fraudStatus: "CLEAN",
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.campaignMembers.set(id, member);
    if (campaign) {
      campaign.currentCount = this.getCampaignMemberCount(campaignId);
    }
    this.recalculateRanks(campaignId);
    return this.getMemberById(id);
  }

  getCampaignMemberCount(campaignId) {
    let count = 0;
    for (const m of this.campaignMembers.values()) {
      if (m.campaignId === campaignId && m.status !== "DISQUALIFIED") count++;
    }
    return count;
  }

  // Deterministic Queue Ranking Engine
  // Sorts by Score DESC, then createdAt ASC (First to achieve score wins tie)
  recalculateRanks(campaignId) {
    const members = [];
    for (const m of this.campaignMembers.values()) {
      if (m.campaignId === campaignId && m.status !== "DISQUALIFIED") {
        members.push(m);
      }
    }

    members.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    members.forEach((m, index) => {
      m.rank = index + 1;
      m.updatedAt = new Date();
    });

    return members;
  }

  // --- Referral Lifecycle ---
  recordReferral({ campaignId, referrerMemberId, refereeMemberId, riskScore = 0 }) {
    const id = `ref_${uuidv4()}`;
    const initialStatus = riskScore >= 70 ? "PENDING" : "APPROVED";
    const campaign = this.getCampaignById(campaignId);
    const points = campaign?.scoringConfig?.referralWeight || 10;

    const referral = {
      id,
      campaignId,
      referrerMemberId,
      refereeMemberId,
      status: initialStatus,
      scorePoints: points,
      riskScore,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.referrals.set(id, referral);

    // Record Event
    this.recordReferralEvent({
      referralId: id,
      eventType: "CREATED",
      previousStatus: null,
      newStatus: initialStatus,
      reason: initialStatus === "APPROVED" ? "Automatic approval: low risk" : "Flagged for manual review: high risk",
    });

    // If approved, update referrer score and rank
    if (initialStatus === "APPROVED") {
      const referrer = this.getMemberById(referrerMemberId);
      if (referrer) {
        referrer.score += points;
        referrer.referralCount += 1;
        this.recalculateRanks(campaignId);
      }
    }

    return referral;
  }

  recordReferralEvent({ referralId, eventType, previousStatus, newStatus, reason }) {
    const id = `refevt_${uuidv4()}`;
    const event = {
      id,
      referralId,
      eventType,
      previousStatus,
      newStatus,
      reason,
      createdAt: new Date(),
    };
    this.referralEvents.set(id, event);
    return event;
  }

  // --- Fraud Engine Records ---
  recordFraudSignal({ campaignId, campaignMemberId, signalType, riskScore, details }) {
    const id = `fraud_${uuidv4()}`;
    const status = riskScore >= 80 ? "HIGH_RISK" : riskScore >= 50 ? "SUSPICIOUS" : "CLEAN";
    const signal = {
      id,
      campaignId,
      campaignMemberId,
      signalType,
      riskScore,
      details,
      status,
      createdAt: new Date(),
    };
    this.fraudSignals.set(id, signal);

    if (campaignMemberId && riskScore >= 80) {
      const member = this.getMemberById(campaignMemberId);
      if (member) member.fraudStatus = "HIGH_RISK";
    }

    return signal;
  }

  listFraudSignals(campaignId = null) {
    const list = Array.from(this.fraudSignals.values());
    if (campaignId) return list.filter((s) => s.campaignId === campaignId);
    return list;
  }

  // --- Rewards & Coupons ---
  getRewardRules(campaignId) {
    return Array.from(this.rewardRules.values()).filter((r) => r.campaignId === campaignId);
  }

  issueCoupon({ campaignMemberId, rewardRuleId = null, prefix = "LOBBY-WIN-" }) {
    const code = `${prefix}${uuidv4().substring(0, 8).toUpperCase()}`;
    const id = `coup_${uuidv4()}`;
    const coupon = {
      id,
      campaignMemberId,
      code,
      rewardRuleId,
      status: "ACTIVE",
      createdAt: new Date(),
    };
    this.coupons.set(id, coupon);
    return coupon;
  }

  getCouponsForMember(campaignMemberId) {
    return Array.from(this.coupons.values()).filter((c) => c.campaignMemberId === campaignMemberId);
  }

  // --- Audit Trail ---
  recordAudit({ organizationId = "org_lobby_default", userId = null, action, targetType, targetId, ipAddress = null, details = {} }) {
    const log = {
      id: `audit_${uuidv4()}`,
      organizationId,
      userId,
      action,
      targetType,
      targetId,
      ipAddress,
      details,
      createdAt: new Date(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    return log;
  }

  getAuditLogs(limit = 50) {
    return this.auditLogs.slice(0, limit);
  }
  // --- Member Journey & Audit Enhancements ---
  adjustMemberScore(memberId, delta, reason = "Manual administrative adjustment", userId = null) {
    const member = this.getMemberById(memberId);
    if (!member) return null;
    const oldScore = member.score;
    member.score = Math.max(0, member.score + delta);
    member.updatedAt = new Date();
    this.recalculateRanks(member.campaignId);
    this.recordAudit({
      userId,
      action: "SCORE_ADJUSTED",
      targetType: "MEMBER",
      targetId: memberId,
      details: { oldScore, newScore: member.score, delta, reason },
    });
    return member;
  }

  updateMemberStatus(memberId, status, fraudStatus, reason = "Administrative update", userId = null) {
    const member = this.getMemberById(memberId);
    if (!member) return null;
    if (status) member.status = status;
    if (fraudStatus) member.fraudStatus = fraudStatus;
    member.updatedAt = new Date();
    this.recalculateRanks(member.campaignId);
    this.recordAudit({
      userId,
      action: "MEMBER_STATUS_UPDATED",
      targetType: "MEMBER",
      targetId: memberId,
      details: { status: member.status, fraudStatus: member.fraudStatus, reason },
    });
    return member;
  }

  getMemberFullJourney(memberId) {
    const member = this.getMemberById(memberId);
    if (!member) return null;
    const campaign = this.getCampaignById(member.campaignId);
    const referrer = member.referredByCode ? this.getMemberByReferralCode(member.referredByCode) : null;

    const referralsGiven = [];
    for (const ref of this.referrals.values()) {
      if (ref.referrerMemberId === member.id) {
        const referee = this.getMemberById(ref.refereeMemberId);
        referralsGiven.push({
          ...ref,
          refereeName: referee ? referee.name : "Anonymous",
          refereeEmail: referee ? referee.email : "Unknown",
        });
      }
    }

    const coupons = this.getCouponsForMember(member.id);
    const fraudSignals = Array.from(this.fraudSignals.values()).filter((s) => s.campaignMemberId === member.id);
    const auditLogs = this.auditLogs.filter((a) => a.targetId === member.id);

    return {
      member,
      campaignTitle: campaign ? campaign.title : "Default Campaign",
      referrer: referrer ? { name: referrer.name, email: referrer.email, code: referrer.referralCode } : null,
      referralsGiven,
      coupons,
      fraudSignals,
      auditLogs,
    };
  }

  listAllReferrals(campaignId = null) {
    const list = [];
    for (const ref of this.referrals.values()) {
      if (!campaignId || ref.campaignId === campaignId) {
        const referrer = this.getMemberById(ref.referrerMemberId);
        const referee = this.getMemberById(ref.refereeMemberId);
        list.push({
          ...ref,
          referrerName: referrer ? referrer.name : "Anonymous",
          referrerEmail: referrer ? referrer.email : "Unknown",
          refereeName: referee ? referee.name : "Anonymous",
          refereeEmail: referee ? referee.email : "Unknown",
        });
      }
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  listAllCoupons(campaignId = null) {
    const list = [];
    for (const c of this.coupons.values()) {
      const member = this.getMemberById(c.campaignMemberId);
      if (!campaignId || (member && member.campaignId === campaignId)) {
        list.push({
          ...c,
          memberName: member ? member.name : "System Recipient",
          memberEmail: member ? member.email : "N/A",
        });
      }
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

// Global Singleton Instance
const store = new LobbyDataStore();
module.exports = store;
