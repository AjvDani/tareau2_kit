// Datos de demostración del caso 7 (Veterinaria) para las capturas de
// Compass y pgAdmin y para el video. Se puede correr varias veces.
//   npm run seed:vet
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const prisma = require("../src/db/prisma");
const Treatment = require("../src/models/treatment");
const FollowUpNote = require("../src/models/followUpNote");

const TREATMENTS = [
  {
    name: "Ivermectina oral",
    code: "TRT-001",
    category: "antiparasitario",
    description: "Antiparasitario interno y externo de amplio espectro.",
    contraindications: ["Razas collie y pastor australiano"],
    dosages: [
      { species: "perro", doseMgPerKg: 0.2, frequencyHours: 168, durationDays: 14 },
      { species: "gato", doseMgPerKg: 0.3, frequencyHours: 168, durationDays: 14 },
      { species: "conejo", doseMgPerKg: 0.4, frequencyHours: 168, durationDays: 21 },
    ],
  },
  {
    name: "Amoxicilina con clavulánico",
    code: "TRT-002",
    category: "antibiotico",
    description: "Antibiótico para infecciones de piel, vías urinarias y respiratorias.",
    dosages: [
      { species: "perro", doseMgPerKg: 12.5, frequencyHours: 12, durationDays: 7 },
      { species: "gato", doseMgPerKg: 12.5, frequencyHours: 12, durationDays: 7 },
    ],
  },
  {
    name: "Meloxicam",
    code: "TRT-003",
    category: "antiinflamatorio",
    description: "Antiinflamatorio no esteroideo para dolor articular y postoperatorio.",
    contraindications: ["Insuficiencia renal", "Gestación"],
    dosages: [{ species: "perro", doseMgPerKg: 0.1, frequencyHours: 24, durationDays: 5 }],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.syncIndexes();

  // Catálogo (MongoDB): se busca por código y se guarda con save() para validar.
  const treatments = {};
  for (const data of TREATMENTS) {
    const doc = (await Treatment.findOne({ code: data.code })) || new Treatment();
    doc.set(data);
    treatments[data.code] = await doc.save();
  }

  // Dueño (PostgreSQL).
  const user = await prisma.user.upsert({
    where: { email: "demo@vet.test" },
    update: {},
    create: {
      name: "Dueño Demo",
      email: "demo@vet.test",
      password: await bcrypt.hash("Demo123*", 10),
      role: "USER",
    },
  });

  // Consultas (PostgreSQL) con el _id del catálogo como String.
  const consultations = [
    { petName: "Firulais", species: "perro", date: "2026-11-20T09:00:00Z", reason: "Desparasitación anual", code: "TRT-001" },
    { petName: "Michi", species: "gato", date: "2026-11-21T10:30:00Z", reason: "Infección urinaria", code: "TRT-002" },
    { petName: "Copito", species: "conejo", date: "2026-11-22T11:00:00Z", reason: "Revisión general", code: null },
  ];
  const saved = [];
  for (const c of consultations) {
    const treatmentId = c.code ? treatments[c.code]._id.toString() : null;
    saved.push(
      await prisma.consultation.upsert({
        where: { userId_petName_date: { userId: user.id, petName: c.petName, date: new Date(c.date) } },
        update: { treatmentId },
        create: {
          userId: user.id,
          petName: c.petName,
          species: c.species,
          date: new Date(c.date),
          reason: c.reason,
          treatmentId,
          status: treatmentId ? "EN_TRATAMIENTO" : "ABIERTA",
        },
      }),
    );
  }

  // Notas de seguimiento (MongoDB): una por día por consulta en tratamiento.
  const notes = [
    [saved[0], "2026-11-21", "estable", 18.4, "Tomó la primera dosis sin problema"],
    [saved[0], "2026-11-22", "mejorando", 18.6, "Más activo, buen apetito"],
    [saved[1], "2026-11-22", "empeorando", 4.1, "Sigue orinando con dificultad"],
    [saved[1], "2026-11-23", "mejorando", 4.2, "Ya orina con normalidad"],
  ];
  for (const [c, noteDay, status, weightKg, comment] of notes) {
    await FollowUpNote.updateOne(
      { consultationId: c.id, noteDay },
      {
        $setOnInsert: {
          consultationId: c.id,
          noteDay,
          userId: user.id,
          treatment: c.treatmentId,
          petName: c.petName,
          species: c.species,
          status,
          weightKg,
          comment,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  console.log(
    `Listo: ${Object.keys(treatments).length} tratamientos, ${saved.length} consultas y ` +
      `${await FollowUpNote.countDocuments({ userId: user.id })} notas. Login: demo@vet.test / Demo123*`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await mongoose.disconnect();
  });
