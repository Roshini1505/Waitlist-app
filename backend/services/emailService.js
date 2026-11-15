// Transactional Email Service for Lobby SaaS Platform
// Delivers cleanly styled, restrained, accessible HTML emails for registrations and rewards.

const nodemailer = require("nodemailer");

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

/**
 * Sends a welcome email to a newly signed-up campaign member.
 */
const sendWelcomeEmail = async (to, name, referralLink, position, campaignTitle = "Product Launch") => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EmailService] EMAIL_USER/EMAIL_PASS not configured. Skipping welcome email to ${to}`);
    return;
  }

  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0D10; color: #F3F4F6; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 36px auto; background-color: #12151B; border: 1px solid #222733; border-radius: 8px; overflow: hidden; }
        .header { background-color: #181C24; padding: 24px 32px; border-bottom: 1px solid #222733; }
        .header-title { font-size: 16px; font-weight: 600; color: #F3F4F6; margin: 0; letter-spacing: -0.2px; }
        .content { padding: 32px; }
        .heading { font-size: 20px; font-weight: 600; color: #F3F4F6; margin: 0 0 12px; letter-spacing: -0.3px; }
        .text { font-size: 14px; line-height: 1.6; color: #9CA3AF; margin: 0 0 20px; }
        .rank-card { background-color: #181C24; border: 1px solid #2F3646; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0; }
        .rank-num { font-size: 42px; font-weight: 700; color: #60A5FA; font-family: ui-monospace, Menlo, Monaco, monospace; margin: 0; line-height: 1; }
        .rank-lbl { font-size: 11px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.5px; margin-top: 6px; }
        .referral-container { background-color: #0B0D10; border: 1px solid #222733; border-radius: 6px; padding: 14px 18px; margin: 20px 0; }
        .referral-label { font-size: 11px; text-transform: uppercase; color: #6B7280; margin-bottom: 6px; }
        .referral-link { font-family: ui-monospace, Menlo, Monaco, monospace; font-size: 13px; color: #93C5FD; word-break: break-all; text-decoration: none; }
        .btn-action { display: inline-block; background-color: #2563EB; color: #FFFFFF !important; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; margin-top: 10px; }
        .footer { padding: 20px 32px; border-top: 1px solid #222733; font-size: 12px; color: #6B7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="header-title">Lobby — Launch Orchestration</div>
        </div>
        <div class="content">
          <h1 class="heading">Registration Confirmed</h1>
          <p class="text">Hello ${name}, your spot in the priority queue for <strong>${campaignTitle}</strong> is secured.</p>
          
          <div class="rank-card">
            <div class="rank-num">#${position}</div>
            <div class="rank-lbl">Current Queue Standing</div>
          </div>

          <p class="text">Want to advance your standing? Share your unique referral link below. For every verified participant who registers through your link, your priority score increases and moves you forward in line.</p>

          <div class="referral-container">
            <div class="referral-label">Your Referral Link</div>
            <a href="${referralLink}" class="referral-link">${referralLink}</a>
          </div>

          <a href="${referralLink}" class="btn-action">Access Queue Dashboard</a>
        </div>
        <div class="footer">
          You received this email because you registered for priority launch access on Lobby.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Lobby Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Queue Position #${position} Confirmed — ${campaignTitle}`,
    html,
  });

  console.log(`[EmailService] Welcome email delivered to ${to}`);
};

/**
 * Sends a reward coupon email when a participant unlocks a milestone reward.
 */
const sendCouponEmail = async (to, name, couponCode, milestoneDesc = "Position #1 VIP Milestone") => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EmailService] EMAIL_USER/EMAIL_PASS not configured. Skipping coupon email to ${to}`);
    return;
  }

  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0D10; color: #F3F4F6; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 36px auto; background-color: #12151B; border: 1px solid #222733; border-radius: 8px; overflow: hidden; }
        .header { background-color: #181C24; padding: 24px 32px; border-bottom: 1px solid #222733; }
        .header-title { font-size: 16px; font-weight: 600; color: #F3F4F6; margin: 0; letter-spacing: -0.2px; }
        .content { padding: 32px; }
        .heading { font-size: 20px; font-weight: 600; color: #4ADE80; margin: 0 0 12px; letter-spacing: -0.3px; }
        .text { font-size: 14px; line-height: 1.6; color: #9CA3AF; margin: 0 0 20px; }
        .coupon-card { background-color: rgba(21, 128, 61, 0.12); border: 1px dashed rgba(74, 222, 128, 0.35); border-radius: 6px; padding: 24px; text-align: center; margin: 24px 0; }
        .coupon-code { font-size: 28px; font-weight: 700; color: #4ADE80; font-family: ui-monospace, Menlo, Monaco, monospace; letter-spacing: 2px; margin: 6px 0; }
        .coupon-lbl { font-size: 11px; text-transform: uppercase; color: #86EFAC; letter-spacing: 0.5px; }
        .footer { padding: 20px 32px; border-top: 1px solid #222733; font-size: 12px; color: #6B7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="header-title">Lobby — Milestone Reward</div>
        </div>
        <div class="content">
          <h1 class="heading">Milestone Unlocked!</h1>
          <p class="text">Congratulations ${name}, your referral score has achieved top standing: <strong>${milestoneDesc}</strong>.</p>
          
          <div class="coupon-card">
            <div class="coupon-lbl">Your Priority Pass Token</div>
            <div class="coupon-code">${couponCode}</div>
            <div style="font-size: 12px; color: #9CA3AF; margin-top: 6px;">Redeemable at official launch checkout.</div>
          </div>

          <p class="text">Thank you for your active participation and advocacy. Keep this code secure for checkout access.</p>
        </div>
        <div class="footer">
          Lobby Platform Reward Notification.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Lobby Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Milestone Unlocked: Your Priority Pass Token (${couponCode})`,
    html,
  });

  console.log(`[EmailService] Reward coupon email delivered to ${to}`);
};

module.exports = { sendWelcomeEmail, sendCouponEmail };
