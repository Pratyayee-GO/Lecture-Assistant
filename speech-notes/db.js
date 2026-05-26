const fs = require('fs');
const path = require('path');
const Datastore = require('nedb-promises');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'notes.db');
const videosDbPath = path.join(dataDir, 'videos.db');

// Ensure data directory exists
fs.mkdirSync(dataDir, { recursive: true });

const notesDB = Datastore.create({ filename: dbPath, autoload: true });
const videosDB = Datastore.create({ filename: videosDbPath, autoload: true });
const studyNotesDbPath = path.join(dataDir, 'study-notes.db');
const studyNotesDB = Datastore.create({ filename: studyNotesDbPath, autoload: true });

module.exports = {
  async addNote(text) {
    const now = new Date().toISOString();
    const doc = await notesDB.insert({ text, created_at: now });
    return { id: doc._id, text: doc.text, created_at: doc.created_at };
  },
  async getAllNotes() {
    const docs = await notesDB.find({}).sort({ created_at: -1, _id: -1 });
    return docs.map(d => ({ id: d._id, text: d.text, created_at: d.created_at }));
  },
  async deleteNote(id) {
    const num = await notesDB.remove({ _id: id }, {});
    return num > 0;
  },
  async deleteAll() {
    const num = await notesDB.remove({}, { multi: true });
    return num;
  },

  // Video metadata ops
  async addVideo(meta) {
    // meta: { filename, originalName, size, mime, created_at }
    const doc = await videosDB.insert(meta);
    return { id: doc._id, ...meta };
  },
  async getAllVideos() {
    const docs = await videosDB.find({}).sort({ created_at: -1, _id: -1 });
    return docs.map(d => ({
      id: d._id,
      filename: d.filename,
      originalName: d.originalName,
      size: d.size,
      mime: d.mime,
      created_at: d.created_at
    }));
  },
  async deleteVideo(id) {
    const num = await videosDB.remove({ _id: id }, {});
    return num > 0;
  },
  async deleteAllVideos() {
    const num = await videosDB.remove({}, { multi: true });
    return num;
  },

  // Study Notes ops
  async addStudyNote(data) {
    // data: { title, content, noteIds, videoIds, created_at }
    const doc = await studyNotesDB.insert(data);
    return { id: doc._id, ...data };
  },
  async getAllStudyNotes() {
    const docs = await studyNotesDB.find({}).sort({ created_at: -1 });
    return docs.map(d => ({
      id: d._id,
      title: d.title,
      content: d.content,
      noteIds: d.noteIds || [],
      videoIds: d.videoIds || [],
      created_at: d.created_at
    }));
  },
  async getStudyNoteById(id) {
    const doc = await studyNotesDB.findOne({ _id: id });
    if (!doc) return null;
    return {
      id: doc._id,
      title: doc.title,
      content: doc.content,
      noteIds: doc.noteIds || [],
      videoIds: doc.videoIds || [],
      created_at: doc.created_at
    };
  },
  async deleteStudyNote(id) {
    const num = await studyNotesDB.remove({ _id: id }, {});
    return num > 0;
  },

  paths: {
    dataDir
  }
};
