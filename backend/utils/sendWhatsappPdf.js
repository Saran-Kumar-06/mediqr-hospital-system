const twilio = require('twilio');

let client = null;

function getTwilioClient() {
  if (client) {
    return client;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not configured.');
  }

  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

function normalizeWhatsappRecipient(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) {
    throw new Error('Patient phone number is missing.');
  }

  if (digits.length === 10) {
    return `whatsapp:+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `whatsapp:+${digits}`;
  }

  if (digits.length > 10) {
    return `whatsapp:+${digits}`;
  }

  throw new Error('Patient phone number is invalid.');
}

async function sendWhatsappMedia(phone, mediaUrl, body = 'Your document is attached.') {
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!fromNumber) {
    throw new Error('TWILIO_WHATSAPP_NUMBER is not configured.');
  }

  const twilioClient = getTwilioClient();

  return twilioClient.messages.create({
    from: `whatsapp:${fromNumber}`,
    to: normalizeWhatsappRecipient(phone),
    body,
    mediaUrl: [mediaUrl]
  });
}

async function sendPrescriptionPdf(phone, pdfUrl, body = 'Your prescription is attached.') {
  return sendWhatsappMedia(phone, pdfUrl, body);
}

module.exports = {
  sendPrescriptionPdf,
  sendWhatsappMedia
};
