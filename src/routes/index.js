const { Router } = require("express");
const authRouter = require("./auth");
const adminRouter = require("./admin");
const reservations = require("./reservations");
const appointments = require("./appointments");
const treatments = require("./treatments");
const consultations = require("./consultations");
const notes = require("./notes");

const router = Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/treatments", treatments);
router.use("/consultations", consultations);
router.use("/notes", notes);
router.use("/reservations", reservations);
router.use("/users", appointments);

module.exports = router;
