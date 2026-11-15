import React, { useState } from "react";
import { getPosition } from "../services/api";
import PositionDisplay from "../components/PositionDisplay";

const CheckPosition = () => {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = await getPosition(email);
      setResult(data);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("not found")) {
        setError("No account found with that email address.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="check-position-page">
      <h2>Check Your Position</h2>
      <p className="check-desc">Enter your email to see your current waitlist position.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="check-email">Email:</label>
          <input
            id="check-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            aria-label="Email address"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "⏳ Checking..." : "Check Position"}
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {result && (
        <div className="check-result">
          <p className="referral-count">
            🎉 You've referred <strong>{result.referralCount}</strong> friend{result.referralCount !== 1 ? "s" : ""}!
          </p>
          <PositionDisplay
            position={result.position}
            referralCode={result.referralLink}
          />
        </div>
      )}
    </div>
  );
};

export default CheckPosition;
