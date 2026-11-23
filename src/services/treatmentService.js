// Servicio del catálogo de tratamientos (MongoDB) con el borrado protegido
// que consulta PostgreSQL.
const mongoose = require("mongoose");
const Treatment = require("../models/treatment");
const FollowUpNote = require("../models/followUpNote");
const prisma = require("../db/prisma");
const { HttpError } = require("../utils/httpError");

// Campos que el cliente puede escribir (slug y fechas los pone el modelo).
const WRITABLE = [
  "name",
  "code",
  "category",
  "description",
  "requiresPrescription",
  "contraindications",
  "dosages",
];
const SORTABLE = ["name", "code", "category", "createdAt", "updatedAt"];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pick = (data = {}) =>
  Object.fromEntries(
    Object.entries(data).filter(([key]) => WRITABLE.includes(key)),
  );

// "?sort=-createdAt,name" → { createdAt: -1, name: 1 }
const parseSort = (sort) => {
  const result = {};
  String(sort || "name")
    .split(",")
    .map((s) => s.trim())
    .forEach((part) => {
      const key = part.replace(/^-/, "");
      if (SORTABLE.includes(key)) result[key] = part.startsWith("-") ? -1 : 1;
    });
  return Object.keys(result).length ? result : { name: 1 };
};

// "?fields=name,code" → "name code" (solo nombres simples, sin exclusiones).
const parseFields = (fields) => {
  if (!fields) return null;
  const list = String(fields)
    .split(",")
    .map((f) => f.trim())
    .filter((f) => /^[a-zA-Z][a-zA-Z0-9.]*$/.test(f));
  return list.length ? list.join(" ") : null;
};

const assertObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, `El id "${id}" no es un ObjectId válido`);
  }
};

// GET /api/treatments?q=&category=&species=&fields=&sort=
const listTreatments = async ({ q, category, species, fields, sort } = {}) => {
  const filter = {};
  if (q) {
    const regex = new RegExp(escapeRegex(String(q)), "i");
    filter.$or = [{ name: regex }, { description: regex }, { code: regex }];
  }
  if (category) filter.category = category;
  if (species) filter["dosages.species"] = species;

  const query = Treatment.find(filter).sort(parseSort(sort));
  const projection = parseFields(fields);
  // Con proyección se devuelve el documento plano (los virtuales necesitan
  // campos que quizá no se pidieron).
  if (projection) return query.select(projection).lean();
  return query;
};

const getTreatment = async (id) => {
  assertObjectId(id);
  const treatment = await Treatment.findById(id);
  if (!treatment) throw new HttpError(404, "Tratamiento no encontrado");
  return treatment;
};

const createTreatment = async (data) => Treatment.create(pick(data));

// PUT: findById + save() para que corran las validaciones y el pre("validate").
const updateTreatment = async (id, data) => {
  const treatment = await getTreatment(id);
  Object.entries(pick(data)).forEach(([key, value]) => treatment.set(key, value));
  return treatment.save();
};

// DELETE protegido: 409 si alguna consulta de PostgreSQL lo usa;
// si no, borra el tratamiento y en cascada sus notas de seguimiento.
const deleteTreatment = async (id) => {
  const treatment = await getTreatment(id);
  const inUse = await prisma.consultation.count({ where: { treatmentId: id } });
  if (inUse > 0) {
    throw new HttpError(
      409,
      `No se puede eliminar: ${inUse} consulta(s) usan este tratamiento`,
    );
  }
  await treatment.deleteOne();
  const { deletedCount } = await FollowUpNote.deleteMany({ treatment: id });
  return { deleted: treatment.code, deletedNotes: deletedCount };
};

// Aggregate: cuántas notas hay por estado y el peso promedio de las mascotas.
const getTreatmentStats = async (id) => {
  const treatment = await getTreatment(id);
  const byStatus = await FollowUpNote.aggregate([
    { $match: { treatment: treatment._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgWeightKg: { $avg: "$weightKg" },
      },
    },
    { $sort: { count: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
        avgWeightKg: { $round: ["$avgWeightKg", 2] },
      },
    },
  ]);
  const total = byStatus.reduce((sum, s) => sum + s.count, 0);
  return {
    treatment: { _id: treatment._id, name: treatment.name, code: treatment.code },
    totalNotes: total,
    byStatus,
  };
};

module.exports = {
  listTreatments,
  getTreatment,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  getTreatmentStats,
};
