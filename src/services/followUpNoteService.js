// Servicio de notas de seguimiento (MongoDB) que valida contra PostgreSQL.
const mongoose = require("mongoose");
const prisma = require("../db/prisma");
const FollowUpNote = require("../models/followUpNote");
const { HttpError } = require("../utils/httpError");

const SORTABLE = ["createdAt", "weightKg", "status"];

// Integración MongoDB → PostgreSQL.
const createNote = async (user, body) => {
  const consultationId = Number(body.consultationId);
  if (!Number.isInteger(consultationId) || consultationId < 1) {
    throw new HttpError(400, "consultationId es obligatorio y debe ser un entero");
  }

  // 1) La consulta debe existir en PostgreSQL (404)...
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, userId: true, petName: true, species: true, treatmentId: true },
  });
  if (!consultation) throw new HttpError(404, "La consulta no existe");

  // 2) ...y ser del usuario del token (403).
  if (consultation.userId !== user.id) {
    throw new HttpError(403, "Solo el dueño de la consulta puede registrar notas");
  }

  // 3) userId sale del JWT; petName y species se copian de PostgreSQL;
  //    el tratamiento es el que tiene la consulta en este momento.
  return FollowUpNote.create({
    consultationId: consultation.id,
    userId: user.id,
    treatment: mongoose.isValidObjectId(consultation.treatmentId)
      ? consultation.treatmentId
      : null,
    petName: consultation.petName,
    species: consultation.species,
    status: body.status,
    weightKg: body.weightKg,
    comment: body.comment,
  });
};

// Lista con populate del tratamiento, filtros y orden.
const listNotes = async (user, { consultationId, treatment, status, sort, limit } = {}) => {
  const filter = user.role === "ADMIN" ? {} : { userId: user.id };
  if (consultationId !== undefined) {
    const id = Number(consultationId);
    if (!Number.isInteger(id)) throw new HttpError(400, "consultationId debe ser un entero");
    filter.consultationId = id;
  }
  if (treatment) {
    if (!mongoose.isValidObjectId(treatment))
      throw new HttpError(400, "treatment no es un ObjectId válido");
    filter.treatment = treatment;
  }
  if (status) filter.status = status;

  const sortKey = String(sort || "-createdAt").replace(/^-/, "");
  const sortObj = SORTABLE.includes(sortKey)
    ? { [sortKey]: String(sort || "-createdAt").startsWith("-") ? -1 : 1 }
    : { createdAt: -1 };

  const max = Math.min(Math.max(Number(limit) || 50, 1), 100);

  return FollowUpNote.find(filter)
    .sort(sortObj)
    .limit(max)
    .populate("treatment", "name code category")
    .lean();
};

module.exports = { createNote, listNotes };
