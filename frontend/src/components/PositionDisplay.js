import React from "react";

const PositionDisplay = ({ position, referralCode }) => {
  return (
    <div>
      <h1>Your position in the waitlist is: {position}</h1>
      <p>
        Share this link to refer friends:{" "}
        <a href={`http://localhost:3000?referral=${referralCode}`}>
          http://localhost:3000?referral={referralCode}
        </a>
      </p>
    </div>
  );
};

export default PositionDisplay;
