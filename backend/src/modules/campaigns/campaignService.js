// Campaign Management & Analytics Service for Lobby SaaS Platform
const store = require("../../db/store");

class CampaignService {
  getCampaign(identifier) {
    return store.getCampaignBySlug(identifier) || store.getCampaignById(identifier);
  }

  listCampaigns(orgId = null) {
    return store.listCampaigns(orgId);
  }

  createCampaign(data) {
    return store.createCampaign(data);
  }

  getLeaderboard(campaignIdentifier, limit = 20) {
    const campaign = this.getCampaign(campaignIdentifier);
    if (!campaign) return [];

    const members = [];
    for (const m of store.campaignMembers.values()) {
      if (m.campaignId === campaign.id && m.status !== "DISQUALIFIED") {
        members.push({
          rank: m.rank,
          name: m.name,
          email: m.email,
          score: m.score,
          referralCount: m.referralCount,
          createdAt: m.createdAt,
        });
      }
    }

    members.sort((a, b) => a.rank - b.rank);
    return members.slice(0, limit);
  }

  getAdminStats(campaignIdentifier = null) {
    const campaigns = store.listCampaigns();
    const targetCampaign = campaignIdentifier ? this.getCampaign(campaignIdentifier) : null;

    let totalSignups = 0;
    let totalReferrals = store.referrals.size;
    let members = Array.from(store.campaignMembers.values());

    if (targetCampaign) {
      members = members.filter((m) => m.campaignId === targetCampaign.id);
      totalSignups = members.length;
      totalReferrals = Array.from(store.referrals.values()).filter((r) => r.campaignId === targetCampaign.id).length;
    } else {
      totalSignups = members.length;
    }

    // Top Referrers
    const topReferrers = [...members]
      .filter((m) => m.referralCount > 0)
      .sort((a, b) => b.referralCount - a.referralCount || a.rank - b.rank)
      .slice(0, 10)
      .map((m) => ({
        name: m.name,
        email: m.email,
        referralCount: m.referralCount,
        position: m.rank,
        score: m.score,
        campaignId: m.campaignId,
      }));

    // Recent Signups
    const recentSignups = [...members]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((m) => ({
        name: m.name,
        email: m.email,
        position: m.rank,
        score: m.score,
        createdAt: m.createdAt,
        campaignId: m.campaignId,
      }));

    const fraudSignals = store.listFraudSignals(targetCampaign ? targetCampaign.id : null).slice(0, 15);
    const auditLogs = store.getAuditLogs(15);

    return {
      totalCampaigns: campaigns.length,
      totalSignups,
      totalCustomers: totalSignups,
      totalReferrals,
      fraudSignalsCount: store.fraudSignals.size,
      topReferrers,
      recentSignups,
      fraudSignals,
      auditLogs,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        currentCount: store.getCampaignMemberCount(c.id),
        maxCapacity: c.maxCapacity,
      })),
    };
  }

  getMemberStanding(campaignIdentifier, email) {
    const campaign = this.getCampaign(campaignIdentifier);
    if (!campaign) return null;

    const member = store.getMemberByEmail(campaign.id, email);
    if (!member) return null;

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const referralLink = `${baseUrl}/referral/${member.referralCode}`;
    const coupons = store.getCouponsForMember(member.id);

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      position: member.rank,
      score: member.score,
      referralCount: member.referralCount,
      referralLink,
      coupons: coupons.map((c) => ({ code: c.code, status: c.status, createdAt: c.createdAt })),
      campaign: {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
      },
    };
  }
}

module.exports = new CampaignService();
