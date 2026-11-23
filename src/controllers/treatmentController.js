const treatmentService = require("../services/treatmentService");
const { sendError } = require("../utils/httpError");

const listTreatments = async (req, res) => {
  try {
    const treatments = await treatmentService.listTreatments(req.query);
    res.json({ count: treatments.length, data: treatments });
  } catch (error) {
    sendError(res, error);
  }
};

const getTreatment = async (req, res) => {
  try {
    res.json(await treatmentService.getTreatment(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
};

const createTreatment = async (req, res) => {
  try {
    const treatment = await treatmentService.createTreatment(req.body);
    res.status(201).json(treatment);
  } catch (error) {
    sendError(res, error);
  }
};

const updateTreatment = async (req, res) => {
  try {
    res.json(await treatmentService.updateTreatment(req.params.id, req.body));
  } catch (error) {
    sendError(res, error);
  }
};

const deleteTreatment = async (req, res) => {
  try {
    res.json(await treatmentService.deleteTreatment(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
};

const getTreatmentStats = async (req, res) => {
  try {
    res.json(await treatmentService.getTreatmentStats(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  listTreatments,
  getTreatment,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  getTreatmentStats,
};
