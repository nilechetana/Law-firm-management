const express = require("express");
const router = express.Router();

// Invoice list (Adminto UI)
router.get("/invoices", (req, res) => {
  res.render("apps-invoices", {
    title: "Invoices"
  });
});

// Create invoice (Adminto UI)
router.get("/invoices/new", (req, res) => {
  res.render("apps-invoice-create", {
    title: "Create Invoice"
  });
});

module.exports = router;
