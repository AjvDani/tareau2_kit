// Una sola conexión de Mongoose para toda la aplicación (MongoDB).
const mongoose = require("mongoose");

const connectMongo = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta la variable MONGODB_URI en el archivo .env");
  }
  // Falla rápido si el contenedor no responde (en vez de esperar 30 s).
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  // Crea los índices declarados en los esquemas (único de notas, etc.).
  await mongoose.connection.syncIndexes();
  console.log(`Conectado a MongoDB (${mongoose.connection.name})`);
};

module.exports = connectMongo;
