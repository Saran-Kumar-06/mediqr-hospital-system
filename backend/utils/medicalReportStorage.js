const fs = require('fs');
const path = require('path');
const { getReportsDir } = require('./prescriptionPdfLocator');

const ALLOWED_MIME_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const ALLOWED_FILE_EXTENSIONS = new Set(Object.values(ALLOWED_MIME_TYPES));
const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function sanitizeFilePart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function parseBase64Payload({ dataUrl, base64Data, mimeType }) {
  let resolvedMimeType = String(mimeType || '').trim().toLowerCase();
  let encodedContent = String(base64Data || '').trim();

  if (dataUrl) {
    const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('File payload must be a valid base64 data URL.');
    }

    resolvedMimeType = String(match[1] || '').trim().toLowerCase();
    encodedContent = String(match[2] || '').trim();
  }

  if (!resolvedMimeType || !ALLOWED_MIME_TYPES[resolvedMimeType]) {
    throw new Error('Only PDF, JPG, PNG, and WebP files are supported.');
  }

  if (!encodedContent) {
    throw new Error('Uploaded file content is missing.');
  }

  let buffer;
  try {
    buffer = Buffer.from(encodedContent, 'base64');
  } catch (err) {
    throw new Error('Unable to decode uploaded file.');
  }

  if (!buffer.length) {
    throw new Error('Uploaded file is empty.');
  }

  return {
    buffer,
    mimeType: resolvedMimeType
  };
}

function resolveExtension(fileName, mimeType) {
  const originalExtension = path.extname(String(fileName || '')).toLowerCase();

  if (ALLOWED_FILE_EXTENSIONS.has(originalExtension)) {
    return originalExtension;
  }

  return ALLOWED_MIME_TYPES[mimeType];
}

function ensureReportDirectory(patientId) {
  const reportsDir = getReportsDir();
  const patientDir = path.join(
    reportsDir,
    'medical-reports',
    sanitizeFilePart(patientId) || 'patient'
  );

  fs.mkdirSync(patientDir, { recursive: true });
  return patientDir;
}

function saveMedicalReport({
  patientId,
  reportType,
  title,
  fileName,
  mimeType,
  dataUrl,
  base64Data
}) {
  const normalizedTitle = String(title || '').trim();
  const normalizedFileName = String(fileName || '').trim();

  if (!patientId) {
    throw new Error('Patient ID is required to store a report.');
  }

  if (!normalizedTitle) {
    throw new Error('Report title is required.');
  }

  if (!normalizedFileName) {
    throw new Error('Original file name is required.');
  }

  const normalizedReportType = ['Scan', 'Test', 'Lab', 'Other'].includes(reportType)
    ? reportType
    : 'Other';

  const { buffer, mimeType: resolvedMimeType } = parseBase64Payload({
    dataUrl,
    base64Data,
    mimeType
  });

  const maxUploadBytes = Number(process.env.MEDICAL_REPORT_MAX_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;
  if (buffer.length > maxUploadBytes) {
    throw new Error(`Uploaded file is too large. Maximum allowed size is ${Math.round(maxUploadBytes / (1024 * 1024))} MB.`);
  }

  const extension = resolveExtension(normalizedFileName, resolvedMimeType);
  const patientDir = ensureReportDirectory(patientId);
  const titleToken = sanitizeFilePart(normalizedTitle) || 'report';
  const storedFileName = `${Date.now()}_${titleToken}${extension}`;
  const absolutePath = path.join(patientDir, storedFileName);

  fs.writeFileSync(absolutePath, buffer);

  return {
    reportType: normalizedReportType,
    title: normalizedTitle,
    fileName: normalizedFileName,
    storedFileName,
    mimeType: resolvedMimeType,
    fileSize: buffer.length,
    relativePath: path.relative(getReportsDir(), absolutePath),
    uploadedAt: new Date()
  };
}

function serializeMedicalReport(req, report) {
  if (!report) {
    return null;
  }

  const plainReport = typeof report.toObject === 'function' ? report.toObject() : { ...report };

  return {
    ...plainReport,
    relativePath: String(plainReport.relativePath || '').split(path.sep).join('/')
  };
}

module.exports = {
  saveMedicalReport,
  serializeMedicalReport
};
