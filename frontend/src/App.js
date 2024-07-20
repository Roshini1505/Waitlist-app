import React, { useState } from "react";
import "./App.css";
import logo from "./assets/logo.png";
import PositionDisplay from "./components/PositionDisplay";
import SignupForm from "./components/SignupForm";

const App = () => {
  const [position, setPosition] = useState(null);
  const [referralCode, setReferralCode] = useState(null);

  return (
    <div className="container">
      <img src={logo} alt="Logo" className="logo" />
      <h1>Join the Waitlist!</h1>
      {!position ? (
        <SignupForm
          setPosition={setPosition}
          setReferralCode={setReferralCode}
        />
      ) : (
        <PositionDisplay position={position} referralCode={referralCode} />
      )}
      <div className="footer">© Roshini Sivakumar</div>
    </div>
  );
};

export default App;
