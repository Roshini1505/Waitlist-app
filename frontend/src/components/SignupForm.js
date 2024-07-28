import emailjs from "emailjs-com";
import React, { useState } from "react";

const SignupForm = ({ setPosition, setReferralCode }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true); // Set loading state to true

    try {
      const response = await fetch(
        "http://localhost:5000/api/customers/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, referralLink }), // Include name in request body
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPosition(data.position);
        setReferralCode(data.referralLink);

        // Send confirmation email
        const templateParams = {
          to_name: name,
          to_email: email,
          message: "Thank you for signing up!",
          referralLink: data.referralLink,
        };

        await emailjs.send(
          process.env.REACT_APP_EMAILJS_SERVICE_ID, // Ensure this is set in your .env file
          process.env.REACT_APP_EMAILJS_TEMPLATE_ID, // Ensure this is set in your .env file
          templateParams,
          process.env.REACT_APP_EMAILJS_USER_ID // Ensure this is set in your .env file
        );

        setMessage("Signup successful! Check your email for confirmation.");
        // Reset form fields after successful signup
        setName("");
        setEmail("");
        setReferralLink("");
      } else {
        const errorData = await response.json();
        setMessage(
          `Signup failed: ${errorData.message || "Please try again."}`
        );
      }
    } catch (error) {
      console.error("There was an error during signup:", error);
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>
      <div>
        <label>Referral Link (optional):</label>
        <input
          type="text"
          value={referralLink}
          onChange={(e) => setReferralLink(e.target.value)}
          placeholder="Enter referral link (if any)"
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Signing Up..." : "Sign Up"}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default SignupForm;
