"use strict";

process.env.BASE_URL = "http://localhost:3000";
process.env.ADMIN_KEY = "test-key";
process.env.NODE_ENV = "test";

// Mock email service BEFORE requiring app / routes
jest.mock("../services/emailService", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendCouponEmail: jest.fn().mockResolvedValue(true),
}));

// Mock socket.io so server.js / routes don't blow up
jest.mock("socket.io", () => ({
  Server: jest.fn().mockReturnValue({
    on: jest.fn(),
    emit: jest.fn(),
  }),
}));

// Mock mongoose.connect so the app never tries a real DB
jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  actual.connect = jest.fn().mockResolvedValue(undefined);
  return actual;
});

const request = require("supertest");
const express = require("express");
const Customer = require("../models/Customer");
const { sendWelcomeEmail, sendCouponEmail } = require("../services/emailService");

// Build a minimal test app that mirrors server.js without httpServer.listen
function buildApp() {
  const app = express();
  app.use(express.json());
  app.set("io", { emit: jest.fn() });
  app.use("/api/customers", require("../routes/customers"));
  // Global error handler
  app.use((err, req, res, next) => {
    res.status(500).json({ message: "Internal server error" });
  });
  return app;
}

describe("POST /api/customers/signup", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 if name is missing", async () => {
    const res = await request(app)
      .post("/api/customers/signup")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  it("returns 400 if name is only whitespace", async () => {
    const res = await request(app)
      .post("/api/customers/signup")
      .send({ name: "   ", email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  it("returns 400 if email is missing", async () => {
    const res = await request(app)
      .post("/api/customers/signup")
      .send({ name: "Alice" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it("returns 400 if email is invalid", async () => {
    const res = await request(app)
      .post("/api/customers/signup")
      .send({ name: "Alice", email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it("returns 409 if email already registered", async () => {
    jest.spyOn(Customer, "findOne").mockResolvedValueOnce({
      _id: "existing-id",
      email: "alice@example.com",
      name: "Alice",
    });

    const res = await request(app)
      .post("/api/customers/signup")
      .send({ name: "Alice", email: "alice@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it("returns 201 with position and referralLink on success (first signup gets position 1)", async () => {
    // findOne for duplicate check → null
    // findOne().sort() for last customer → null (first user)
    jest.spyOn(Customer, "findOne")
      .mockResolvedValueOnce(null)   // duplicate check
      .mockResolvedValueOnce(null);  // last customer (sort)

    jest.spyOn(Customer.prototype, "save").mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/customers/signup")
      .send({ name: "Alice", email: "alice@example.com" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("position", 1);
    expect(res.body).toHaveProperty("referralLink");
    expect(res.body.referralLink).toMatch(/^http:\/\/localhost:3000\/referral\//);
    expect(res.body.message).toMatch(/signed up/i);
  });

  it("second signup gets position 2", async () => {
    const fakeLastCustomer = { position: 1 };

    jest.spyOn(Customer, "findOne")
      .mockResolvedValueOnce(null)            // duplicate check
      .mockResolvedValueOnce(fakeLastCustomer); // last customer → position 1

    jest.spyOn(Customer.prototype, "save").mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/customers/signup")
      .send({ name: "Bob", email: "bob@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.position).toBe(2);
  });

  it("sends welcome email after successful signup", async () => {
    jest.spyOn(Customer, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    jest.spyOn(Customer.prototype, "save").mockResolvedValueOnce(undefined);

    await request(app)
      .post("/api/customers/signup")
      .send({ name: "Carol", email: "carol@example.com" });

    // sendWelcomeEmail is called non-blocking (.catch), so give it a tick
    await new Promise(r => setTimeout(r, 10));
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      "carol@example.com",
      "Carol",
      expect.stringContaining("/referral/"),
      1
    );
  });

  it("decrements referrer position when valid referralCode is provided", async () => {
    const referrerSave = jest.fn().mockResolvedValue(undefined);
    const mockReferrer = {
      _id: "ref-id",
      email: "referrer@example.com",
      name: "Referrer",
      position: 5,
      referralCount: 2,
      save: referrerSave,
    };

    jest.spyOn(Customer, "findOne")
      .mockResolvedValueOnce(null)         // duplicate check for new user
      .mockResolvedValueOnce(null)         // last customer (position assignment)
      .mockResolvedValueOnce(mockReferrer); // findOne({ referralCode })

    jest.spyOn(Customer.prototype, "save").mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/customers/signup")
      .send({ name: "Dave", email: "dave@example.com", referralCode: "some-valid-code" });

    expect(res.status).toBe(201);
    // Allow async referrer.save to settle
    await new Promise(r => setTimeout(r, 10));
    expect(mockReferrer.position).toBe(4);
    expect(mockReferrer.referralCount).toBe(3);
    expect(referrerSave).toHaveBeenCalled();
  });

  it("triggers coupon email when referrer reaches position 1", async () => {
    const referrerSave = jest.fn().mockResolvedValue(undefined);
    const mockReferrer = {
      _id: "ref-id",
      email: "top@example.com",
      name: "TopUser",
      position: 2, // will become 1 after decrement
      referralCount: 0,
      save: referrerSave,
    };

    jest.spyOn(Customer, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockReferrer);

    jest.spyOn(Customer.prototype, "save").mockResolvedValueOnce(undefined);

    await request(app)
      .post("/api/customers/signup")
      .send({ name: "Eve", email: "eve@example.com", referralCode: "code-for-top" });

    await new Promise(r => setTimeout(r, 20));
    expect(mockReferrer.position).toBe(1);
    expect(sendCouponEmail).toHaveBeenCalledWith(
      "top@example.com",
      "TopUser",
      expect.stringMatching(/^COUPON-/)
    );
  });

  it("does NOT trigger coupon email when referrer position stays above 1", async () => {
    const referrerSave = jest.fn().mockResolvedValue(undefined);
    const mockReferrer = {
      email: "mid@example.com",
      name: "MidUser",
      position: 5,
      referralCount: 1,
      save: referrerSave,
    };

    jest.spyOn(Customer, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockReferrer);

    jest.spyOn(Customer.prototype, "save").mockResolvedValueOnce(undefined);

    await request(app)
      .post("/api/customers/signup")
      .send({ name: "Frank", email: "frank@example.com", referralCode: "some-code" });

    await new Promise(r => setTimeout(r, 20));
    expect(mockReferrer.position).toBe(4);
    expect(sendCouponEmail).not.toHaveBeenCalled();
  });
});
