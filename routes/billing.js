const express = require("express");
const router = express.Router();
const pool = require("../db");
function calculateInvoiceTotals(items) {
  let subtotal = 0;
  let taxTotal = 0;

  items.forEach(i => {
    const base = i.quantity * i.rate;
    const tax = i.taxable ? (base * i.tax_rate / 100) : 0;

    subtotal += base;
    taxTotal += tax;
  });

  return {
    subtotal,
    tax: taxTotal,
    grand_total: subtotal + taxTotal
  };
}
/* ================= INVOICES UI ================= */
router.get("/invoices", (req, res) => {
  res.render("billing/invoices", { title: "Invoices" });
});

router.get("/invoices/new", (req, res) => {
  res.render("billing/invoice-new", { title: "Create Invoice" });
});

router.get("/invoices/:id", (req, res) => {
  res.render("billing/invoice-details", { title: "Invoice Detail" });
});

/* ================= TIME ENTRIES UI ================= */
router.get("/time-entries", (req, res) => {
  res.render("billing/time-entries", { title: "Time Entries" });
});

/* ================= EXPENSES UI ================= */
router.get("/expenses", (req, res) => {
  res.render("billing/expenses", { title: "Expenses" });
});

/* ================= CASES DROPDOWN ================= */
router.get("/api/cases", async (req, res) => {
  const r = await pool.query(`SELECT id, title FROM cases ORDER BY id DESC`);
  res.json({ success: true, cases: r.rows });
});

/* ================= TIME ENTRIES API ================= */
router.get("/api/time-entries", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        te.id,
        te.created_at::date AS date,
        c.title AS matter,
        te.activity,
        te.description,
        te.duration_minutes,
        te.rate,
        te.activity_type_id,
        te.rounding_minutes,
        te.internal_note,
        te.invoice_note,
        (te.duration_minutes / 60.0 * te.rate) AS amount,
        te.billable,
        te.status
      FROM time_entries te
      LEFT JOIN cases c ON c.id = te.matter_id
      ORDER BY te.created_at DESC
    `);
    res.json({ success: true, entries: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/time-entries", async (req, res) => {
  const {
    matter_id,
    activity,
    description,
    duration_minutes,
    rate,
    billable,
    activity_type_id,
    rounding_minutes,
    internal_note,
    invoice_note
  } = req.body;

  try {
    await pool.query(`
      INSERT INTO time_entries
      (
        matter_id,
        user_id,
        activity,
        description,
        duration_minutes,
        rate,
        billable,
        activity_type_id,
        rounding_minutes,
        internal_note,
        invoice_note,
        status
      )
      VALUES
      ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unbilled')
    `, [
      matter_id,
      activity,
      description,
      duration_minutes,
      rate,
      billable,
      activity_type_id || null,
      rounding_minutes || null,
      internal_note || null,
      invoice_note || null
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= EXPENSES API ================= */
router.get("/api/expenses", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        e.id,
        e.created_at::date AS date,
        c.title AS matter,
        e.amount,
        e.taxable,
        e.notes,
        e.status
      FROM expenses e
      LEFT JOIN cases c ON c.id = e.matter_id
      ORDER BY e.created_at DESC
    `);
    res.json({ success: true, expenses: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/expenses", async (req, res) => {
  const { matter_id, amount, taxable, notes } = req.body;
  try {
    await pool.query(`
      INSERT INTO expenses
      (matter_id, amount, taxable, notes, status)
      VALUES ($1, $2, $3, $4, 'unbilled')
    `, [matter_id, amount, taxable, notes]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= UNBILLED ITEMS ================= */
router.get("/api/unbilled-items/:case_id", async (req, res) => {
  try {
    const time = await pool.query(`
      SELECT id,'time' AS type,activity AS description,
      (duration_minutes / 60.0 * rate) AS amount
      FROM time_entries
      WHERE matter_id=$1 AND status='unbilled'
    `, [req.params.case_id]);

    const exp = await pool.query(`
      SELECT id,'expense' AS type,notes AS description,amount
      FROM expenses
      WHERE matter_id=$1 AND status='unbilled'
    `, [req.params.case_id]);

    res.json({ success: true, items: [...time.rows, ...exp.rows] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= INVOICES LIST API ================= */
router.get("/api/invoices", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        i.id,
        i.invoice_date,
        i.created_at,
        i.status,
        i.grand_total,
        c.name AS client_name,
        cs.title AS case_title
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN cases cs ON cs.id = i.case_id
      ORDER BY i.created_at DESC
    `);

    res.json({ success: true, invoices: r.rows });
  } catch (err) {
    console.error("Invoice list error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/invoices/:id/items", async (req, res) => {
  const { description, quantity, rate, taxable, tax_rate } = req.body;

  const base = quantity * rate;
  const tax_amount = taxable ? (base * tax_rate / 100) : 0;
  const total = base + tax_amount;

  await pool.query(`
    INSERT INTO invoice_items
    (invoice_id, description, quantity, rate, taxable, tax_rate, tax_amount, total)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
    req.params.id,
    description,
    quantity,
    quantity || 1,
    rate,
    taxable,
    tax_rate,
    tax_amount,
    total
  ]);

  res.json({ success: true });
});

router.get("/api/invoices/:id", async (req, res) => {
  const inv = await pool.query(`SELECT * FROM invoices WHERE id=$1`, [req.params.id]);
  if (!inv.rows.length) return res.json({ success: false });

  const items = await pool.query(
    `SELECT * FROM invoice_items WHERE invoice_id=$1`,
    [req.params.id]
  );

  res.json({ success: true, invoice: inv.rows[0], items: items.rows });
});
router.post("/api/invoices/preview", (req, res) => {
  const { items } = req.body;
  const totals = calculateInvoiceTotals(items);
  res.json({ success: true, totals });
});

/* ================= PAYMENTS ================= */
router.get("/payments", (req, res) => {
  res.render("billing/payments", { title: "Payments" });
});

router.get("/api/payments", async (req, res) => {
  const r = await pool.query(`
    SELECT id, invoice_id, amount, payment_method, paid_on
    FROM payments ORDER BY paid_on DESC
  `);
  res.json({ success: true, payments: r.rows });
});

router.post("/api/payments", async (req, res) => {
  const { invoice_id, amount, payment_method } = req.body;

  try {
    await pool.query(`
      INSERT INTO payments (invoice_id, amount, payment_method)
      VALUES ($1, $2, $3)
    `, [invoice_id, amount, payment_method]);

    const paid = await pool.query(`
      SELECT COALESCE(SUM(amount),0) total FROM payments WHERE invoice_id=$1
    `, [invoice_id]);

    const inv = await pool.query(
      `SELECT grand_total FROM invoices WHERE id=$1`,
      [invoice_id]
    );

    const status = paid.rows[0].total >= inv.rows[0].grand_total ? "paid" : "partial";

    await pool.query(`UPDATE invoices SET status=$1 WHERE id=$2`, [status, invoice_id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
