const mongoose = require('mongoose');

const VitalsSchema = new mongoose.Schema({
  temperature: { type: Number },
  bloodPressureSystolic: { type: Number },
  bloodPressureDiastolic: { type: Number },
  heartRate: { type: Number },
  pulse: { type: Number },
  oxygen: { type: Number },
  weight: { type: Number },
  status: {
    type: String,
    enum: ['Normal', 'Low', 'High', 'Critical'],
    default: 'Normal'
  },
  conditions: [{ type: String }],   // e.g. ["High Blood Pressure", "Low Oxygen"]
  doctorFeedback: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

const PrescriptionSchema = new mongoose.Schema({
  prescriptionGroupId: { type: String, default: '' },
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  morning: { type: Boolean, default: false },
  afternoon: { type: Boolean, default: false },
  night: { type: Boolean, default: false },
  days: { type: Number, required: true },
  mealTiming: {
    type: String,
    enum: ['Before Food', 'After Food'],
    required: true,
    default: 'After Food'
  },
  notes: { type: String, default: '' },
  dispensed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const MedicalReportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    enum: ['Scan', 'Test', 'Lab', 'Other'],
    default: 'Other'
  },
  title: { type: String, required: true, trim: true },
  fileName: { type: String, required: true, trim: true },
  storedFileName: { type: String, required: true, trim: true },
  mimeType: { type: String, required: true, trim: true },
  fileSize: { type: Number, required: true, min: 1 },
  relativePath: { type: String, required: true, trim: true },
  uploadedAt: { type: Date, default: Date.now }
});

const PatientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true
  },
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 0, max: 150 },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  phone: { type: String, required: true, trim: true },
  bloodGroup: { type: String, default: '' },
  address: { type: String, default: '' },
  qrCode: { type: String },           // base64 QR image data
  vitalsHistory: [VitalsSchema],
  prescriptions: [PrescriptionSchema],
  medicalReports: [MedicalReportSchema],
  registeredAt: { type: Date, default: Date.now },
  lastVisit: { type: Date }
}, {
  timestamps: true
});

// Auto-update lastVisit when vitals are added
PatientSchema.pre('save', function(next) {
  if (this.vitalsHistory && this.vitalsHistory.length > 0) {
    this.lastVisit = this.vitalsHistory[this.vitalsHistory.length - 1].date;
  }
  next();
});

module.exports = mongoose.model('Patient', PatientSchema);
