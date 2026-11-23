// Catálogo de tratamientos (MongoDB).
// Cada tratamiento trae sus dosis por especie EMBEBIDAS: siempre se leen junto
// con el tratamiento, son pocas (una por especie) y cambian con él.
const mongoose = require("mongoose");
const slugify = require("slugify");
const { SPECIES, TREATMENT_CATEGORIES } = require("../utils/constants");

const dosageSchema = new mongoose.Schema(
  {
    species: {
      type: String,
      required: [true, "La especie de la dosis es obligatoria"],
      enum: {
        values: SPECIES,
        message: "La especie {VALUE} no es válida",
      },
    },
    doseMgPerKg: {
      type: Number,
      required: [true, "La dosis en mg/kg es obligatoria"],
      min: [0.01, "La dosis debe ser de al menos 0.01 mg/kg"],
      max: [500, "La dosis no puede superar 500 mg/kg"],
    },
    frequencyHours: {
      type: Number,
      required: [true, "La frecuencia en horas es obligatoria"],
      min: [1, "La frecuencia mínima es cada 1 hora"],
      max: [720, "La frecuencia máxima es cada 720 horas (30 días)"],
    },
    durationDays: {
      type: Number,
      default: 7,
      min: [1, "El tratamiento dura al menos 1 día"],
      max: [365, "El tratamiento dura como máximo 365 días"],
    },
    route: {
      type: String,
      enum: {
        values: ["oral", "inyectable", "topica"],
        message: "La vía {VALUE} no es válida",
      },
      default: "oral",
    },
  },
  { _id: false },
);

const treatmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del tratamiento es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [80, "El nombre no puede superar 80 caracteres"],
    },
    code: {
      type: String,
      required: [true, "El código es obligatorio"],
      unique: true,
      match: [/^TRT-\d{3,6}$/, "El código debe tener el formato TRT-001"],
    },
    category: {
      type: String,
      required: [true, "La categoría es obligatoria"],
      enum: {
        values: TREATMENT_CATEGORIES,
        message: "La categoría {VALUE} no es válida",
      },
    },
    description: {
      type: String,
      required: [true, "La descripción es obligatoria"],
      minlength: [20, "La descripción debe tener al menos 20 caracteres"],
      maxlength: [500, "La descripción no puede superar 500 caracteres"],
    },
    requiresPrescription: { type: Boolean, default: true },
    contraindications: [{ type: String, trim: true }],
    // Arreglo embebido: la dosis depende de la especie.
    dosages: {
      type: [dosageSchema],
      validate: [
        {
          validator: (value) => Array.isArray(value) && value.length > 0,
          message: "Debe registrar la dosis de al menos una especie",
        },
        {
          // Validación propia: una sola dosis por especie.
          validator: (value) =>
            new Set(value.map((d) => d.species)).size === value.length,
          message: "No se puede repetir la misma especie en las dosis",
        },
      ],
    },
    slug: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: especies que cubre el tratamiento (no se guarda en la base).
treatmentSchema.virtual("speciesCovered").get(function () {
  return (this.dosages || []).map((d) => d.species);
});

// Virtual: texto listo para mostrar en el catálogo.
treatmentSchema.virtual("summary").get(function () {
  const n = (this.dosages || []).length;
  return `${this.name} (${this.code}) · ${this.category} · ${n} especie(s)`;
});

// pre("validate") sin next: normaliza el código y genera el slug antes de validar.
treatmentSchema.pre("validate", function () {
  if (this.code) this.code = this.code.trim().toUpperCase();
  if (this.name) this.slug = slugify(this.name, { lower: true, strict: true });
});

// Índice para el listado por categoría ordenado por nombre.
treatmentSchema.index({ category: 1, name: 1 });

module.exports = mongoose.model("Treatment", treatmentSchema);
