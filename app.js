// ====================
// ENV MUST BE FIRST
// ====================
require("dotenv").config();   // 👈 VERY IMPORTANT (LINE 1)

// ====================
// Core Imports
// ====================
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const upload = require("express-fileupload");

// ====================
// Database (AFTER dotenv)
// ====================
const db = require("./db");

// ====================
// Routes Imports
// ====================
const mainRoutes = require("./routes/route");
const billingRoutes = require("./routes/billing");
const settingsRoutes = require("./routes/settings");
const billingReportsRoutes = require("./routes/billing-reports");
const matterRoutes = require("./routes/matters");
const paymentsRoutes = require("./routes/payments");
// --------------------
// View Engine
// --------------------
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// --------------------
// Middlewares
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(upload());
app.use(cookieParser());

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: "nodedemo",
  })
);

// --------------------
// Static Files
// --------------------
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// Routes (ORDER MATTERS)
// --------------------
app.use(settingsRoutes);          // /api/settings/*
app.use("/", mainRoutes);
app.use("/billing", billingRoutes); // ✅ ONLY ONCE
app.use("/", billingReportsRoutes);
app.use("/", matterRoutes);
app.use(paymentsRoutes);
// --------------------
// Server
// --------------------
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`http://localhost:${port}`);
});

// --------------------
// DB Connection Test (TEMP)
// --------------------
db.query("select 1")
  .then(() => console.log("✅ DB connected"))
  .catch(err => console.error("❌ DB error", err));
