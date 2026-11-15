const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
router.use(adminAuth);

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - AdminKey: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSignups:
 *                   type: integer
 *                 totalReferrals:
 *                   type: integer
 *                 topReferrers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recentSignups:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/stats", async (req, res, next) => {
  try {
    const [totalSignups, topReferrers, recentSignups, referralAgg] = await Promise.all([
      Customer.countDocuments(),
      Customer.find().sort({ referralCount: -1 }).limit(10).select("name email referralCount position"),
      Customer.find().sort({ createdAt: -1 }).limit(10).select("name email position createdAt"),
      Customer.aggregate([{ $group: { _id: null, total: { $sum: "$referralCount" } } }]),
    ]);
    res.json({
      totalSignups,
      totalReferrals: referralAgg[0]?.total || 0,
      topReferrers,
      recentSignups,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/customers:
 *   get:
 *     summary: List all customers (paginated)
 *     tags: [Admin]
 *     security:
 *       - AdminKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [position, createdAt, referralCount]
 *           default: position
 *     responses:
 *       200:
 *         description: Paginated customer list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get("/customers", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || "position";
    const allowedSorts = ["position", "createdAt", "referralCount"];
    const sortField = allowedSorts.includes(sort) ? sort : "position";
    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      Customer.find().sort({ [sortField]: 1 }).skip(skip).limit(limit).select("-__v"),
      Customer.countDocuments(),
    ]);
    res.json({ customers, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
