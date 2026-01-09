const express = require("express");
const router = express.Router();
const pool = require("../db");

/* =====================================================
   UI ROUTES
===================================================== */
router.get("/invoices", (req, res) => {
  res.render("billing/invoices", { title: "Invoices" });
});

router.get("/invoices/new", (req, res) => {
  res.render("billing/invoice-new", { title: "Create Invoice" });
});

router.get("/invoices/:id", (req, res) => {
  res.render("billing/invoice-detail", { title: "Invoice Detail" });
});

/* =====================================================
   API : GET INVOICES LIST
===================================================== */
router.get("/api/invoices", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, invoice_date, country, tax_mode, grand_total, status
      FROM invoices
      ORDER BY id DESC
    `);

    res.json({ success: true, invoices: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =====================================================
   API : CREATE INVOICE (DRAFT)
===================================================== */
router.post("/api/invoices", async (req, res) => {
  try {
    const {
      client_id,
      case_id,
      invoice_date,
      due_date,
      currency,
      country,
      state,
      notes,
      terms,
      items
    } = req.body;

    if (!invoice_date || !due_date || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    /* -------- TAX MODE -------- */
    let tax_mode = "NONE";
    if (country === "India") {
      tax_mode = state?.toLowerCase() === "maharashtra"
        ? "CGST_SGST"
        : "IGST";
    } else {
      tax_mode = "VAT";
    }

    let subtotal = 0;
    let tax_total = 0;

    items.forEach(i => {
      const line = i.qty * i.rate;
      const discountAmt = (line * (i.discount || 0)) / 100;
      const taxableAmt = line - discountAmt;

      subtotal += taxableAmt;
      if (i.taxable) {
        tax_total += (taxableAmt * i.tax_rate) / 100;
      }
    });

    const grand_total = subtotal + tax_total;

    /* -------- INSERT INVOICE -------- */
    const invRes = await pool.query(
      `
      INSERT INTO invoices
      (client_id, case_id, invoice_date, due_date, currency, country, state,
       tax_mode, status, subtotal, tax_total, grand_total, notes, terms)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10,$11,$12,$13)
      RETURNING id
      `,
      [
        client_id,
        case_id,
        invoice_date,
        due_date,
        currency,
        country,
        state,
        tax_mode,
        subtotal,
        tax_total,
        grand_total,
        notes,
        terms
      ]
    );

    const invoiceId = invRes.rows[0].id;

    /* -------- INSERT ITEMS -------- */
    for (const i of items) {
      const line = i.qty * i.rate;
      const discountAmt = (line * (i.discount || 0)) / 100;
      const taxableAmt = line - discountAmt;
      const taxAmt = i.taxable ? (taxableAmt * i.tax_rate) / 100 : 0;

      await pool.query(
        `
        INSERT INTO invoice_items
        (invoice_id, description, qty, rate, discount, taxable,
         tax_rate, line_subtotal, tax_amount, line_total)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          invoiceId,
          i.description,
          i.qty,
          i.rate,
          i.discount || 0,
          i.taxable,
          i.tax_rate,
          taxableAmt,
          taxAmt,
          taxableAmt + taxAmt
        ]
      );
    }

    res.json({ success: true, invoice_id: invoiceId, tax_mode });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =====================================================
   API : GET INVOICE DETAIL
===================================================== */
router.get("/api/invoices/:id", async (req, res) => {
  try {
    const invoice = await pool.query(
      "SELECT * FROM invoices WHERE id=$1",
      [req.params.id]
    );

    if (invoice.rows.length === 0) {
      return res.json({ success: false });
    }

    const items = await pool.query(
      "SELECT * FROM invoice_items WHERE invoice_id=$1",
      [req.params.id]
    );

    res.json({
      success: true,
      invoice: invoice.rows[0],
      items: items.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =====================================================
   API : FINALIZE INVOICE
===================================================== */
router.post("/api/invoices/:id/finalize", async (req, res) => {
  try {
    await pool.query(
      "UPDATE invoices SET status='final' WHERE id=$1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =====================================================
   API : PAYMENTS
===================================================== */
router.post("/api/invoices/:id/payments", async (req, res) => {
  const { amount, paid_on, reference } = req.body;
  try {
    await pool.query(
      `
      INSERT INTO payments (invoice_id, amount, paid_on, reference)
      VALUES ($1,$2,$3,$4)
      `,
      [req.params.id, amount, paid_on, reference]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =====================================================
   DROPDOWNS
===================================================== */
router.get("/api/clients", async (req, res) => {
  const r = await pool.query("SELECT id, name FROM clients ORDER BY name");
  res.json({ success: true, clients: r.rows });
});

router.get("/api/cases", async (req, res) => {
  const r = await pool.query("SELECT id, title FROM cases ORDER BY id DESC");
  res.json({ success: true, cases: r.rows });
});

module.exports = router;
