const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/auth');
const { evaluateVitals } = require('../utils/healthEvaluator');
const { sendPrescriptionPdf, sendWhatsappMedia } = require('../utils/sendWhatsappPdf');
const { generateAllPrescriptionsPdf } = require('../utils/generatePrescriptionPdf');
const {
  buildReportUrl,
  isPubliclyReachableUrl
} = require('../utils/prescriptionPdfLocator');
const {
  saveMedicalReport,
  serializeMedicalReport
} = require('../utils/medicalReportStorage');

// ─── Helper: generate short patient ID ───────────────────────────────────────
function generatePatientId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PT-${timestamp}-${random}`;
}

// ─── POST /api/patients  ──  Register new patient ────────────────────────────
router.post('/', protect, authorize('Nurse'), async (req, res) => {
  try {
    const { name, age, gender, phone, bloodGroup, address } = req.body;
    if (!name || !age || !gender || !phone) {
      return res.status(400).json({ message: 'Name, age, gender, and phone are required.' });
    }

    const patientId = generatePatientId();

    // Generate QR code as data URL (base64)
    const qrData = JSON.stringify({ patientId, name });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: { dark: '#1a4a7a', light: '#ffffff' }
    });

    const patient = new Patient({
      patientId,
      name: name.trim(),
      age: parseInt(age),
      gender,
      phone: phone.trim(),
      bloodGroup: bloodGroup || '',
      address: address || '',
      qrCode
    });

    await patient.save();
    res.status(201).json({
      message: 'Patient registered successfully.',
      patient
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Patient ID collision — please retry.' });
    }
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── GET /api/patients  ──  List all patients ────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]}
      : {};

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .select('-qrCode -vitalsHistory -prescriptions -medicalReports')
      .sort({ registeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ patients, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── GET /api/patients/:id  ──  Get patient by patientId ─────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── PUT /api/patients/:id  ──  Update patient info ──────────────────────────
router.put('/:id', protect, authorize('Nurse'), async (req, res) => {
  try {
    const { name, age, gender, phone, bloodGroup, address } = req.body;
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    if (name) patient.name = name.trim();
    if (age) patient.age = parseInt(age);
    if (gender) patient.gender = gender;
    if (phone) patient.phone = phone.trim();
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
    if (address !== undefined) patient.address = address;

    await patient.save();
    res.json({ message: 'Patient updated.', patient });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── POST /api/patients/:id/reports  ──  Add medical report  ──────────────────
router.post('/:id/reports', protect, authorize('Nurse'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const savedReport = saveMedicalReport({
      patientId: patient.patientId,
      reportType: req.body.reportType,
      title: req.body.title,
      fileName: req.body.fileName,
      mimeType: req.body.mimeType,
      dataUrl: req.body.dataUrl,
      base64Data: req.body.base64Data
    });

    patient.medicalReports.push(savedReport);
    await patient.save();

    const createdReport = patient.medicalReports[patient.medicalReports.length - 1];

    res.status(201).json({
      message: 'Medical report uploaded successfully.',
      report: serializeMedicalReport(req, createdReport)
    });
  } catch (err) {
    const statusCode = /required|supported|missing|empty|decode|large/i.test(err.message) ? 400 : 500;
    res.status(statusCode).json({
      message: 'Failed to upload medical report.',
      error: err.message
    });
  }
});

router.post('/:id/reports/:reportId/send-whatsapp', protect, authorize('Nurse', 'Pharmacist'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    if (!patient.phone) {
      return res.status(400).json({ message: 'Patient phone number is not available.' });
    }

    const report = patient.medicalReports.id(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Medical report not found.' });
    }

    const reportUrl = buildReportUrl(req, report.relativePath);
    if (!isPubliclyReachableUrl(reportUrl)) {
      return res.status(400).json({
        message: 'Twilio cannot access a localhost/private media URL. Set PUBLIC_BASE_URL to a public URL before sending WhatsApp files.',
        error: `Current media URL: ${reportUrl}`
      });
    }

    const whatsappResponse = await sendWhatsappMedia(
      patient.phone,
      reportUrl,
      `Your ${String(report.reportType || 'medical').toLowerCase()} report${report.title ? ` (${report.title})` : ''} is attached.`
    );

    res.json({
      message: whatsappResponse.status === 'delivered'
        ? 'Medical report delivered to WhatsApp successfully.'
        : `Medical report request accepted by Twilio with status: ${whatsappResponse.status}.`,
      sid: whatsappResponse.sid,
      status: whatsappResponse.status,
      errorCode: whatsappResponse.errorCode,
      errorMessage: whatsappResponse.errorMessage,
      report: serializeMedicalReport(req, report),
      reportUrl
    });
  } catch (err) {
    console.error('Failed to send medical report via WhatsApp:', err);
    res.status(500).json({
      message: 'Failed to send medical report via WhatsApp.',
      error: err.message
    });
  }
});

router.post('/:id/vitals', protect, authorize('Nurse'), async (req, res) => {
  try {
    const {
      temperature,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      heartRate,
      pulse,
      oxygen,
      weight,
      doctorFeedback
    } = req.body;

    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    // Evaluate health status
    const { status, conditions } = evaluateVitals({
      temperature: parseFloat(temperature),
      bloodPressureSystolic: parseInt(bloodPressureSystolic),
      bloodPressureDiastolic: parseInt(bloodPressureDiastolic),
      heartRate: parseInt(heartRate),
      pulse: parseInt(pulse),
      oxygen: parseFloat(oxygen)
    });

    const vitalsEntry = {
      temperature: temperature ? parseFloat(temperature) : undefined,
      bloodPressureSystolic: bloodPressureSystolic ? parseInt(bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: bloodPressureDiastolic ? parseInt(bloodPressureDiastolic) : undefined,
      heartRate: heartRate ? parseInt(heartRate) : undefined,
      pulse: pulse ? parseInt(pulse) : undefined,
      oxygen: oxygen ? parseFloat(oxygen) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      status,
      conditions,
      doctorFeedback: doctorFeedback || '',
      date: new Date()
    };

    patient.vitalsHistory.push(vitalsEntry);
    patient.lastVisit = vitalsEntry.date;
    await patient.save();

    res.status(201).json({
      message: 'Vitals recorded successfully.',
      vitals: vitalsEntry,
      status,
      conditions
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── PUT /api/patients/:id/vitals/:vitalsId/feedback  ──  Update feedback ────
router.put('/:id/vitals/:vitalsId/feedback', protect, authorize('Doctor'), async (req, res) => {
  try {
    const { doctorFeedback } = req.body;
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const vital = patient.vitalsHistory.id(req.params.vitalsId);
    if (!vital) return res.status(404).json({ message: 'Vitals entry not found.' });

    vital.doctorFeedback = doctorFeedback;
    await patient.save();
    res.json({ message: 'Feedback updated.', vital });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── POST /api/patients/:id/prescriptions  ──  Add prescription ──────────────
router.post('/:id/prescriptions', protect, authorize('Doctor'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const incomingMedicines = Array.isArray(req.body.medicines) ? req.body.medicines : [req.body];
    if (!incomingMedicines.length) {
      return res.status(400).json({ message: 'At least one medicine is required.' });
    }

    const timestamp = new Date();
    const prescriptionGroupId = `RX-${uuidv4()}`;
    const prescriptions = [];

    for (const item of incomingMedicines) {
      const { medicineName, dosage, morning, afternoon, night, days, mealTiming } = item;

      if (!medicineName || !dosage || !days || !mealTiming) {
        return res.status(400).json({ message: 'Medicine name, dosage, days, and meal timing are required for each medicine.' });
      }

      if (!['Before Food', 'After Food'].includes(mealTiming)) {
        return res.status(400).json({ message: 'Meal timing must be either Before Food or After Food.' });
      }

      if (!morning && !afternoon && !night) {
        return res.status(400).json({ message: 'Each medicine must include at least one timing.' });
      }

      prescriptions.push({
        prescriptionGroupId,
        medicineName: String(medicineName).trim(),
        dosage: String(dosage).trim(),
        morning: !!morning,
        afternoon: !!afternoon,
        night: !!night,
        days: parseInt(days),
        mealTiming,
        notes: '',
        dispensed: false,
        date: timestamp
      });
    }

    patient.prescriptions.push(...prescriptions);
    await patient.save();

    res.status(201).json({
      message: prescriptions.length > 1 ? 'Prescriptions added.' : 'Prescription added.',
      prescription: patient.prescriptions[patient.prescriptions.length - 1],
      prescriptions: patient.prescriptions.slice(-prescriptions.length)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── PUT /api/patients/:id/prescriptions/:rxId/dispense  ──  Mark dispensed ──
router.put('/:id/prescriptions/:rxId/dispense', protect, authorize('Pharmacist'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const rx = patient.prescriptions.id(req.params.rxId);
    if (!rx) return res.status(404).json({ message: 'Prescription not found.' });

    rx.dispensed = true;
    await patient.save();
    res.json({ message: 'Medicine dispensed.', prescription: rx });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── PUT /api/patients/:id/prescriptions/group/:groupId/dispense-all  ──  Mark group dispensed ──
router.put('/:id/prescriptions/group/:groupId/dispense-all', protect, authorize('Pharmacist'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    let groupedPrescriptions = patient.prescriptions.filter(
      rx => rx.prescriptionGroupId === req.params.groupId
    );

    if (!groupedPrescriptions.length) {
      const singlePrescription = patient.prescriptions.id(req.params.groupId);
      if (singlePrescription) {
        groupedPrescriptions = [singlePrescription];
      }
    }

    if (!groupedPrescriptions.length) {
      return res.status(404).json({ message: 'Prescription group not found.' });
    }

    groupedPrescriptions.forEach(rx => {
      rx.dispensed = true;
    });

    await patient.save();
    res.json({ message: 'All medicines dispensed.', prescriptions: groupedPrescriptions });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── GET /api/patients/:id/qr  ──  Re-fetch QR code ─────────────────────────
router.post('/:id/send-all-prescriptions', protect, authorize('Pharmacist', 'Nurse'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    if (!patient.phone) {
      return res.status(400).json({ message: 'Patient phone number is not available.' });
    }

    const pdfFile = await generateAllPrescriptionsPdf(patient);
    const baseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const pdfUrl  = `${baseUrl}/api/pdf/${pdfFile.mongoId}`;

    const twilioResponse = await sendPrescriptionPdf(
      patient.phone,
      pdfUrl,
      'Your combined prescription PDF is attached.'
    );

    console.log('Twilio WhatsApp all prescriptions response:', {
      sid: twilioResponse.sid,
      status: twilioResponse.status,
      errorCode: twilioResponse.errorCode,
      errorMessage: twilioResponse.errorMessage,
      to: twilioResponse.to
    });

    res.json({
      message: twilioResponse.status === 'delivered'
        ? 'All prescriptions PDF delivered to WhatsApp successfully.'
        : `All prescriptions PDF request accepted by Twilio with status: ${twilioResponse.status}.`,
      sid: twilioResponse.sid,
      status: twilioResponse.status,
      errorCode: twilioResponse.errorCode,
      errorMessage: twilioResponse.errorMessage,
      pdfUrl
    });
  } catch (err) {
    console.error('Failed to send all prescriptions PDF via WhatsApp:', err);
    res.status(500).json({
      message: 'Failed to send all prescriptions PDF via WhatsApp.',
      error: err.message
    });
  }
});

router.get('/:id/download-all-prescriptions', protect, authorize('Pharmacist', 'Nurse'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const pdfFile = await generateAllPrescriptionsPdf(patient);
    const baseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.redirect(`${baseUrl}/api/pdf/${pdfFile.mongoId}`);
  } catch (err) {
    console.error('Failed to generate all prescriptions PDF:', err);
    res.status(500).json({
      message: 'Failed to download all PDFs.',
      error: err.message
    });
  }
});

router.get('/:id/qr', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id }).select('patientId name qrCode');
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json({ qrCode: patient.qrCode, patientId: patient.patientId, name: patient.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ─── GET /api/patients/stats/summary  ──  Dashboard stats ────────────────────
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayVisits = await Patient.countDocuments({ lastVisit: { $gte: today } });

    // Count by status in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const criticalPatients = await Patient.countDocuments({
      'vitalsHistory': {
        $elemMatch: {
          status: 'Critical',
          date: { $gte: thirtyDaysAgo }
        }
      }
    });

    res.json({ totalPatients, todayVisits, criticalPatients });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;
