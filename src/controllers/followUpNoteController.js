const followUpNoteService = require("../services/followUpNoteService");
const { sendError } = require("../utils/httpError");

const createNote = async (req, res) => {
  try {
    const note = await followUpNoteService.createNote(req.user, req.body);
    res.status(201).json(note);
  } catch (error) {
    sendError(res, error);
  }
};

const listNotes = async (req, res) => {
  try {
    const notes = await followUpNoteService.listNotes(req.user, req.query);
    res.json({ count: notes.length, data: notes });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = { createNote, listNotes };
