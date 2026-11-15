const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Body parsing
app.use(express.json());

// Security headers (Helmet with zero-crash fallback)
try {
  const helmet = require("helmet");
  app.use(helmet({ contentSecurityPolicy: false })); // allow inline assets & styles
} catch (e) {
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });
}

// Request logging (Morgan with fallback)
try {
  const morgan = require("morgan");
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
} catch (e) {
  app.use((req, res, next) => {
    if (!req.url.startsWith("/assets")) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });
}

// CORS
app.use(cors());

// Rate limiting (with zero-crash fallback)
let signupLimiter = (req, res, next) => next();
try {
  const rateLimit = require("express-rate-limit");
  signupLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { message: "Too many requests, please try again later." },
  });
} catch (e) {
  // Rate limit module optional
}

// Routes
const apiRouter = require("./src/routes/api");
const { syncLegacyData } = require("./src/db/migrate");

app.use("/api", signupLimiter, apiRouter);
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Swagger Docs (optional)
try {
  const swaggerUi = require("swagger-ui-express");
  const swaggerSpec = require("./config/swagger");
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} catch (e) {
  app.get("/api/docs", (req, res) => {
    res.json({ message: "Swagger UI optional. API endpoints: POST /api/customers/signup, GET /api/customers/position/:email, GET /api/admin/stats" });
  });
}

// Serve Frontend Static Web Application
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// Client-side routes fallback to index.html (for /referral/:code, /check, /admin)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "API endpoint not found" });
  }
  res.sendFile(path.join(publicPath, "index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(500).json({ message: "Internal server error" });
});

// HTTP Server & Socket.io setup (with fallback)
const httpServer = http.createServer(app);
let io = null;
try {
  const { Server } = require("socket.io");
  io = new Server(httpServer, { cors: { origin: "*" } });
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });
} catch (e) {
  io = { emit: () => {} };
}
app.set("io", io);

// Start HTTP server immediately
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Waitlist Application is LIVE at: http://localhost:${PORT}`);
});

// Connect to MongoDB & Initialize Lobby Data Layer
console.log("Connecting to MongoDB Atlas...");
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB Atlas");
    await syncLegacyData();
  })
  .catch(async (err) => {
    console.error("MongoDB connection status:", err.message);
    await syncLegacyData();
  });
