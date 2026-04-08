require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const patientRoutes = require('./routes/patients');
const prescriptionRoutes = require('./routes/prescriptions');
const pdfRoutes = require('./routes/pdf');
const { getReportsDir } = require('./utils/prescriptionPdfLocator');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_qr_db').trim();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/reports', express.static(getReportsDir()));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/pdf', pdfRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/patients', patientRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hospital QR System API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.', error: err.message });
});

// ─── Connect to MongoDB then start server ─────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB:', MONGO_URI.replace(/\/\/.*@/, '//***@'));
    app.listen(PORT, () => {
      console.log(`🏥  Hospital QR System API running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
