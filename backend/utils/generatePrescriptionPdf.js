const fs = require('fs');
const path = require('path');
const { getReportsDir } = require('./prescriptionPdfLocator');

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 50;
const TOP_Y = 790;
const BOTTOM_Y = 50;

function sanitizeFilePart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function escapePdfText(value) {
  return String(value || '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTimingSummary(medicine) {
  const timings = [];

  if (medicine.morning) timings.push('Morning');
  if (medicine.afternoon) timings.push('Afternoon');
  if (medicine.night) timings.push('Night');

  return timings.join(', ') || 'Not specified';
}

function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);

  if (!words.length) {
    return [''];
  }

  const lines = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const nextWord = words[index];
    const candidate = `${currentLine} ${nextWord}`;

    if (candidate.length <= maxChars) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = nextWord;
    }
  }

  lines.push(currentLine);
  return lines;
}

function pushWrappedLines(lines, text, options = {}) {
  const {
    font = 'F1',
    size = 11,
    indent = 0,
    maxChars = Math.max(24, 88 - Math.floor(indent / 4)),
    gapAfter = 0
  } = options;

  const wrappedLines = wrapText(text, maxChars);

  wrappedLines.forEach((lineText, index) => {
    lines.push({
      text: lineText,
      font,
      size,
      indent,
      gapAfter: index === wrappedLines.length - 1 ? gapAfter : 0
    });
  });
}

function buildPrescriptionGroups(patient) {
  const groups = new Map();

  for (const prescription of patient.prescriptions || []) {
    const key = prescription.prescriptionGroupId || String(prescription._id || '');
    const existing = groups.get(key) || [];
    existing.push(prescription);
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .map(([id, medicines]) => ({
      id,
      medicines: medicines.sort((a, b) => new Date(a.date) - new Date(b.date)),
      prescribedOn: medicines[0]?.date
    }))
    .sort((a, b) => new Date(a.prescribedOn) - new Date(b.prescribedOn));
}

function buildDocumentLines(patient, groups, title) {
  const lines = [];

  lines.push({ text: title, font: 'F2', size: 18, gapAfter: 8 });
  lines.push({ text: `Generated: ${formatDateTime(new Date())}`, font: 'F1', size: 11, gapAfter: 12 });

  lines.push({ text: 'Patient Details', font: 'F2', size: 13, gapAfter: 6 });
  pushWrappedLines(lines, `Patient ID: ${patient.patientId}`);
  pushWrappedLines(lines, `Name: ${patient.name}`);
  pushWrappedLines(lines, `Age / Gender: ${patient.age} / ${patient.gender}`);
  pushWrappedLines(lines, `Phone: ${patient.phone || '-'}`);
  pushWrappedLines(lines, `Blood Group: ${patient.bloodGroup || 'Not Recorded'}`);
  if (patient.address) {
    pushWrappedLines(lines, `Address: ${patient.address}`);
  }

  lines.push({ text: '', font: 'F1', size: 11, gapAfter: 6 });

  groups.forEach((group, groupIndex) => {
    lines.push({
      text: `Prescription ${groupIndex + 1}`,
      font: 'F2',
      size: 14,
      gapAfter: 4
    });

    pushWrappedLines(lines, `Prescription ID: ${group.id}`, { size: 11 });
    pushWrappedLines(lines, `Issued: ${formatDateTime(group.prescribedOn)}`, { size: 11, gapAfter: 6 });

    group.medicines.forEach((medicine, medicineIndex) => {
      const medicineSummary = [
        `${medicineIndex + 1}. ${medicine.medicineName}`,
        `Dosage: ${medicine.dosage}`,
        `Timing: ${getTimingSummary(medicine)}`,
        `Food: ${medicine.mealTiming || 'After Food'}`,
        `Duration: ${medicine.days} day(s)`,
        `Status: ${medicine.dispensed ? 'Dispensed' : 'Pending'}`
      ].join(' | ');

      pushWrappedLines(lines, medicineSummary, {
        size: 11,
        indent: 12,
        gapAfter: 4
      });

      if (medicine.notes) {
        pushWrappedLines(lines, `Notes: ${medicine.notes}`, {
          size: 10,
          indent: 24,
          gapAfter: 4
        });
      }
    });

    lines.push({ text: '', font: 'F1', size: 11, gapAfter: 8 });
  });

  pushWrappedLines(
    lines,
    'This prescription was generated from the hospital record system. Please verify medicine details before dispensing.',
    { size: 10, gapAfter: 8 }
  );
  pushWrappedLines(lines, 'Doctor Signature: ____________________', { font: 'F2', size: 11 });

  return lines;
}

function paginateLines(lines) {
  const pages = [[]];
  let pageIndex = 0;
  let currentY = TOP_Y;

  for (const line of lines) {
    const lineHeight = Math.max(14, line.size + 4) + (line.gapAfter || 0);

    if (currentY - lineHeight < BOTTOM_Y) {
      pages.push([]);
      pageIndex += 1;
      currentY = TOP_Y;
    }

    pages[pageIndex].push({
      ...line,
      y: currentY
    });

    currentY -= lineHeight;
  }

  return pages;
}

function renderPageContent(pageLines) {
  return pageLines.map(line => {
    const x = MARGIN_X + (line.indent || 0);
    return `BT /${line.font || 'F1'} ${line.size || 11} Tf 1 0 0 1 ${x} ${line.y} Tm (${escapePdfText(line.text)}) Tj ET`;
  }).join('\n');
}

function buildPdfBuffer(pageContents) {
  const objects = [];
  const addObject = value => {
    objects.push(value);
    return objects.length;
  };

  const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const contentObjectIds = pageContents.map(content => addObject(
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`
  ));
  const pagesTreeId = addObject('');
  const pageObjectIds = contentObjectIds.map(contentId => addObject(
    `<< /Type /Page /Parent ${pagesTreeId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> >>`
  ));
  objects[pagesTreeId - 1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesTreeId} 0 R >>`);

  let pdf = '%PDF-1.4\n%1234\n';
  const offsets = [0];

  objects.forEach((objectValue, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${objectValue}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function ensureReportsDir() {
  const reportsDir = getReportsDir();
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function writePdfFile(fileName, lines) {
  const reportsDir = ensureReportsDir();
  const relativePath = fileName;
  const absolutePath = path.join(reportsDir, relativePath);
  const pages = paginateLines(lines);
  const pageContents = pages.map(renderPageContent);
  const pdfBuffer = buildPdfBuffer(pageContents);

  fs.writeFileSync(absolutePath, pdfBuffer);

  return {
    absolutePath,
    relativePath
  };
}

async function generateSinglePrescriptionPdf(patient, groupedPrescriptions, prescriptionId) {
  const group = {
    id: prescriptionId,
    medicines: groupedPrescriptions,
    prescribedOn: groupedPrescriptions[0]?.date
  };

  return writePdfFile(
    `prescription_${sanitizeFilePart(patient.patientId)}_${sanitizeFilePart(prescriptionId)}.pdf`,
    buildDocumentLines(patient, [group], 'Hospital Prescription')
  );
}

async function generateAllPrescriptionsPdf(patient) {
  const groups = buildPrescriptionGroups(patient);

  if (!groups.length) {
    throw new Error('No prescriptions found for this patient.');
  }

  return writePdfFile(
    `all_prescriptions_${sanitizeFilePart(patient.patientId)}.pdf`,
    buildDocumentLines(patient, groups, 'All Prescriptions')
  );
}

module.exports = {
  generateSinglePrescriptionPdf,
  generateAllPrescriptionsPdf
};
