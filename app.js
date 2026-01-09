const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const upload = require("express-fileupload");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

// --------------------
// View Engine
// --------------------
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ❌ DO NOT USE express-ejs-layouts

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
// Routes
// --------------------
const mainRoutes = require("./routes/route");
const billingRoutes = require("./routes/billing");

app.use("/", mainRoutes);
app.use("/billing", billingRoutes);
app.use("/billing", require("./routes/billing"));


// --------------------
// Server
// --------------------
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`http://localhost:${port}`);
});
