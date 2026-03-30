import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Patient, VitalsEntry } from '../../models/patient.model';

@Component({
  selector: 'app-vitals-entry',
  templateUrl: './vitals-entry.component.html',
  styleUrls: ['./vitals-entry.component.scss']
})
export class VitalsEntryComponent implements OnInit {
  form: FormGroup;
  patient: Patient | null = null;
  loadingPatient = true;
  submitting = false;
  result: VitalsEntry | null = null;
  errorMsg = '';
  patientId = '';

  normalRanges = {
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    systolic:    { min: 90,   max: 120,  unit: 'mmHg' },
    diastolic:   { min: 60,   max: 80,   unit: 'mmHg' },
    heartRate:   { min: 60,   max: 100,  unit: 'bpm' },
    pulse:       { min: 60,   max: 100,  unit: 'bpm' },
    oxygen:      { min: 95,   max: 100,  unit: '%' }
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService
  ) {
    this.form = this.fb.group({
      temperature:            ['', [Validators.min(30), Validators.max(45)]],
      bloodPressureSystolic:  ['', [Validators.min(50), Validators.max(300)]],
      bloodPressureDiastolic: ['', [Validators.min(30), Validators.max(200)]],
      heartRate:              ['', [Validators.min(20), Validators.max(300)]],
      pulse:                  ['', [Validators.min(20), Validators.max(300)]],
      oxygen:                 ['', [Validators.min(50), Validators.max(100)]],
      weight:                 ['', [Validators.min(1), Validators.max(500)]],
      doctorFeedback:         ['']
    });
  }

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    this.loadPatient();
  }

  loadPatient(): void {
    if (!this.patientId) return;
    this.patientService.getPatient(this.patientId).subscribe({
      next: (data) => { this.patient = data; this.loadingPatient = false; },
      error: () => { this.loadingPatient = false; this.errorMsg = 'Patient not found.'; }
    });
  }

  getStatusIndicator(field: string, value: any): 'normal' | 'low' | 'high' | 'critical' | '' {
    if (!value) return '';
    const v = parseFloat(value);
    const ranges: any = {
      temperature:            { low: 36.5, high: 37.5, crit_low: 35, crit_high: 39 },
      bloodPressureSystolic:  { low: 90,   high: 120,  crit_low: 80, crit_high: 140 },
      bloodPressureDiastolic: { low: 60,   high: 80,   crit_low: 50, crit_high: 90 },
      heartRate:              { low: 60,   high: 100,  crit_low: 40, crit_high: 150 },
      pulse:                  { low: 60,   high: 100,  crit_low: 40, crit_high: 150 },
      oxygen:                 { low: 95,   high: 100,  crit_low: 90, crit_high: 999 }
    };
    const r = ranges[field];
    if (!r) return '';
    if (v < r.crit_low || v > r.crit_high) return 'critical';
    if (v < r.low || v > r.high) return (v < r.low ? 'low' : 'high');
    return 'normal';
  }

  submit(): void {
    const allEmpty = Object.keys(this.form.value)
      .filter(k => k !== 'doctorFeedback')
      .every(k => !this.form.value[k]);

    if (allEmpty) {
      this.errorMsg = 'Please enter at least one vital sign.';
      return;
    }

    const payload: any = { doctorFeedback: this.form.value.doctorFeedback || '' };
    const fields = ['temperature','bloodPressureSystolic','bloodPressureDiastolic','heartRate','pulse','oxygen','weight'];
    fields.forEach(f => {
      if (this.form.value[f] !== '' && this.form.value[f] !== null) {
        payload[f] = parseFloat(this.form.value[f]);
      }
    });

    this.submitting = true;
    this.errorMsg = '';

    this.patientService.addVitals(this.patientId, payload).subscribe({
      next: (res) => {
        this.submitting = false;
        this.result = res.vitals;
      },
      error: (err) => {
        this.submitting = false;
        this.errorMsg = err.error?.message || 'Failed to save vitals.';
      }
    });
  }

  getResultStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Normal': 'badge-normal',
      'Low': 'badge-low',
      'High': 'badge-high',
      'Critical': 'badge-critical'
    };
    return map[status] || '';
  }

  getResultBannerClass(status: string): string {
    const map: Record<string, string> = {
      'Normal': 'result-normal',
      'Low': 'result-low',
      'High': 'result-high',
      'Critical': 'result-critical'
    };
    return map[status] || '';
  }
}
