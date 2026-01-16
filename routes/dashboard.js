const express = require("express");
const router = express.Router();
const pool = require("../db");

/* ----------------------------------------
   1. Billing Summary (Dashboard Card)
   GET /api/dashboard/billing-summary
-----------------------------------------*/
router.get("/api/dashboard/billing-summary", async (req, res) => {
  try {
    const billedResult = await pool.query(`
      SELECT COALESCE(SUM(grand_total), 0) AS total_billed
      FROM invoices
    `);

    const paidResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_paid
      FROM payments
    `);

    const totalBilled = Number(billedResult.rows[0].total_billed);
    const totalPaid = Number(paidResult.rows[0].total_paid);

    res.json({
      totalBilled,
      totalPaid,
      outstanding: totalBilled - totalPaid
    });
  } catch (err) {
    console.error("Dashboard billing summary error:", err);
    res.status(500).json({ error: "Failed to load billing summary" });
  }
});

/* ----------------------------------------
   2. Invoice Ageing (Dashboard Card)
   GET /api/dashboard/billing-ageing
-----------------------------------------*/
router.get("/api/dashboard/billing-ageing", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 0 AND 30 THEN grand_total ELSE 0 END) AS d0_30,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN grand_total ELSE 0 END) AS d31_60,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN grand_total ELSE 0 END) AS d61_90,
        SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN grand_total ELSE 0 END) AS d90_plus
      FROM invoices
      WHERE due_date IS NOT NULL
    `);

    res.json({
      d0_30: Number(result.rows[0].d0_30) || 0,
      d31_60: Number(result.rows[0].d31_60) || 0,
      d61_90: Number(result.rows[0].d61_90) || 0,
      d90_plus: Number(result.rows[0].d90_plus) || 0
    });
  } catch (err) {
    console.error("Dashboard ageing error:", err);
    res.status(500).json({ error: "Failed to load ageing data" });
  }
});

/* ----------------------------------------
   3. Latest Payments (Dashboard Table)
   GET /api/dashboard/latest-payments
-----------------------------------------*/
router.get("/api/dashboard/latest-payments", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.paid_on,
        p.amount,
        p.invoice_id,
        COALESCE(m.name, '-') AS matter_name,
        COALESCE(c.name, 'Unknown Client') AS client_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN matters m ON i.case_id = m.id
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY p.paid_on DESC
      LIMIT 5
    `);

    res.json({ payments: result.rows });
  } catch (err) {
    console.error("Dashboard latest payments error:", err);
    res.status(500).json({ error: "Failed to load latest payments" });
  }
});

module.exports = router;
