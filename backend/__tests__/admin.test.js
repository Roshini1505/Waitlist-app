"use strict";

process.env.BASE_URL = "http://localhost:3000";
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
  app.use("/api/admin", require("../routes/admin"));
  app.use((err, req, res, next) => {
    res.status(500).json({ message: "Internal server error" });
  });
  return app;
}

describe("Admin routes", () => {
  let app;

  beforeAll(() => {
    process.env.ADMIN_KEY = "test-key";
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Auth middleware tests ----
  it("returns 401 without x-admin-key header on /stats", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/unauthorized/i);
  });

  it("returns 401 with wrong admin key on /stats", async () => {
    const res = await request(app)
      .get("/api/admin/stats")
      .set("x-admin-key", "wrong-key");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/unauthorized/i);
  });

  it("returns 401 without x-admin-key header on /customers", async () => {
    const res = await request(app).get("/api/admin/customers");
    expect(res.status).toBe(401);
  });

  // ---- Stats tests ----
  it("returns stats with correct admin key", async () => {
    // Mock all the Promise.all calls in /stats handler
    jest.spyOn(Customer, "countDocuments").mockResolvedValueOnce(42);

    // find().sort().limit().select() chain mock
    const selectMock = jest.fn().mockResolvedValue([
      { name: "Alice", email: "alice@example.com", referralCount: 10, position: 1 },
    ]);
    const limitMock = jest.fn().mockReturnValue({ select: selectMock });
    const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
    const findMock = jest.spyOn(Customer, "find").mockReturnValue({ sort: sortMock });

    // aggregate mock
    jest.spyOn(Customer, "aggregate").mockResolvedValueOnce([{ _id: null, total: 55 }]);

    const res = await request(app)
      .get("/api/admin/stats")
      .set("x-admin-key", "test-key");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalSignups");
    expect(res.body).toHaveProperty("totalReferrals");
    expect(res.body).toHaveProperty("topReferrers");
    expect(res.body).toHaveProperty("recentSignups");
  });

  // ---- Customers list tests ----
  it("returns paginated customers list with correct admin key", async () => {
    const fakeCustomers = [
      { _id: "1", name: "Alice", email: "alice@example.com", position: 1, referralCount: 3 },
      { _id: "2", name: "Bob", email: "bob@example.com", position: 2, referralCount: 1 },
    ];

    // Chain: find().sort().skip().limit().select()
    const selectMock = jest.fn().mockResolvedValue(fakeCustomers);
    const limitMock = jest.fn().mockReturnValue({ select: selectMock });
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
    jest.spyOn(Customer, "find").mockReturnValue({ sort: sortMock });
    jest.spyOn(Customer, "countDocuments").mockResolvedValueOnce(2);

    const res = await request(app)
      .get("/api/admin/customers")
      .set("x-admin-key", "test-key");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("customers");
    expect(Array.isArray(res.body.customers)).toBe(true);
    expect(res.body).toHaveProperty("total", 2);
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("totalPages", 1);
  });

  it("respects page and limit query params", async () => {
    const fakeCustomers = [
      { _id: "3", name: "Carol", email: "carol@example.com", position: 3, referralCount: 0 },
    ];

    const selectMock = jest.fn().mockResolvedValue(fakeCustomers);
    const limitMock = jest.fn().mockReturnValue({ select: selectMock });
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
    jest.spyOn(Customer, "find").mockReturnValue({ sort: sortMock });
    jest.spyOn(Customer, "countDocuments").mockResolvedValueOnce(50);

    const res = await request(app)
      .get("/api/admin/customers?page=3&limit=10")
      .set("x-admin-key", "test-key");

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(3);
    expect(res.body.totalPages).toBe(5);
    // skip should have been called with (page-1)*limit = 20
    expect(skipMock).toHaveBeenCalledWith(20);
    expect(limitMock).toHaveBeenCalledWith(10);
  });

  it("uses default page=1 and limit=20 when query params are absent", async () => {
    const selectMock = jest.fn().mockResolvedValue([]);
    const limitMock = jest.fn().mockReturnValue({ select: selectMock });
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
    jest.spyOn(Customer, "find").mockReturnValue({ sort: sortMock });
    jest.spyOn(Customer, "countDocuments").mockResolvedValueOnce(0);

    const res = await request(app)
      .get("/api/admin/customers")
      .set("x-admin-key", "test-key");

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(20);
  });
});
