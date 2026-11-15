const express = require("express");
const router = express.Router();
const validator = require("validator");
const { v4: uuidv4 } = require("uuid");
const Customer = require("../models/Customer");
const { sendWelcomeEmail, sendCouponEmail } = require("../services/emailService");

/**
 * @openapi
 * /api/customers/signup:
 *   post:
 *     summary: Sign up for the waitlist
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               referralCode:
 *                 type: string
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       201:
 *         description: Successfully signed up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 position:
 *                   type: integer
 *                 referralLink:
 *                   type: string
 *       400:
 *         description: Validation error (missing or invalid fields)
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error
 */
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, referralCode } = req.body;

    // --- Validation ---
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // --- Duplicate check ---
    const existing = await Customer.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // --- Assign position ---
    const lastCustomer = await Customer.findOne().sort({ position: -1 });
    const position = lastCustomer ? lastCustomer.position + 1 : 1;

    // --- Generate unique referral code ---
    const newReferralCode = uuidv4();

    // --- Create and save customer ---
    const newCustomer = new Customer({
      name: name.trim(),
      email: normalizedEmail,
      referralCode: newReferralCode,
      referredBy: referralCode || null,
      position,
    });
    await newCustomer.save();

    const referralLink = `${process.env.BASE_URL || "http://localhost:3000"}/referral/${newReferralCode}`;

    // --- Handle referrer ---
    let referrer = null;
    if (referralCode) {
      referrer = await Customer.findOne({ referralCode });
      if (referrer) {
        referrer.position = Math.max(1, referrer.position - 1);
        referrer.referralCount += 1;
        await referrer.save();

        if (referrer.position === 1) {
          const couponCode = `COUPON-${uuidv4().split("-")[0].toUpperCase()}`;
          sendCouponEmail(referrer.email, referrer.name, couponCode).catch((err) =>
            console.error("Failed to send coupon email:", err)
          );
        }
      }
    }

    // --- Emit real-time events ---
    const io = req.app.get("io");
    if (io) {
      if (referrer) {
        io.emit("position-update", { email: referrer.email, newPosition: referrer.position });
      }
      const totalCount = await Customer.countDocuments();
      io.emit("signup-count", { count: totalCount });
    }

    // --- Send welcome email (non-blocking) ---
    sendWelcomeEmail(normalizedEmail, name.trim(), referralLink, position).catch((err) =>
      console.error("Failed to send welcome email:", err)
    );

    return res.status(201).json({
      message: "Signed up successfully! Check your email for confirmation.",
      position,
      referralLink,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/customers/position/{email}:
 *   get:
 *     summary: Get a customer's waitlist position
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: The customer's email address
 *     responses:
 *       200:
 *         description: Customer position info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 position:
 *                   type: integer
 *                 referralCount:
 *                   type: integer
 *                 referralLink:
 *                   type: string
 *       404:
 *         description: Customer not found
 */
router.get("/position/:email", async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const referralLink = `${process.env.BASE_URL || "http://localhost:3000"}/referral/${customer.referralCode}`;

    return res.json({
      position: customer.position,
      referralCount: customer.referralCount,
      referralLink,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
