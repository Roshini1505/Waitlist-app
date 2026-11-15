import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import Confetti from "react-confetti";
import "./App.css";
import logo from "./assets/logo.png";
import PositionDisplay from "./components/PositionDisplay";
import SignupForm from "./components/SignupForm";
import CheckPosition from "./pages/CheckPosition";
import AdminDashboard from "./pages/AdminDashboard";

// Main signup page — optionally pre-fills referral code
const SignupPage = ({ defaultReferralCode = "" }) => {
  const [position, setPosition] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [signupCount, setSignupCount] = useState(null);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || "http://localhost:5000");
    socket.on("signup-count", ({ count }) => setSignupCount(count));
    return () => socket.disconnect();
  }, []);

  return (
    <div className="container">
      {position && <Confetti recycle={false} numberOfPieces={300} />}
      <img src={logo} alt="Logo" className="logo" />
      <h1>Join the Waitlist!</h1>
      {signupCount && (
        <p className="signup-counter">🔥 {signupCount.toLocaleString()} people already waiting</p>
      )}
      {!position ? (
        <SignupForm
          setPosition={setPosition}
          setReferralCode={setReferralCode}
          setUserEmail={setUserEmail}
          defaultReferralCode={defaultReferralCode}
        />
      ) : (
        <PositionDisplay
          position={position}
          referralCode={referralCode}
          userEmail={userEmail}
        />
      )}
      <div className="footer">© Roshini Sivakumar</div>
    </div>
  );
};

// Reads :code from URL and passes it as the default referral code
const ReferralLanding = () => {
  const { code } = useParams();
  return <SignupPage defaultReferralCode={code || ""} />;
};

// Check position page wrapper
const CheckPage = () => (
  <div className="container check-container">
    <img src={logo} alt="Logo" className="logo" />
    <CheckPosition />
    <div className="footer">© Roshini Sivakumar</div>
  </div>
);

// Admin dashboard page wrapper
const AdminPage = () => (
  <div className="container admin-container">
    <img src={logo} alt="Logo" className="logo" />
    <AdminDashboard />
    <div className="footer">© Roshini Sivakumar</div>
  </div>
);

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignupPage />} />
        <Route path="/referral/:code" element={<ReferralLanding />} />
        <Route path="/check" element={<CheckPage />} />
        <Route path="/status" element={<CheckPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
};

export default App;
