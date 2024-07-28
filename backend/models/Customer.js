const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  referralLink: { type: String, unique: true, default: null },
  position: { type: Number, default: 99 },
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
