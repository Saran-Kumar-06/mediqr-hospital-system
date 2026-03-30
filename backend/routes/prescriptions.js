const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const { sendPrescriptionPdf } = require('../utils/sendWhatsappPdf');
const { generateSinglePrescriptionPdf } = require('../utils/generatePrescriptionPdf');
const {
  buildReportUrl,
  isPubliclyReachableUrl
} = require('../utils/prescriptionPdfLocator');

router.post('/:id/send-whatsapp', async (req, res) => {
  const prescriptionId = req.params.id;

  try {
    let patient = await Patient.findOne({
      'prescriptions.prescriptionGroupId': prescriptionId
    });

    if (!patient && mongoose.Types.ObjectId.isValid(prescriptionId)) {
      patient = await Patient.findOne({
        'prescriptions._id': prescriptionId
      });
    }

    if (!patient) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    let groupedPrescriptions = patient.prescriptions.filter(
      prescription => prescription.prescriptionGroupId === prescriptionId
    );

    if (!groupedPrescriptions.length) {
      const singlePrescription = patient.prescriptions.id(prescriptionId);
      if (singlePrescription) {
        groupedPrescriptions = [singlePrescription];
      }
    }

    if (!groupedPrescriptions.length) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (!patient.phone) {
      return res.status(400).json({ message: 'Patient phone number is not available.' });
    }

    const pdfFile = await generateSinglePrescriptionPdf(
      patient,
      groupedPrescriptions,
      prescriptionId
    );

    const pdfUrl = buildReportUrl(req, pdfFile.relativePath);
    if (!isPubliclyReachableUrl(pdfUrl)) {
      return res.status(400).json({
        message: 'Twilio cannot access a localhost/private media URL. Set PUBLIC_BASE_URL to a public URL before sending WhatsApp PDFs.',
        error: `Current media URL: ${pdfUrl}`
      });
    }

    const twilioResponse = await sendPrescriptionPdf(
      patient.phone,
      pdfUrl,
      'Your prescription PDF is attached.'
    );

    console.log('Twilio WhatsApp single prescription response:', {
      sid: twilioResponse.sid,
      status: twilioResponse.status,
      errorCode: twilioResponse.errorCode,
      errorMessage: twilioResponse.errorMessage,
      to: twilioResponse.to
    });

    res.json({
      message: twilioResponse.status === 'delivered'
        ? 'Prescription PDF delivered to WhatsApp successfully.'
        : `Prescription PDF request accepted by Twilio with status: ${twilioResponse.status}.`,
      sid: twilioResponse.sid,
      status: twilioResponse.status,
      errorCode: twilioResponse.errorCode,
      errorMessage: twilioResponse.errorMessage,
      pdfUrl
    });
  } catch (err) {
    console.error('Failed to send prescription PDF via WhatsApp:', err);
    res.status(500).json({
      message: 'Failed to send prescription PDF via WhatsApp.',
      error: err.message
    });
  }
});

module.exports = router;
