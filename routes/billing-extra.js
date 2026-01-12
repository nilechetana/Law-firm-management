const express = require("express");
const router = express.Router();
const pool = require("../db"); // or wherever your pg pool is

/* ===============================
   TIME ENTRIES APIs
================================ */

router.post("/api/time-entries", async (req, res) => {
  const { matter_id, activity, duration_minutes, rate, billable } = req.body;

  await pool.query(
    `INSERT INTO time_entries
     (matter_id, activity, duration_minutes, rate, billable)
     VALUES ($1,$2,$3,$4,$5)`,
    [matter_id, activity, duration_minutes, rate, billable]
  );

  res.json({ message: "Time entry added" });
});

router.get("/api/time-entries", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM time_entries ORDER BY created_at DESC"
  );
  res.json(result.rows);
});

/* ===============================
   EXPENSE APIs
================================ */

router.post("/api/expenses", async (req, res) => {
  const { matter_id, expense_type, amount, taxable, notes } = req.body;

await pool.query(
  `
  INSERT INTO invoice_items
  (invoice_id, description, qty, rate, line_subtotal, tax_amount, line_total, source_type, source_id)
  SELECT
    $1,
    expense_type,
    1,
    amount,
    amount,
    0,
    amount,
    'expense',
    id
  FROM expenses
  WHERE id = $2
  `,
  [invoice_id, id]
);


  res.json({ message: "Expense added" });
});

router.get("/api/expenses", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM expenses ORDER BY created_at DESC"
  );
  res.json(result.rows);
});

/* ===============================
   UNBILLED ITEMS
================================ */

router.get("/api/billing/unbilled", async (req, res) => {
  const { matterId } = req.query;

  const time = await pool.query(
    "SELECT * FROM time_entries WHERE status='unbilled' AND matter_id=$1",
    [matterId]
  );

  const expenses = await pool.query(
    "SELECT * FROM expenses WHERE status='unbilled' AND matter_id=$1",
    [matterId]
  );

  res.json({
    time_entries: time.rows,
    expenses: expenses.rows
  });
});

/* ===============================
   INVOICE FROM UNBILLED
================================ */

router.post("/api/invoices/from-unbilled", async (req, res) => {
  const { invoice_id, time_ids = [], expense_ids = [] } = req.body;

  for (let id of time_ids) {
    await pool.query(
      `INSERT INTO invoice_items
       (invoice_id, description, amount, source_type, source_id)
       SELECT $1, activity, duration_minutes * rate, 'time', id
       FROM time_entries WHERE id=$2`,
      [invoice_id, id]
    );

    await pool.query(
      "UPDATE time_entries SET status='billed' WHERE id=$1",
      [id]
    );
  }

  for (let id of expense_ids) {
    await pool.query(
      `INSERT INTO invoice_items
       (invoice_id, description, amount, source_type, source_id)
       SELECT $1, expense_type, amount, 'expense', id
       FROM expenses WHERE id=$2`,
      [invoice_id, id]
    );

    await pool.query(
      "UPDATE expenses SET status='billed' WHERE id=$1",
      [id]
    );
  }

  res.json({ message: "Invoice generated from unbilled items" });
});

module.exports = router;
