"use strict";

process.env.BASE_URL = "http://localhost:3000";
process.env.ADMIN_KEY = "test-key";
process.env.NODE_ENV = "test";

jest.mock("../services/emailService", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendCouponEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock("socket.io", () => ({
  Server: jest.fn().mockReturnValue({ on: jest.fn(), emit: jest.fn() }),
}));

jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  actual.connect = jest.fn().mockResolvedValue(undefined);
  return actual;
});

const request = require("supertest");
const express = require("express");
const Customer = require("../models/Customer");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.set("io", { emit: jest.fn() });
  app.use("/api/customers", require("../routes/customers"));
  app.use((err, req, res, next) => {
    res.status(500).json({ message: "Internal server error" });
  });
  return app;
}

describe("GET /api/customers/position/:email", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 if customer not found", async () => {
    jest.spyOn(Customer, "findOne").mockResolvedValueOnce(null);

    const res = await request(app).get("/api/customers/position/unknown@example.com");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("returns position, referralCount, and referralLink for existing customer", async () => {
    const mockCustomer = {
      email: "alice@example.com",
      position: 3,
      referralCount: 5,
      referralCode: "abc-123-uuid",
    };
    jest.spyOn(Customer, "findOne").mockResolvedValueOnce(mockCustomer);

    const res = await request(app).get("/api/customers/position/alice@example.com");

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(3);
    expect(res.body.referralCount).toBe(5);
    expect(res.body.referralLink).toBe("http://localhost:3000/referral/abc-123-uuid");
  });

  it("normalizes email to lowercase before lookup", async () => {
    const mockCustomer = {
      email: "alice@example.com",
      position: 2,
      referralCount: 1,
      referralCode: "code-xyz",
    };
    const spy = jest.spyOn(Customer, "findOne").mockResolvedValueOnce(mockCustomer);

    await request(app).get("/api/customers/position/ALICE@EXAMPLE.COM");

    expect(spy).toHaveBeenCalledWith({ email: "alice@example.com" });
  });

  it("builds referralLink using BASE_URL env variable", async () => {
    const mockCustomer = {
      email: "bob@example.com",
      position: 7,
      referralCount: 0,
      referralCode: "ref-code-bob",
    };
    jest.spyOn(Customer, "findOne").mockResolvedValueOnce(mockCustomer);

    const res = await request(app).get("/api/customers/position/bob@example.com");

    expect(res.body.referralLink).toMatch(/^http:\/\/localhost:3000\/referral\//);
    expect(res.body.referralLink).toContain("ref-code-bob");
  });
});
