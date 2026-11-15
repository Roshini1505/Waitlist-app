// Rule-Based Fraud Detection Engine for Lobby SaaS Platform
// Evaluates registrations and referrals for synthetic identities, disposable emails, and abuse.

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "temp-mail.org", "mailinator.com", "10minutemail.com",
  "guerrillamail.com", "sharklasers.com", "throwawaymail.com", "yopmail.com",
  "trashmail.com", "getairmail.com", "dispostable.com", "fakeinbox.com",
  "burnermail.io", "maildrop.cc", "mohmal.com", "crazymailing.com",
  "inboxkitten.com", "mytemp.email", "tempinbox.com", "tempmailaddress.com",
  "generator.email", "emailondeck.com", "dropmail.me", "fakemailgenerator.com"
]);

// Track IP velocity in-memory (sliding window of 60 seconds)
const ipRegistrationHistory = new Map();

class FraudDetectionService {
  /**
   * Evaluates fraud risk for a new registration or referral event.
   * Returns: { riskScore: number, status: 'CLEAN'|'SUSPICIOUS'|'HIGH_RISK', signals: Array }
   */
  evaluateRegistration({ email, ipAddress = "127.0.0.1", referrerMember = null, metadata = {} }) {
    let riskScore = 0;
    const signals = [];

    const normalizedEmail = email.toLowerCase().trim();
    const domain = normalizedEmail.split("@")[1];

    // 1. Disposable Email Domain Check (High Risk Signal)
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      riskScore += 75;
      signals.push({
        type: "DISPOSABLE_EMAIL",
        score: 75,
        details: { domain, reason: "Domain is known temporary/disposable email provider" },
      });
    }

    // 2. Self-Referral Detection (Critical Risk Signal)
    if (referrerMember) {
      if (referrerMember.email.toLowerCase().trim() === normalizedEmail) {
        riskScore += 90;
        signals.push({
          type: "SELF_REFERRAL",
          score: 90,
          details: { reason: "User attempted to refer their own email address" },
        });
      }

      // Check for same email alias (e.g., user+1@gmail.com vs user@gmail.com)
      const baseUserEmail = normalizedEmail.replace(/\+.*@/, "@");
      const baseReferrerEmail = referrerMember.email.toLowerCase().trim().replace(/\+.*@/, "@");
      if (baseUserEmail === baseReferrerEmail) {
        riskScore += 80;
        signals.push({
          type: "EMAIL_ALIAS_SELF_REFERRAL",
          score: 80,
          details: { reason: "User referred an email alias of the same mailbox" },
        });
      }
    }

    // 3. Velocity Spike Check (Multiple signups from same IP in short window)
    if (ipAddress) {
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      let history = ipRegistrationHistory.get(ipAddress) || [];
      // Clean up records older than window
      history = history.filter((t) => now - t < windowMs);

      if (history.length >= 5) {
        riskScore += 45;
        signals.push({
          type: "IP_VELOCITY_SPIKE",
          score: 45,
          details: { count: history.length + 1, windowSeconds: 60 },
        });
      } else if (history.length >= 3) {
        riskScore += 25;
        signals.push({
          type: "IP_VELOCITY_ELEVATED",
          score: 25,
          details: { count: history.length + 1, windowSeconds: 60 },
        });
      }

      history.push(now);
      ipRegistrationHistory.set(ipAddress, history);
    }

    // Cap score at 100
    riskScore = Math.min(100, riskScore);

    // Determine status tier
    let status = "CLEAN";
    if (riskScore >= 80) status = "HIGH_RISK";
    else if (riskScore >= 45) status = "SUSPICIOUS";

    return {
      riskScore,
      status,
      signals,
    };
  }

  isDisposable(email) {
    if (!email) return false;
    const domain = email.toLowerCase().trim().split("@")[1];
    return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
  }
}

module.exports = new FraudDetectionService();
