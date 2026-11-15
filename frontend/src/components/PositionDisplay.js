import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const PositionDisplay = ({ position: initialPosition, referralCode, userEmail }) => {
  const [position, setPosition] = useState(initialPosition);
  const [copied, setCopied] = useState(false);
  const [justMoved, setJustMoved] = useState(false);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || "http://localhost:5000");
    socket.on("position-update", ({ email, newPosition }) => {
      if (email === userEmail) {
        setPosition(newPosition);
        setJustMoved(true);
        setTimeout(() => setJustMoved(false), 3000);
      }
    });
    return () => socket.disconnect();
  }, [userEmail]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetText = encodeURIComponent(
    `I just joined the waitlist! Use my referral link to skip ahead: ${referralCode}`
  );
  const whatsappText = encodeURIComponent(
    `Join the waitlist using my referral link: ${referralCode}`
  );

  return (
    <div className="position-display">
      <div className={`position-badge${justMoved ? " position-moved" : ""}`}>
        <span className="position-number">#{position}</span>
        <span className="position-label">Your Position</span>
      </div>
      {justMoved && (
        <p className="position-update-flash">🎉 You moved up!</p>
      )}
      <p className="position-desc">Share your referral link to move up the list!</p>
      <div className="referral-box">
        <span className="referral-url">{referralCode}</span>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? "✅ Copied!" : "📋 Copy"}
        </button>
      </div>
      <div className="share-buttons">
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn twitter"
        >
          Share on X
        </a>
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn whatsapp"
        >
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
};

export default PositionDisplay;
