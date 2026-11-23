const express = require("express");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const app = express();

app.use(express.json());

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API Veterinaria · PostgreSQL + MongoDB (caso 7)");
});

// JSON mal formado y errores no controlados.
app.use(errorHandler);

module.exports = app;
