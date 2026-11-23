const consultationService = require("../services/consultationService");
const { sendError } = require("../utils/httpError");

const createConsultation = async (req, res) => {
  try {
    const consultation = await consultationService.createConsultation(
      req.user,
      req.body,
    );
    res.status(201).json(consultation);
  } catch (error) {
    sendError(res, error);
  }
};

const listConsultations = async (req, res) => {
  try {
    const data = await consultationService.listConsultations(req.user);
    res.json({ count: data.length, data });
  } catch (error) {
    sendError(res, error);
  }
};

const getConsultation = async (req, res) => {
  try {
    res.json(await consultationService.getConsultation(req.params.id, req.user));
  } catch (error) {
    sendError(res, error);
  }
};

const changeTreatment = async (req, res) => {
  try {
    const consultation = await consultationService.changeTreatment(
      req.params.id,
      req.user,
      req.body.treatmentId,
    );
    res.json(consultation);
  } catch (error) {
    sendError(res, error);
  }
};

const deleteConsultation = async (req, res) => {
  try {
    res.json(await consultationService.deleteConsultation(req.params.id, req.user));
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  createConsultation,
  listConsultations,
  getConsultation,
  changeTreatment,
  deleteConsultation,
};
