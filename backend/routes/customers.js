const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");
const nodemailer = require("nodemailer");

// transporter object
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// handle post requests
router.post("/signup", async (req, res) => {
  const { email, referralCode } = req.body;
  try {
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer)
      return res.status(400).json({ msg: "Email already exists" });

    const position = (await Customer.countDocuments()) + 1;
    const newCustomer = new Customer({
      email,
      position,
      referralCode: Math.random().toString(36).substring(7),
    });

    if (referralCode) {
      const referrer = await Customer.findOne({ referralCode });
      if (referrer) {
        referrer.referrals += 1;
        referrer.position -= 1;
        await referrer.save();
      }
    }

    // Save the new customer 
    await newCustomer.save();

    if (newCustomer.position === 1) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: newCustomer.email,
        subject: "Congratulations!",
        text: "You have reached position 1 in the waitlist. Here is your coupon code: COUPON123",
      };

      // Send the email using the transporter
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }

    // respond with the new customers position and referral code
    res.json({
      position: newCustomer.position,
      referralCode: newCustomer.referralCode,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
