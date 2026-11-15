const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String, default: null },
    position: { type: Number, required: true },
    referralCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;
