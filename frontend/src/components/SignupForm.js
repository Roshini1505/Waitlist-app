import React, { useState } from "react";
import { signupCustomer } from "../services/api";

const SignupForm = ({ setPosition, setReferralCode, setUserEmail, defaultReferralCode = "" }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCodeState] = useState(defaultReferralCode);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await signupCustomer({ name, email, referralCode });
      setPosition(data.position);
      setReferralCode(data.referralLink);
      if (setUserEmail) setUserEmail(email);
      setMessage("Signup successful! Check your email for confirmation.");
      setName("");
      setEmail("");
      setReferralCodeState("");
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          aria-label="Full name"
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-label="Email address"
          required
        />
      </div>
      <div>
        <label htmlFor="referralCode">Referral Code (optional):</label>
        <input
          id="referralCode"
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCodeState(e.target.value)}
          placeholder="Enter referral code (if any)"
          aria-label="Referral code"
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "⏳ Signing Up..." : "Sign Up"}
      </button>
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
    </form>
  );
};

export default SignupForm;
