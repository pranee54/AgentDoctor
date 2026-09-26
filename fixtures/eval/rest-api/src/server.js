const express = require("express");
const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));
app.post("/users", (_req, res) => res.status(201).end());
module.exports = app;
