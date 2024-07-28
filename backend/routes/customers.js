const express = require("express");
const router = express.Router();
const Customer = require("../models/customer");

router.post("/signup", async (req, res) => {
  const { email, referralLink } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const newCustomer = new Customer({ email, referralLink });
    await newCustomer.save();
    res.status(201).json({ message: "Customer signed up successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Duplicate email or referral link error" });
    }
    res.status(500).json({ message: "An error occurred", error });
  }
});

module.exports = router;
