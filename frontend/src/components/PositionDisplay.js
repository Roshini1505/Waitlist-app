import React from "react";

const PositionDisplay = ({ position, referralCode }) => {
  return (
    <div>
      <h2>Your Position: {position}</h2>
      <p>
        Your Referral Link:{" "}
        <a href={referralCode} target="_blank" rel="noopener noreferrer">
          {referralCode}
        </a>
      </p>
    </div>
  );
};

export default PositionDisplay;
