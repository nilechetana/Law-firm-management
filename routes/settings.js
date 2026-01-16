const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================================
   RATE CARDS
================================ */

// Get rate cards
router.get("/api/settings/rate-cards", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM rate_cards ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rate cards" });
  }
});

// Create rate card
router.post("/api/settings/rate-cards", async (req, res) => {
  try {
    const { name, default_hourly_rate, role_rates } = req.body;

    const result = await db.query(
      `INSERT INTO rate_cards (name, default_hourly_rate, role_rates)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, default_hourly_rate, role_rates]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create rate card" });
  }
});

/* ================================
   ACTIVITY TYPES
================================ */

// Get activity types
router.get("/api/settings/activity-types", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM activity_types ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch activity types" });
  }
});

// Create activity type
router.post("/api/settings/activity-types", async (req, res) => {
  try {
    const { name, default_billable, default_rate_override } = req.body;

    const result = await db.query(
      `INSERT INTO activity_types 
       (name, default_billable, default_rate_override)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, default_billable, default_rate_override]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create activity type" });
  }
});

/* ================================
   EXPENSE CATEGORIES (🔥 FIXED)
================================ */

// Get expense categories
router.get("/api/settings/expense-categories", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM expense_categories ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Expense category fetch error:", err);
    res.status(500).json({ error: "Failed to fetch expense categories" });
  }
});

// Create expense category
router.post("/api/settings/expense-categories", async (req, res) => {
  try {
    const { name, taxable_default } = req.body;

    const result = await db.query(
      `INSERT INTO expense_categories (name, taxable_default)
       VALUES ($1, $2)
       RETURNING *`,
      [name, taxable_default === true]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Expense category create error:", err);
    res.status(500).json({ error: "Failed to create expense category" });
  }
});

module.exports = router;
