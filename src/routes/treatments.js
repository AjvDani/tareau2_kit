const { Router } = require("express");
const controller = require("../controllers/treatmentController");
const authenticateToken = require("../middlewares/auth");
const router = Router();

// Lecturas públicas: el catálogo se consulta mucho.
router.get("/", controller.listTreatments);
router.get("/:id", controller.getTreatment);
router.get("/:id/stats", controller.getTreatmentStats);

// Escrituras protegidas con el JWT del login (PostgreSQL).
router.post("/", authenticateToken, controller.createTreatment);
router.put("/:id", authenticateToken, controller.updateTreatment);
router.delete("/:id", authenticateToken, controller.deleteTreatment);

module.exports = router;
