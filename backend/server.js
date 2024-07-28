const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const validator = require("validator");
const Customer = require("./models/Customer");
const emailjs = require("emailjs-com"); // Static import of EmailJS

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
})();

// Function to send email
const sendEmail = async (templateParams) => {
  const serviceID = process.env.EMAILJS_SERVICE_ID;
  const templateID = process.env.EMAILJS_TEMPLATE_ID;
  const userID = process.env.EMAILJS_USER_ID;

  try {
    const response = await emailjs.send(
      serviceID,
      templateID,
      templateParams,
      userID
    );
    console.log("Email sent successfully:", response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Signup route
app.post("/api/customers/signup", async (req, res) => {
  const { email, referralLink } = req.body;

  // Validate email
  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ message: "Valid email is required" });
  }

  try {
    // Check for existing customer with the same email
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Determine the position for the new customer
    let position = 99;
    const lastCustomer = await Customer.findOne().sort({ position: -1 });
    if (lastCustomer) {
      position = lastCustomer.position + 1;
    }

    // Ensure a valid referral link is set
    let newReferralLink = referralLink || uuidv4(); // Generate a new referral link if not provided

    // Check for existing referral links
    let existingReferral = await Customer.findOne({
      referralLink: newReferralLink,
    });
    while (existingReferral) {
      // If the generated referral link already exists, generate a new one
      newReferralLink = uuidv4();
      existingReferral = await Customer.findOne({
        referralLink: newReferralLink,
      });
    }

    // Create a new customer
    const newCustomer = new Customer({
      email,
      referralLink: newReferralLink, // Ensure this is never null
      position,
    });
    await newCustomer.save();

    // Prepare and send the confirmation email
    const templateParams = {
      to_email: email,
      message: "Thank you for signing up!",
      referralLink: `${process.env.BASE_URL}/referral/${newReferralLink}`,
    };

    // Log environment variables for debugging
    console.log("Service ID:", process.env.EMAILJS_SERVICE_ID);
    console.log("Template ID:", process.env.EMAILJS_TEMPLATE_ID);
    console.log("User ID:", process.env.EMAILJS_USER_ID);

    await sendEmail(templateParams);

    // Respond with success
    res.status(201).json({
      message:
        "Customer signed up successfully. Check your email for confirmation.",
      position: newCustomer.position,
      referralLink: `${process.env.BASE_URL}/referral/${newReferralLink}`,
    });
  } catch (error) {
    // Log the error and respond with a 500 status
    console.error("An error occurred during signup:", error);
    res.status(500).json({
      message: "An internal server error occurred",
      error: error.message,
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
