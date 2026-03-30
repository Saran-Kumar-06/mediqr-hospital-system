import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PatientService } from '../../services/patient.service';
import { Patient, Prescription } from '../../models/patient.model';

type PrescriptionDraft = Omit<Prescription, '_id' | 'dispensed' | 'date'>;
type PrescriptionGroup = {
  id: string;
  medicines: Prescription[];
  prescribedOn: Date | string;
  allDispensed: boolean;
  canDispenseAll: boolean;
};

@Component({
  selector: 'app-prescription',
  templateUrl: './prescription.component.html',
  styleUrls: ['./prescription.component.scss']
})
export class PrescriptionComponent implements OnInit {
  @Input() patientId = '';
  @Input() patient: Patient | null = null;

  form: FormGroup;
  showForm = false;
  submitting = false;
  dispensing: string | null = null;
  dispensingGroup: string | null = null;
  sendingGroup: string | null = null;
  sendingAll = false;
  successMsg = '';
  errorMsg = '';
  draftMedicines: PrescriptionDraft[] = [];

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService
  ) {
    this.form = this.createMedicineForm();
  }

  ngOnInit(): void {}

  private createMedicineForm(): FormGroup {
    return this.fb.group({
      medicineName: ['', Validators.required],
      dosage:       ['', Validators.required],
      morning:      [false],
      afternoon:    [false],
      night:        [false],
      days:         ['', [Validators.required, Validators.min(1)]],
      mealTiming:   ['After Food', Validators.required]
    });
  }

  get prescriptions(): Prescription[] {
    return this.patient?.prescriptions || [];
  }

  get sortedPrescriptions(): Prescription[] {
    return [...this.prescriptions].reverse();
  }

  get prescriptionGroups(): PrescriptionGroup[] {
    const groups = new Map<string, Prescription[]>();

    for (const rx of this.prescriptions) {
      const key = rx.prescriptionGroupId || rx._id || `${rx.medicineName}-${rx.date}`;
      const existing = groups.get(key) || [];
      existing.push(rx);
      groups.set(key, existing);
    }

    return [...groups.entries()]
      .map(([id, medicines]) => ({
        id,
        medicines: medicines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        prescribedOn: medicines[0]?.date,
        allDispensed: medicines.every(medicine => medicine.dispensed),
        canDispenseAll: medicines.every(medicine => !!medicine.prescriptionGroupId) ||
          (medicines.length === 1 && !!medicines[0]?._id)
      }))
      .sort((a, b) => new Date(b.prescribedOn).getTime() - new Date(a.prescribedOn).getTime());
  }

  get hasCurrentMedicineInput(): boolean {
    const { medicineName, dosage, days, morning, afternoon, night } = this.form.getRawValue();
    return !!(medicineName || dosage || days || morning || afternoon || night);
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetPrescriptionBuilder();
    this.errorMsg = '';
    this.successMsg = '';
  }

  private resetMedicineForm(): void {
    this.form.reset({ morning: false, afternoon: false, night: false, mealTiming: 'After Food' });
  }

  private resetPrescriptionBuilder(): void {
    this.resetMedicineForm();
    this.draftMedicines = [];
  }

  private validateCurrentMedicine(): boolean {
    this.form.markAllAsTouched();
    if (this.form.invalid) return false;
    if (!this.form.value.morning && !this.form.value.afternoon && !this.form.value.night) {
      this.errorMsg = 'Please select at least one timing (morning, afternoon, or night).';
      return false;
    }
    return true;
  }

  private getCurrentMedicine(): PrescriptionDraft {
    const value = this.form.getRawValue();
    return {
      medicineName: value.medicineName.trim(),
      dosage: value.dosage.trim(),
      morning: value.morning,
      afternoon: value.afternoon,
      night: value.night,
      days: Number(value.days),
      mealTiming: value.mealTiming
    };
  }

  addAnotherMedicine(): void {
    this.errorMsg = '';
    if (!this.validateCurrentMedicine()) return;

    this.draftMedicines.push(this.getCurrentMedicine());
    this.resetMedicineForm();
  }

  removeDraftMedicine(index: number): void {
    this.draftMedicines.splice(index, 1);
  }

  submit(): void {
    this.errorMsg = '';

    const medicines = [...this.draftMedicines];

    if (this.hasCurrentMedicineInput || medicines.length === 0) {
      if (!this.validateCurrentMedicine()) return;
      medicines.push(this.getCurrentMedicine());
    }

    if (medicines.length === 0) {
      this.errorMsg = 'Please add at least one medicine.';
      return;
    }

    this.submitting = true;
    const payload = medicines.length === 1 ? medicines[0] : { medicines };

    this.patientService.addPrescription(this.patientId, payload).subscribe({
      next: (res) => {
        this.submitting = false;
        this.showForm = false;
        this.resetPrescriptionBuilder();
        if (this.patient) {
          const savedPrescriptions = res.prescriptions || (res.prescription ? [res.prescription] : []);
          this.patient.prescriptions.push(...savedPrescriptions);
        }
        const count = res.prescriptions?.length || 1;
        this.successMsg = count > 1
          ? `${count} medicines added to the prescription.`
          : 'Prescription added successfully.';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMsg = err.error?.message || 'Failed to add prescription.';
      }
    });
  }

  markDispensed(rxId: string): void {
    this.dispensing = rxId;
    this.patientService.markDispensed(this.patientId, rxId).subscribe({
      next: () => {
        const rx = this.patient?.prescriptions.find(p => p._id === rxId);
        if (rx) rx.dispensed = true;
        this.dispensing = null;
      },
      error: () => { this.dispensing = null; }
    });
  }

  markGroupDispensed(groupId: string): void {
    this.errorMsg = '';
    this.dispensingGroup = groupId;
    this.patientService.markPrescriptionGroupDispensed(this.patientId, groupId).subscribe({
      next: (res) => {
        const updatedIds = new Set((res.prescriptions || []).map((p: Prescription) => p._id));
        this.patient?.prescriptions
          .filter(p => updatedIds.has(p._id))
          .forEach(p => { p.dispensed = true; });
        this.dispensingGroup = null;
      },
      error: (err) => {
        this.dispensingGroup = null;
        this.errorMsg = err.error?.message || 'Failed to dispense all medicines.';
      }
    });
  }

  sendPrescriptionWhatsapp(group: PrescriptionGroup): void {
    this.errorMsg = '';
    this.sendingGroup = group.id;

    this.patientService.sendPrescriptionWhatsapp(group.id).subscribe({
      next: (res) => {
        this.sendingGroup = null;
        this.successMsg = res.message || 'Prescription request sent to Twilio.';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.sendingGroup = null;
        this.errorMsg = err.error?.error || err.error?.message || 'Failed to send prescription to WhatsApp.';
      }
    });
  }

  sendAllPrescriptionsWhatsapp(): void {
    if (!this.patient) return;

    this.errorMsg = '';
    this.sendingAll = true;

    this.patientService.sendAllPrescriptionsWhatsapp(this.patient.patientId).subscribe({
      next: (res) => {
        this.sendingAll = false;
        this.successMsg = res.message || 'All prescriptions request sent to Twilio.';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.sendingAll = false;
        this.errorMsg = err.error?.error || err.error?.message || 'Failed to send all prescriptions to WhatsApp.';
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getGroupStatusLabel(group: PrescriptionGroup): string {
    return group.allDispensed ? 'Fully Dispensed' : 'Partially Pending';
  }

  downloadPrescriptionPdf(group: PrescriptionGroup): void {
    if (!this.patient) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      this.errorMsg = 'Unable to open print window. Please allow pop-ups and try again.';
      return;
    }

    const html = this.buildPrescriptionPrintHtml([group], `Prescription ${this.patient.patientId}`);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  downloadAllPrescriptionsPdf(): void {
    if (!this.patient || !this.prescriptionGroups.length) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      this.errorMsg = 'Unable to open print window. Please allow pop-ups and try again.';
      return;
    }

    const html = this.buildPrescriptionPrintHtml(
      this.prescriptionGroups,
      `All Prescriptions ${this.patient.patientId}`
    );
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  formatDateTime(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private buildPrescriptionPrintHtml(groups: PrescriptionGroup[], title: string): string {
    const patient = this.patient!;
    const groupSections = groups.map((group, groupIndex) => {
      const prescribedOn = this.formatDateTime(group.prescribedOn);
      const medicinesMarkup = group.medicines.map((medicine, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${this.escapeHtml(medicine.medicineName)}</td>
          <td>${this.escapeHtml(medicine.dosage)}</td>
          <td>${this.escapeHtml(this.getTimingSummary(medicine))}</td>
          <td>${this.escapeHtml(medicine.mealTiming || 'After Food')}</td>
          <td>${medicine.days} day(s)</td>
          <td>${medicine.dispensed ? 'Dispensed' : 'Pending'}</td>
        </tr>
      `).join('');

      return `
        <section class="rx-section">
          <div class="rx-section-head">
            <div>
              <div class="rx-section-title">Prescription ${groupIndex + 1}</div>
              <div class="subline">Prescription ID: ${this.escapeHtml(group.id)}</div>
              <div class="subline">Issued: ${this.escapeHtml(prescribedOn)}</div>
            </div>
            <div class="status-pill ${group.allDispensed ? 'done' : 'pending'}">
              ${this.escapeHtml(this.getGroupStatusLabel(group))}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Timing</th>
                <th>Food</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${medicinesMarkup}
            </tbody>
          </table>
        </section>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${this.escapeHtml(title)}</title>
          <style>
            body {
              margin: 0;
              padding: 32px;
              color: #16323a;
              background: #f6fbfc;
              font-family: "Times New Roman", Georgia, serif;
            }
            .sheet {
              max-width: 820px;
              margin: 0 auto;
              border: 1px solid #8fb9c3;
              background: #ffffff;
              padding: 28px 32px 36px;
            }
            .topline {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #79aebb;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            .clinic-name {
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              color: #14566b;
            }
            .subline, .meta, .footnote {
              font-size: 14px;
              line-height: 1.5;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin: 18px 0 8px;
              color: #14566b;
            }
            .patient-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 24px;
              margin-bottom: 12px;
            }
            .rx-mark {
              font-size: 34px;
              font-weight: 700;
              margin: 20px 0 12px;
              color: #14566b;
            }
            .rx-section {
              margin-top: 18px;
              padding-top: 12px;
              border-top: 1px solid #bfd7de;
            }
            .rx-section:first-of-type {
              border-top: 0;
              padding-top: 0;
            }
            .rx-section-head {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              margin-bottom: 10px;
            }
            .rx-section-title {
              font-size: 18px;
              font-weight: 700;
              color: #14566b;
            }
            .status-pill {
              padding: 6px 10px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 700;
              border: 1px solid #79aebb;
              background: #eaf4f7;
              color: #14566b;
            }
            .status-pill.done {
              background: #edf7f0;
              border-color: #99c6a4;
              color: #25603a;
            }
            .status-pill.pending {
              background: #f7f4ea;
              border-color: #d7c697;
              color: #7a5c12;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }
            th, td {
              border: 1px solid #93b8c2;
              padding: 8px 10px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #eaf4f7;
              font-weight: 700;
              color: #14566b;
            }
            .signature {
              margin-top: 44px;
              display: flex;
              justify-content: flex-end;
            }
            .signature-box {
              width: 220px;
              text-align: center;
              padding-top: 28px;
              border-top: 1px solid #6f9aa7;
              font-size: 14px;
            }
            @media print {
              body { padding: 0; }
              .sheet { border: 0; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="topline">
              <div>
                <div class="clinic-name">Hospital Prescription</div>
                <div class="subline">Patient ID: ${this.escapeHtml(patient.patientId)}</div>
                <div class="subline">Generated: ${this.escapeHtml(this.formatDateTime(new Date()))}</div>
              </div>
              <div class="meta">
                <div>Total Prescriptions: ${groups.length}</div>
                <div>Total Medicines: ${groups.reduce((sum, group) => sum + group.medicines.length, 0)}</div>
              </div>
            </div>

            <div class="section-title">Patient Details</div>
            <div class="patient-grid">
              <div><strong>Name:</strong> ${this.escapeHtml(patient.name)}</div>
              <div><strong>Age / Gender:</strong> ${patient.age} / ${this.escapeHtml(patient.gender)}</div>
              <div><strong>Phone:</strong> ${this.escapeHtml(patient.phone)}</div>
              <div><strong>Blood Group:</strong> ${this.escapeHtml(patient.bloodGroup || 'Not Recorded')}</div>
            </div>

            <div class="rx-mark">Rx</div>
            ${groupSections}

            <div class="section-title">Notes</div>
            <div class="footnote">This prescription was generated from the hospital record system. Please verify the medicine details before dispensing.</div>

            <div class="signature">
              <div class="signature-box">Doctor Signature</div>
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
  }

  private getTimingSummary(medicine: Prescription): string {
    const timings = [];
    if (medicine.morning) timings.push('Morning');
    if (medicine.afternoon) timings.push('Afternoon');
    if (medicine.night) timings.push('Night');
    return timings.join(', ') || 'Not specified';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
