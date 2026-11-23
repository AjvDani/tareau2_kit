// Registro que crece sin límite (MongoDB): notas de seguimiento de una consulta.
// Va en su propia colección (no embebido en el tratamiento) por el límite de 16 MB.
const mongoose = require("mongoose");
const { SPECIES, NOTE_STATUSES } = require("../utils/constants");

const followUpNoteSchema = new mongoose.Schema(
  {
    // Referencias a PostgreSQL (sin FK): las garantiza el servicio con Prisma.
    consultationId: {
      type: Number,
      required: [true, "La consulta es obligatoria"],
      min: [1, "El id de la consulta no es válido"],
    },
    userId: {
      type: Number,
      required: [true, "El usuario es obligatorio"],
    },
    // Referencia dentro de MongoDB: ObjectId + ref (se une con populate).
    treatment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Treatment",
      default: null,
    },
    // Datos copiados de PostgreSQL (desnormalización): la lista de notas
    // se muestra sin volver a consultar la tabla Consultation.
    petName: {
      type: String,
      required: [true, "El nombre de la mascota es obligatorio"],
    },
    species: {
      type: String,
      required: [true, "La especie es obligatoria"],
      enum: { values: SPECIES, message: "La especie {VALUE} no es válida" },
    },
    status: {
      type: String,
      required: [true, "El estado de la mascota es obligatorio"],
      enum: {
        values: NOTE_STATUSES,
        message: "El estado {VALUE} no es válido",
      },
    },
    weightKg: {
      type: Number,
      min: [0.05, "El peso mínimo es 0.05 kg"],
      max: [150, "El peso máximo es 150 kg"],
    },
    comment: {
      type: String,
      required: [true, "El comentario es obligatorio"],
      trim: true,
      minlength: [5, "El comentario debe tener al menos 5 caracteres"],
      maxlength: [1000, "El comentario no puede superar 1000 caracteres"],
    },
    // Día de la nota (AAAA-MM-DD). Lo calcula el pre("validate").
    noteDay: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "El día de la nota debe ser AAAA-MM-DD"],
    },
  },
  { timestamps: true },
);

// pre("validate") sin next: fija el día de la nota para el índice único.
followUpNoteSchema.pre("validate", function () {
  if (!this.noteDay) {
    const base = this.createdAt || new Date();
    this.noteDay = base.toISOString().slice(0, 10);
  }
});

// Regla del workload: una nota de seguimiento por consulta y por día → 409 (E11000).
followUpNoteSchema.index({ consultationId: 1, noteDay: 1 }, { unique: true });
// Historial de una consulta, lo más nuevo primero.
followUpNoteSchema.index({ consultationId: 1, createdAt: -1 });
// Notas por tratamiento (estadísticas y borrado en cascada).
followUpNoteSchema.index({ treatment: 1, createdAt: -1 });

module.exports = mongoose.model("FollowUpNote", followUpNoteSchema);
