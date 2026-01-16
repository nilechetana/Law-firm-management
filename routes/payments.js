const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/api/payments", async (req, res) => {
  const { from, to, matterId, invoiceId } = req.query;

  let conditions = [];
  let values = [];
  let i = 1;

  if (from) {
    conditions.push(`p.created_at >= $${i++}`);
    values.push(from);
  }

  if (to) {
    conditions.push(`p.created_at <= $${i++}`);
    values.push(to);
  }

  if (matterId) {
    conditions.push(`p.matter_id = $${i++}`);
    values.push(matterId);
  }

  if (invoiceId) {
    conditions.push(`p.invoice_id = $${i++}`);
    values.push(invoiceId);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  try {
    const result = await pool.query(
      `
      SELECT
        p.created_at AS date,
        i.id AS invoice,
        m.title AS matter,
        c.name AS client,
        p.amount,
        p.reference
      FROM payments p
      LEFT JOIN invoices i ON i.id = p.invoice_id
      LEFT JOIN matters m ON m.id = p.matter_id
      LEFT JOIN clients c ON c.id = m.client_id
      ${whereClause}
      ORDER BY p.created_at DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Payments list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
