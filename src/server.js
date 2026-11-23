require("dotenv").config();
// Registra los modelos antes de sincronizar índices.
require("./models/treatment");
require("./models/followUpNote");
const app = require("./app.js");
const connectMongo = require("./db/mongo.js");
const prisma = require("./db/prisma.js");
const PORT = process.env.PORT || 3000;

const start = async () => {
  // El servidor solo arranca si las dos bases responden.
  await prisma.$connect();
  console.log("Conectado a PostgreSQL");
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exit(1);
});
