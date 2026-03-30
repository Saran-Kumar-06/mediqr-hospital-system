const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function getReportsDir() {
  const configuredDir = process.env.PRESCRIPTION_REPORTS_DIR || process.env.REPORTS_DIR;

  if (configuredDir) {
    return path.isAbsolute(configuredDir)
      ? configuredDir
      : path.resolve(__dirname, '..', configuredDir);
  }

  return path.join(__dirname, '..', 'reports');
}

function listPdfFiles(dir = getReportsDir(), baseDir = dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listPdfFiles(absolutePath, baseDir);
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.pdf') {
      return [];
    }

    return [{
      absolutePath,
      relativePath: path.relative(baseDir, absolutePath),
      lowerName: entry.name.toLowerCase()
    }];
  });
}

function sanitizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function findByExactNames(files, names) {
  if (!names.length) {
    return null;
  }

  const exactNames = new Set(names.map(name => name.toLowerCase()));
  return files.find(file => exactNames.has(path.basename(file.relativePath).toLowerCase())) || null;
}

function findByTokens(files, tokens, extraRequiredTokens = []) {
  const requiredTokens = tokens.filter(Boolean).map(sanitizeToken);
  const extraTokens = extraRequiredTokens.filter(Boolean).map(sanitizeToken);

  if (!requiredTokens.length && !extraTokens.length) {
    return null;
  }

  return files.find(file => {
    const normalizedName = sanitizeToken(file.relativePath);
    return requiredTokens.every(token => normalizedName.includes(token))
      && extraTokens.every(token => normalizedName.includes(token));
  }) || null;
}

function resolveSinglePrescriptionPdf(patientId, prescriptionIdentifier) {
  const files = listPdfFiles();
  const safePatientId = String(patientId || '').trim();
  const safeIdentifier = String(prescriptionIdentifier || '').trim();

  const exactMatch = findByExactNames(files, [
    `prescription_${safeIdentifier}.pdf`,
    `prescription-${safeIdentifier}.pdf`,
    `${safeIdentifier}.pdf`,
    `${safePatientId}_${safeIdentifier}.pdf`,
    `${safePatientId}-${safeIdentifier}.pdf`,
    `${safePatientId}_prescription_${safeIdentifier}.pdf`,
    `${safePatientId}-prescription-${safeIdentifier}.pdf`
  ]);

  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatch = findByTokens(
    files,
    [safePatientId, safeIdentifier],
    ['prescription']
  );

  if (fuzzyMatch) {
    return fuzzyMatch;
  }

  return findByTokens(files, [safeIdentifier], ['prescription']);
}

function resolveAllPrescriptionsPdf(patientId) {
  const files = listPdfFiles();
  const safePatientId = String(patientId || '').trim();

  const exactMatch = findByExactNames(files, [
    `all_prescriptions_${safePatientId}.pdf`,
    `all-prescriptions-${safePatientId}.pdf`,
    `${safePatientId}_all_prescriptions.pdf`,
    `${safePatientId}-all-prescriptions.pdf`,
    `${safePatientId}_combined_prescriptions.pdf`,
    `${safePatientId}-combined-prescriptions.pdf`
  ]);

  if (exactMatch) {
    return exactMatch;
  }

  return findByTokens(
    files,
    [safePatientId],
    ['prescription', 'all']
  ) || findByTokens(
    files,
    [safePatientId],
    ['prescription', 'combined']
  );
}

function buildReportUrl(req, reportRelativePath) {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
  const host = req.get('x-forwarded-host') || req.get('host');
  const baseUrl = process.env.PUBLIC_BASE_URL || `${protocol}://${host}`;
  const normalizedPath = reportRelativePath.split(path.sep).join('/');

  return `${baseUrl}/reports/${encodeURI(normalizedPath)}`;
}

function isPrivateHostname(hostname) {
  const value = String(hostname || '').toLowerCase();

  if (!value) {
    return true;
  }

  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(value)) {
    return true;
  }

  return /^10\./.test(value)
    || /^192\.168\./.test(value)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(value);
}

function isPubliclyReachableUrl(value) {
  try {
    const parsed = new URL(value);
    return !isPrivateHostname(parsed.hostname);
  } catch (err) {
    return false;
  }
}

module.exports = {
  getReportsDir,
  resolveSinglePrescriptionPdf,
  resolveAllPrescriptionsPdf,
  buildReportUrl,
  isPubliclyReachableUrl
};
