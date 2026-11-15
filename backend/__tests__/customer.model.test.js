"use strict";

// Mock mongoose.connect so it never tries a real DB
jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  actual.connect = jest.fn().mockResolvedValue(undefined);
  return actual;
});

const mongoose = require("mongoose");
const Customer = require("../models/Customer");

describe("Customer model schema", () => {
  it("requires name field — validation fails without name", async () => {
    const c = new Customer({ email: "test@example.com", position: 1 });
    const err = await c.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty("name");
  });

  it("requires email field — validation fails without email", async () => {
    const c = new Customer({ name: "Alice", position: 1 });
    const err = await c.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty("email");
  });

  it("requires position field — validation fails without position", async () => {
    const c = new Customer({ name: "Alice", email: "alice@example.com" });
    const err = await c.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty("position");
  });

  it("defaults referralCount to 0", () => {
    const c = new Customer({ name: "Alice", email: "alice@example.com", position: 1 });
    expect(c.referralCount).toBe(0);
  });

  it("defaults referredBy to null", () => {
    const c = new Customer({ name: "Alice", email: "alice@example.com", position: 1 });
    expect(c.referredBy).toBeNull();
  });

  it("has timestamps (createdAt / updatedAt) in schema", () => {
    // Schema paths won't include createdAt directly on the doc until saved,
    // but we can verify the schema options
    const schemaPaths = Customer.schema.paths;
    // mongoose timestamps adds createdAt / updatedAt to path obj
    expect(Customer.schema.options.timestamps).toBe(true);
  });

  it("stores name with trim applied", () => {
    const c = new Customer({ name: "  Alice  ", email: "alice@example.com", position: 1 });
    expect(c.name).toBe("Alice");
  });

  it("stores email lowercased and trimmed", () => {
    const c = new Customer({ name: "Alice", email: "  ALICE@EXAMPLE.COM  ", position: 1 });
    expect(c.email).toBe("alice@example.com");
  });

  it("passes validation with all required fields present", async () => {
    const c = new Customer({ name: "Alice", email: "alice@example.com", position: 1 });
    const err = c.validateSync();
    expect(err).toBeUndefined();
  });

  it("allows optional referralCode field", () => {
    const c = new Customer({
      name: "Bob",
      email: "bob@example.com",
      position: 2,
      referralCode: "some-uuid",
    });
    expect(c.referralCode).toBe("some-uuid");
    const err = c.validateSync();
    expect(err).toBeUndefined();
  });
});
