import axios from "axios";
import React, { useState } from "react";

const SignupForm = ({ setPosition, setReferralCode }) => {
  const [email, setEmail] = useState("");
  const [referralCode, setReferral] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:5000/api/customers/signup",
        { email, referralCode }
      );
      setPosition(response.data.position);
      setReferralCode(response.data.referralCode);
    } catch (err) {
      console.error(err.response ? err.response.data.msg : err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <input
        type="text"
        value={referralCode}
        onChange={(e) => setReferral(e.target.value)}
        placeholder="Enter referral code (optional)"
      />
      <button type="submit">Sign Up</button>
    </form>
  );
};

export default SignupForm;
