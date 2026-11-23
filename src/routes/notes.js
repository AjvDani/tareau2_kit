const { Router } = require("express");
const controller = require("../controllers/followUpNoteController");
const authenticateToken = require("../middlewares/auth");
const router = Router();

router.use(authenticateToken);

router.post("/", controller.createNote);
router.get("/", controller.listNotes);

module.exports = router;
