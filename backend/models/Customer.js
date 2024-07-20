const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  position: { type: Number, default: 99 },
  referralCode: { type: String, unique: true },
  referrals: { type: Number, default: 0 },
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
