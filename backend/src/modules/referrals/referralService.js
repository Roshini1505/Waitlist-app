// Referral Qualification Lifecycle Service for Lobby SaaS Platform
const store = require("../../db/store");
const fraudService = require("../fraud/fraudService");
const rewardService = require("../rewards/rewardService");

class ReferralLifecycleService {
  /**
   * Processes a referral attribution for a newly registered member.
   */
  async processReferralAttribution({ campaignId, refereeMember, referralCode, ipAddress }) {
    if (!referralCode) return null;

    const referrer = store.getMemberByReferralCode(referralCode);
    if (!referrer) {
      console.log(`[ReferralService] Referral code "${referralCode}" not found.`);
      return null;
    }

    // Campaign boundary check: cannot refer across different campaigns
    if (referrer.campaignId !== campaignId) {
      console.log(`[ReferralService] Cross-campaign referral attempt blocked: ${referrer.campaignId} vs ${campaignId}`);
      return null;
    }

    // Self-referral prevention
    if (referrer.id === refereeMember.id || referrer.email === refereeMember.email) {
      store.recordFraudSignal({
        campaignId,
        campaignMemberId: refereeMember.id,
        signalType: "SELF_REFERRAL_ATTEMPT",
        riskScore: 90,
        details: { referrerId: referrer.id, refereeId: refereeMember.id },
      });
      return null;
    }

    // Evaluate Fraud Risk
    const fraudEval = fraudService.evaluateRegistration({
      email: refereeMember.email,
      ipAddress,
      referrerMember: referrer,
    });

    if (fraudEval.signals.length > 0) {
      fraudEval.signals.forEach((sig) => {
        store.recordFraudSignal({
          campaignId,
          campaignMemberId: refereeMember.id,
          signalType: sig.type,
          riskScore: sig.score,
          details: sig.details,
        });
      });
    }

    // Record Referral Lifecycle
    const referral = store.recordReferral({
      campaignId,
      referrerMemberId: referrer.id,
      refereeMemberId: refereeMember.id,
      riskScore: fraudEval.riskScore,
    });

    // If referral is approved, evaluate milestone rewards for the referrer!
    if (referral.status === "APPROVED") {
      await rewardService.evaluateMemberRewards(referrer.id);
    }

    return referral;
  }

  /**
   * Admin Action: Approve a held/pending referral.
   */
  async approveReferral(referralId, adminUserId = "admin") {
    const ref = store.referrals.get(referralId);
    if (!ref || ref.status === "APPROVED") return ref;

    const prev = ref.status;
    ref.status = "APPROVED";
    ref.updatedAt = new Date();

    store.recordReferralEvent({
      referralId,
      eventType: "STATUS_CHANGED",
      previousStatus: prev,
      newStatus: "APPROVED",
      reason: `Manually approved by admin ${adminUserId}`,
    });

    // Credit score to referrer
    const referrer = store.getMemberById(ref.referrerMemberId);
    if (referrer) {
      referrer.score += ref.scorePoints;
      referrer.referralCount += 1;
      store.recalculateRanks(ref.campaignId);
      await rewardService.evaluateMemberRewards(referrer.id);
    }

    return ref;
  }

  /**
   * Admin Action: Reject or Reverse a referral.
   */
  async rejectReferral(referralId, reason = "Suspected fraud", adminUserId = "admin") {
    const ref = store.referrals.get(referralId);
    if (!ref || ref.status === "REJECTED") return ref;

    const prev = ref.status;
    ref.status = "REJECTED";
    ref.updatedAt = new Date();

    store.recordReferralEvent({
      referralId,
      eventType: "STATUS_CHANGED",
      previousStatus: prev,
      newStatus: "REJECTED",
      reason: `${reason} (Action by ${adminUserId})`,
    });

    // If previously approved, deduct score
    if (prev === "APPROVED") {
      const referrer = store.getMemberById(ref.referrerMemberId);
      if (referrer) {
        referrer.score = Math.max(0, referrer.score - ref.scorePoints);
        referrer.referralCount = Math.max(0, referrer.referralCount - 1);
        store.recalculateRanks(ref.campaignId);
      }
    }

    return ref;
  }
}

module.exports = new ReferralLifecycleService();
