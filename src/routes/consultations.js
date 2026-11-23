const { Router } = require("express");
const controller = require("../controllers/consultationController");
const authenticateToken = require("../middlewares/auth");
const router = Router();

router.use(authenticateToken);

router.post("/", controller.createConsultation);
router.get("/", controller.listConsultations);
router.get("/:id", controller.getConsultation);
router.patch("/:id/treatment", controller.changeTreatment);
router.delete("/:id", controller.deleteConsultation);

module.exports = router;
