// Especies que atiende la veterinaria. Deben coincidir con el enum Species de Prisma.
const SPECIES = ["perro", "gato", "ave", "conejo", "reptil"];

const TREATMENT_CATEGORIES = [
  "antibiotico",
  "antiparasitario",
  "analgesico",
  "antiinflamatorio",
  "vacuna",
];

const NOTE_STATUSES = ["mejorando", "estable", "empeorando", "alta"];

module.exports = { SPECIES, TREATMENT_CATEGORIES, NOTE_STATUSES };
