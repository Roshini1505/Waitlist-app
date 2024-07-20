const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const customerRoutes = require("./routes/customers");

// load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(bodyParser.json());

// connect to mongodB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// error message
db.on("error", console.error.bind(console, "connection error:"));

// success message
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.use("/api/customers", customerRoutes);

// start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
