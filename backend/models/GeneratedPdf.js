const mongoose = require('mongoose');

const GeneratedPdfSchema = new mongoose.Schema({
  fileName:    { type: String, required: true },
  patientId:   { type: String, required: true, index: true },
  contentType: { type: String, default: 'application/pdf' },
  data:        { type: Buffer, required: true },   // PDF bytes stored in MongoDB
  generatedAt: { type: Date, default: Date.now }
});

// Auto-delete old PDFs after 7 days to keep the DB clean
GeneratedPdfSchema.index({ generatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('GeneratedPdf', GeneratedPdfSchema);
