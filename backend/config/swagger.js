// OpenAPI 3.0 Specification for Lobby (LaunchOS) Multi-Tenant SaaS Platform

let swaggerSpec = null;

try {
  const swaggerJSDoc = require("swagger-jsdoc");

  swaggerSpec = swaggerJSDoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Lobby (LaunchOS) API Gateway",
        version: "2.0.0",
        description: "Enterprise multi-tenant product launch and intelligent waitlist orchestration platform.",
        contact: {
          name: "Lobby Platform Engineering",
          url: "https://lobby.io",
        },
      },
      servers: [
        { url: "http://localhost:5000", description: "Local Development Server" },
      ],
      components: {
        securitySchemes: {
          AdminKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "x-admin-key",
            description: "Administrative access token or secret key (default: admin123)",
          },
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
        schemas: {
          Campaign: {
            type: "object",
            properties: {
              id: { type: "string", example: "camp_flagship_iphone" },
              title: { type: "string", example: "Apple iPhone 16 Pro Exclusive Launch" },
              slug: { type: "string", example: "iphone-16-pro" },
              description: { type: "string" },
              status: { type: "string", enum: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] },
              currentCount: { type: "integer", example: 142 },
              maxCapacity: { type: "integer", example: 50000 },
            },
          },
          Member: {
            type: "object",
            properties: {
              id: { type: "string", example: "mem_9f8e7d6c" },
              name: { type: "string", example: "Sarah Connor" },
              email: { type: "string", example: "sarah@example.com" },
              position: { type: "integer", example: 1 },
              score: { type: "integer", example: 40 },
              referralCount: { type: "integer", example: 4 },
              referralLink: { type: "string", example: "http://localhost:5000/referral/9f8e7d6c" },
            },
          },
          ErrorResponse: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Validation failed" },
            },
          },
        },
      },
      paths: {
        "/api/v1/campaigns": {
          get: {
            summary: "List all active campaigns",
            tags: ["Campaigns"],
            responses: {
              200: {
                description: "Array of available product launch campaigns",
              },
            },
          },
        },
        "/api/v1/campaigns/{slug}": {
          get: {
            summary: "Get campaign configuration by slug",
            tags: ["Campaigns"],
            parameters: [
              { name: "slug", in: "path", required: true, schema: { type: "string" }, example: "iphone-16-pro" },
            ],
            responses: {
              200: { description: "Campaign details" },
              404: { description: "Campaign not found" },
            },
          },
        },
        "/api/v1/campaigns/{slug}/register": {
          post: {
            summary: "Register customer for a campaign queue",
            tags: ["Registrations"],
            parameters: [
              { name: "slug", in: "path", required: true, schema: { type: "string" }, example: "iphone-16-pro" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name", "email"],
                    properties: {
                      name: { type: "string", example: "John Doe" },
                      email: { type: "string", format: "email", example: "john@example.com" },
                      referralCode: { type: "string", example: "c5a17b98-3820-43b6-9bb2-2f3b92487e61" },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: "Successfully registered in queue" },
              400: { description: "Validation error" },
              403: { description: "Campaign closed or at capacity" },
              409: { description: "Email already registered in this campaign" },
            },
          },
        },
        "/api/v1/campaigns/{slug}/members/{email}": {
          get: {
            summary: "Check participant standing by email",
            tags: ["Registrations"],
            parameters: [
              { name: "slug", in: "path", required: true, schema: { type: "string" } },
              { name: "email", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              200: { description: "Participant rank, score, referrals, and coupons" },
              404: { description: "Participant not found" },
            },
          },
        },
        "/api/v1/campaigns/{slug}/leaderboard": {
          get: {
            summary: "Retrieve verified leaderboard",
            tags: ["Leaderboard"],
            parameters: [
              { name: "slug", in: "path", required: true, schema: { type: "string" } },
              { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            ],
            responses: {
              200: { description: "Top ranked participants" },
            },
          },
        },
        "/api/v1/admin/stats": {
          get: {
            summary: "Retrieve multi-tenant administrative telemetry",
            tags: ["Admin"],
            security: [{ AdminKeyAuth: [] }],
            responses: {
              200: { description: "Aggregated metrics, fraud signals, and audit stream" },
              401: { description: "Unauthorized" },
            },
          },
        },
        "/api/admin/customers": {
          get: {
            summary: "Paginated customer queue roster",
            tags: ["Admin"],
            security: [{ AdminKeyAuth: [] }],
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
              { name: "sort", in: "query", schema: { type: "string", enum: ["position", "createdAt", "referralCount"] } },
            ],
            responses: {
              200: { description: "Paginated customer records" },
            },
          },
        },
      },
    },
    apis: ["./src/routes/*.js", "./routes/*.js"],
  });
} catch (e) {
  // If swagger-jsdoc is not available, provide a clean JSON fallback
  swaggerSpec = {
    openapi: "3.0.0",
    info: { title: "Lobby API Gateway", version: "2.0.0" },
    paths: {},
  };
}

module.exports = swaggerSpec;
