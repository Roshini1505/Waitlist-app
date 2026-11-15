// Reward and Milestone Service for Lobby SaaS Platform
const store = require("../../db/store");
const { sendCouponEmail } = require("../../../services/emailService");

class RewardService {
  /**
   * Evaluates all reward rules for a campaign member and issues any newly unlocked rewards.
   * Called whenever a member's score, rank, or referral count changes.
   */
  async evaluateMemberRewards(campaignMemberId) {
    const member = store.getMemberById(campaignMemberId);
    if (!member) return [];

    const campaign = store.getCampaignById(member.campaignId);
    if (!campaign) return [];

    const rules = store.getRewardRules(member.campaignId);
    const existingCoupons = store.getCouponsForMember(member.id);
    const existingRuleIds = new Set(existingCoupons.map((c) => c.rewardRuleId).filter(Boolean));

    const newlyIssued = [];

    for (const rule of rules) {
      // Check if already awarded
      if (existingRuleIds.has(rule.id)) continue;

      let qualifies = false;

      // 1. Rank-based qualification (e.g., reached Rank 1)
      if (rule.thresholdRank !== null && rule.thresholdRank !== undefined) {
        if (member.rank <= rule.thresholdRank) {
          qualifies = true;
        }
      }

      // 2. Referral count qualification (e.g., referred 3 friends)
      if (rule.thresholdReferrals !== null && rule.thresholdReferrals !== undefined) {
        if (member.referralCount >= rule.thresholdReferrals) {
          qualifies = true;
        }
      }

      if (qualifies) {
        const coupon = store.issueCoupon({
          campaignMemberId: member.id,
          rewardRuleId: rule.id,
          prefix: rule.couponPrefix || "LOBBY-WIN-",
        });

        // Record audit
        store.recordAudit({
          organizationId: campaign.organizationId,
          action: "REWARD_COUPON_AWARDED",
          targetType: "MEMBER",
          targetId: member.id,
          details: { ruleId: rule.id, ruleName: rule.name, couponCode: coupon.code, rank: member.rank },
        });

        // Trigger coupon email asynchronously
        sendCouponEmail(member.email, member.name, coupon.code).catch((err) =>
          console.error(`[RewardService] Failed to send coupon email to ${member.email}:`, err.message)
        );

        newlyIssued.push(coupon);
      }
    }

    return newlyIssued;
  }
}

module.exports = new RewardService();
