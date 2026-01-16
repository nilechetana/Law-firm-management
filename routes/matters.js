const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * Show single Matter (Case) page
 * URL: /matters/:id
 */
router.get("/matters/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // IMPORTANT:
    // Your DB does NOT have a "matters" table.
    // It uses "cases", so we query cases and treat it as a matter in UI.
    const result = await pool.query(
      `SELECT * FROM cases WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Matter not found");
    }

    res.render("matters/show", {
      matter: result.rows[0] // passed as "matter" for EJS compatibility
    });

  } catch (err) {
    console.error("Matter show error:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
