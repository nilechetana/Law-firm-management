const express = require("express");
const router = express.Router();
const pool = require("../db");

/* =====================================================
   EXPORT PAYMENTS CSV  (MUST BE AT TOP)
   URL: /api/reports/billing/payments.csv
===================================================== */
router.get("/api/reports/billing/payments.csv", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id AS payment_id,
        TO_CHAR(p.paid_on, 'YYYY-MM-DD') AS paid_on,
        p.amount,
        p.invoice_id,
        COALESCE(c.name, 'Unknown Client') AS client_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY p.id DESC
    `);

    let csv = "Payment ID,Paid On,Amount,Invoice ID,Client\n";

    result.rows.forEach(row => {
      csv += `${row.payment_id},${row.paid_on || ""},${row.amount},${row.invoice_id || ""},${row.client_name}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=billing_payments.csv"
    );

    return res.send(csv);
  } catch (err) {
    console.error("CSV Export Error:", err);
    return res.status(500).send("Failed to export payments CSV");
  }
});

// ================================
// UI route
// ================================
router.get("/reports/billing", (req, res) => {
  res.render("reports/billing");
});

// ================================
// Billing summary API
// ================================
router.get("/api/reports/billing/summary", async (req, res) => {
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
    console.error("Billing summary error:", err);
    res.status(500).json({
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0
    });
  }
});

// ================================
// Invoice ageing API
// ================================
router.get("/api/reports/billing/ageing", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 0 AND 30 THEN grand_total ELSE 0 END) AS d_0_30,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN grand_total ELSE 0 END) AS d_31_60,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN grand_total ELSE 0 END) AS d_61_90,
        SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN grand_total ELSE 0 END) AS d_90_plus
      FROM invoices
      WHERE due_date IS NOT NULL
    `);

    res.json({
      d0_30: Number(result.rows[0].d_0_30) || 0,
      d31_60: Number(result.rows[0].d_31_60) || 0,
      d61_90: Number(result.rows[0].d_61_90) || 0,
      d90_plus: Number(result.rows[0].d_90_plus) || 0
    });

  } catch (err) {
    console.error("Invoice ageing error:", err);
    res.status(500).json({
      d0_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0
    });
  }
});

// ================================
// Payments trend API
// ================================
router.get("/api/reports/billing/payments-trend", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        paid_on,
        invoice_id,
        amount,
        payment_method,
        reference
      FROM payments
      ORDER BY paid_on DESC
      LIMIT 20
    `);

    res.json({ payments: result.rows });
  } catch (err) {
    console.error("Payments trend error:", err);
    res.status(500).json({ error: "Failed to load payment trend" });
  }
});

// ================================
// Matter / Case Billing Summary
// ================================
router.get("/api/reports/billing/matter/:matterId", async (req, res) => {
  const { matterId } = req.params;

  try {
    const billedResult = await pool.query(`
      SELECT COALESCE(SUM(grand_total), 0) AS total_billed
      FROM invoices
      WHERE case_id = $1
    `, [matterId]);

    const paidResult = await pool.query(`
      SELECT COALESCE(SUM(p.amount), 0) AS total_paid
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE i.case_id = $1
    `, [matterId]);

    const unbilledResult = await pool.query(`
      SELECT
        (
          SELECT COUNT(*) FROM time_entries
          WHERE matter_id = $1 AND invoice_id IS NULL
        ) +
        (
          SELECT COUNT(*) FROM expenses
          WHERE matter_id = $1 AND invoice_id IS NULL
        ) AS unbilled_count
    `, [matterId]);

    const totalBilled = Number(billedResult.rows[0].total_billed);
    const totalPaid = Number(paidResult.rows[0].total_paid);

    res.json({
      totalBilled,
      totalPaid,
      outstanding: totalBilled - totalPaid,
      unbilledCount: Number(unbilledResult.rows[0].unbilled_count)
    });

  } catch (err) {
    console.error("Matter billing summary error:", err);
    res.status(500).json({
      error: "Failed to load matter billing summary"
    });
  }
});
/* =====================================================
   EXPORT INVOICE AGEING CSV
   URL: /api/reports/billing/ageing.csv
===================================================== */
router.get("/api/reports/billing/ageing.csv", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 0 AND 30 THEN grand_total ELSE 0 END) AS d_0_30,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN grand_total ELSE 0 END) AS d_31_60,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN grand_total ELSE 0 END) AS d_61_90,
        SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN grand_total ELSE 0 END) AS d_90_plus
      FROM invoices
      WHERE due_date IS NOT NULL
    `);

    let csv = "Age Bucket,Amount\n";
    csv += `0-30 Days,${result.rows[0].d_0_30 || 0}\n`;
    csv += `31-60 Days,${result.rows[0].d_31_60 || 0}\n`;
    csv += `61-90 Days,${result.rows[0].d_61_90 || 0}\n`;
    csv += `90+ Days,${result.rows[0].d_90_plus || 0}\n`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=invoice_ageing.csv"
    );

    return res.send(csv);
  } catch (err) {
    console.error("Ageing CSV Export Error:", err);
    return res.status(500).send("Failed to export ageing CSV");
  }
});

module.exports = router;
