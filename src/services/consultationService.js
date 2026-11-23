// Servicio de consultas (PostgreSQL) que valida y une el catálogo de MongoDB.
const mongoose = require("mongoose");
const prisma = require("../db/prisma");
const Treatment = require("../models/treatment");
const FollowUpNote = require("../models/followUpNote");
const { HttpError } = require("../utils/httpError");
const { SPECIES } = require("../utils/constants");

const parseId = (id) => {
  const value = Number(id);
  if (!Number.isInteger(value) || value < 1) {
    throw new HttpError(400, `El id "${id}" de la consulta no es válido`);
  }
  return value;
};

const validateConsultation = ({ date, petName, species, reason }) => {
  const errors = [];
  if (!date || Number.isNaN(new Date(date).getTime()))
    errors.push("La fecha es obligatoria y debe ser válida (ISO 8601)");
  if (typeof petName !== "string" || petName.trim().length < 2)
    errors.push("El nombre de la mascota debe tener al menos 2 caracteres");
  if (!SPECIES.includes(species))
    errors.push(`La especie debe ser una de: ${SPECIES.join(", ")}`);
  if (typeof reason !== "string" || reason.trim().length < 5)
    errors.push("El motivo debe tener al menos 5 caracteres");
  if (errors.length) throw new HttpError(400, "Datos inválidos", errors);
};

// Integración PostgreSQL → MongoDB: el _id del catálogo debe existir
// (isValidObjectId + exists) y tener dosis para la especie de la mascota.
const ensureTreatment = async (treatmentId, species) => {
  if (treatmentId === undefined || treatmentId === null || treatmentId === "")
    return null;
  if (!mongoose.isValidObjectId(treatmentId)) {
    throw new HttpError(400, `treatmentId "${treatmentId}" no es un ObjectId válido`);
  }
  const exists = await Treatment.exists({ _id: treatmentId });
  if (!exists) throw new HttpError(404, "El tratamiento no existe en el catálogo");

  const hasDose = await Treatment.exists({
    _id: treatmentId,
    "dosages.species": species,
  });
  if (!hasDose) {
    throw new HttpError(
      400,
      `El tratamiento no tiene dosis registrada para la especie ${species}`,
    );
  }
  return String(treatmentId);
};

// Consulta unida sin N+1: 1 consulta a PostgreSQL + 1 a MongoDB con $in,
// y se cruzan en memoria con un Map.
const joinTreatments = async (consultations) => {
  const ids = [
    ...new Set(
      consultations
        .map((c) => c.treatmentId)
        .filter((id) => id && mongoose.isValidObjectId(id)),
    ),
  ];
  const treatments = ids.length
    ? await Treatment.find({ _id: { $in: ids } })
        .select("name code category requiresPrescription dosages")
        .lean()
    : [];
  const byId = new Map(treatments.map((t) => [t._id.toString(), t]));

  return consultations.map((c) => {
    const t = c.treatmentId ? byId.get(c.treatmentId) : null;
    return {
      ...c,
      treatment: t
        ? {
            _id: t._id,
            name: t.name,
            code: t.code,
            category: t.category,
            requiresPrescription: t.requiresPrescription,
            // Solo la dosis que corresponde a la especie de esta mascota.
            dosage: t.dosages.find((d) => d.species === c.species) || null,
          }
        : null,
    };
  });
};

const loadOwned = async (id, user) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: parseId(id) },
  });
  if (!consultation) throw new HttpError(404, "Consulta no encontrada");
  if (consultation.userId !== user.id && user.role !== "ADMIN") {
    throw new HttpError(403, "La consulta pertenece a otro usuario");
  }
  return consultation;
};

const createConsultation = async (user, body) => {
  validateConsultation(body);
  const treatmentId = await ensureTreatment(body.treatmentId, body.species);
  const consultation = await prisma.consultation.create({
    data: {
      date: new Date(body.date),
      petName: body.petName.trim(),
      species: body.species,
      reason: body.reason.trim(),
      status: treatmentId ? "EN_TRATAMIENTO" : "ABIERTA",
      userId: user.id, // sale del JWT, nunca del body
      treatmentId,
    },
  });
  const [joined] = await joinTreatments([consultation]);
  return joined;
};

// Historial del usuario del token (el ADMIN ve todas).
const listConsultations = async (user) => {
  const consultations = await prisma.consultation.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    orderBy: { date: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return joinTreatments(consultations);
};

const getConsultation = async (id, user) => {
  const consultation = await loadOwned(id, user);
  const [joined] = await joinTreatments([consultation]);
  return joined;
};

// El veterinario cambia o suspende (null) el tratamiento de la consulta.
const changeTreatment = async (id, user, treatmentId) => {
  const consultation = await loadOwned(id, user);
  const newId = await ensureTreatment(treatmentId, consultation.species);
  const updated = await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      treatmentId: newId,
      status: newId ? "EN_TRATAMIENTO" : "ABIERTA",
    },
  });
  const [joined] = await joinTreatments([updated]);
  return joined;
};

// Borra la consulta (PostgreSQL) y luego sus notas (MongoDB).
// Si MongoDB falla después de borrar en PostgreSQL quedan notas huérfanas,
// que se pueden limpiar luego; al revés se perderían notas de una consulta viva.
const deleteConsultation = async (id, user) => {
  const consultation = await loadOwned(id, user);
  await prisma.consultation.delete({ where: { id: consultation.id } });
  const { deletedCount } = await FollowUpNote.deleteMany({
    consultationId: consultation.id,
  });
  return { deleted: consultation.id, deletedNotes: deletedCount };
};

module.exports = {
  createConsultation,
  listConsultations,
  getConsultation,
  changeTreatment,
  deleteConsultation,
  joinTreatments,
};
