const express = require('express');
const router  = express.Router();
const GeneratedPdf = require('../models/GeneratedPdf');

// GET /api/pdf/:id  — stream a stored PDF from MongoDB
// This URL is what Twilio downloads when sending WhatsApp PDFs,
// and what the browser hits when the user clicks "Download PDF".
router.get('/:id', async (req, res) => {
  try {
    const doc = await GeneratedPdf.findById(req.params.id).select('data fileName contentType');
    if (!doc) {
      return res.status(404).json({ message: 'PDF not found or has expired.' });
    }

    res.set('Content-Type', doc.contentType || 'application/pdf');
    res.set('Content-Disposition', `inline; filename="${doc.fileName}"`);
    res.set('Content-Length', doc.data.length);
    res.send(doc.data);
  } catch (err) {
    // Handle invalid MongoDB ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid PDF ID format.' });
    }
    console.error('Failed to retrieve PDF from MongoDB:', err);
    res.status(500).json({ message: 'Failed to retrieve PDF.', error: err.message });
  }
});

module.exports = router;
