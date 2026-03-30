/**
 * Health Condition Evaluation Logic
 * Based on standard medical reference ranges
 */

const RANGES = {
  temperature: {
    low_critical:   { min: 0,    max: 35.0  },
    low:            { min: 35.0, max: 36.4  },
    normal:         { min: 36.5, max: 37.5  },
    high:           { min: 37.6, max: 38.9  },
    high_critical:  { min: 39.0, max: 999   }
  },
  systolic: {
    low_critical:   { min: 0,    max: 79    },
    low:            { min: 80,   max: 89    },
    normal:         { min: 90,   max: 120   },
    high:           { min: 121,  max: 139   },
    high_critical:  { min: 140,  max: 999   }
  },
  diastolic: {
    low_critical:   { min: 0,    max: 49    },
    low:            { min: 50,   max: 59    },
    normal:         { min: 60,   max: 80    },
    high:           { min: 81,   max: 89    },
    high_critical:  { min: 90,   max: 999   }
  },
  heartRate: {
    low_critical:   { min: 0,    max: 39    },
    low:            { min: 40,   max: 59    },
    normal:         { min: 60,   max: 100   },
    high:           { min: 101,  max: 150   },
    high_critical:  { min: 151,  max: 999   }
  },
  pulse: {
    low_critical:   { min: 0,    max: 39    },
    low:            { min: 40,   max: 59    },
    normal:         { min: 60,   max: 100   },
    high:           { min: 101,  max: 150   },
    high_critical:  { min: 151,  max: 999   }
  },
  oxygen: {
    low_critical:   { min: 0,    max: 89    },
    low:            { min: 90,   max: 94    },
    normal:         { min: 95,   max: 100   }
  }
};

function classify(value, ranges) {
  if (value === null || value === undefined || isNaN(value)) return null;
  for (const [level, range] of Object.entries(ranges)) {
    if (value >= range.min && value <= range.max) return level;
  }
  return null;
}

function evaluateVitals(vitals) {
  const conditions = [];
  let overallSeverity = 0; // 0=normal, 1=low/high, 2=critical

  const tempLevel = classify(vitals.temperature, RANGES.temperature);
  if (tempLevel === 'low_critical') {
    conditions.push('Critical – Hypothermia (Very Low Temperature)');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (tempLevel === 'high_critical') {
    conditions.push('Critical – High Fever (Hyperpyrexia)');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (tempLevel === 'low') {
    conditions.push('Low Body Temperature');
    overallSeverity = Math.max(overallSeverity, 1);
  } else if (tempLevel === 'high') {
    conditions.push('Fever (Elevated Temperature)');
    overallSeverity = Math.max(overallSeverity, 1);
  }

  const sysLevel = classify(vitals.bloodPressureSystolic, RANGES.systolic);
  const diaLevel = classify(vitals.bloodPressureDiastolic, RANGES.diastolic);

  if (sysLevel === 'high_critical' || diaLevel === 'high_critical') {
    conditions.push('Critical – Hypertensive Crisis (Very High Blood Pressure)');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (sysLevel === 'low_critical' || diaLevel === 'low_critical') {
    conditions.push('Critical – Severe Hypotension (Very Low Blood Pressure)');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (sysLevel === 'high' || diaLevel === 'high') {
    conditions.push('High Blood Pressure (Stage 1 Hypertension)');
    overallSeverity = Math.max(overallSeverity, 1);
  } else if (sysLevel === 'low' || diaLevel === 'low') {
    conditions.push('Low Blood Pressure (Hypotension)');
    overallSeverity = Math.max(overallSeverity, 1);
  }

  const hrLevel = classify(vitals.heartRate, RANGES.heartRate);
  if (hrLevel === 'low_critical') {
    conditions.push('Critical – Severe Bradycardia (Very Low Heart Rate)');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (hrLevel === 'high_critical') {
    conditions.push('Critical – Severe Tachycardia (Very High Heart Rate)');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (hrLevel === 'low') {
    conditions.push('Low Heart Rate (Bradycardia)');
    overallSeverity = Math.max(overallSeverity, 1);
  } else if (hrLevel === 'high') {
    conditions.push('High Heart Rate (Tachycardia)');
    overallSeverity = Math.max(overallSeverity, 1);
  }

  const pulseLevel = classify(vitals.pulse, RANGES.pulse);
  if (pulseLevel === 'low_critical') {
    conditions.push('Critical – Very Low Pulse Rate');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (pulseLevel === 'high_critical') {
    conditions.push('Critical – Very High Pulse Rate');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (pulseLevel === 'low') {
    conditions.push('Low Pulse Rate');
    overallSeverity = Math.max(overallSeverity, 1);
  } else if (pulseLevel === 'high') {
    conditions.push('High Pulse Rate');
    overallSeverity = Math.max(overallSeverity, 1);
  }

  const oxygenLevel = classify(vitals.oxygen, RANGES.oxygen);
  if (oxygenLevel === 'low_critical') {
    conditions.push('Critical – Severe Hypoxia (Very Low Oxygen)');
    overallSeverity = Math.max(overallSeverity, 2);
  } else if (oxygenLevel === 'low') {
    conditions.push('Low Oxygen Saturation (Mild Hypoxia)');
    overallSeverity = Math.max(overallSeverity, 1);
  }

  let status;
  if (overallSeverity === 2) status = 'Critical';
  else if (overallSeverity === 1) {
    // Determine if predominantly high or low
    const hasHigh = conditions.some(c => c.toLowerCase().includes('high') || c.toLowerCase().includes('fever') || c.toLowerCase().includes('tachy'));
    const hasLow  = conditions.some(c => c.toLowerCase().includes('low') || c.toLowerCase().includes('brady') || c.toLowerCase().includes('hypo'));
    if (hasHigh && hasLow) status = 'Critical'; // Mixed abnormal = escalate
    else if (hasHigh) status = 'High';
    else status = 'Low';
  } else {
    status = 'Normal';
  }

  if (conditions.length === 0) conditions.push('All vitals within normal range');

  return { status, conditions };
}

module.exports = { evaluateVitals };
