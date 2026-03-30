import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { MedicalReport, Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-medical-reports',
  templateUrl: './medical-reports.component.html',
  styleUrls: ['./medical-reports.component.scss']
})
export class MedicalReportsComponent {
  @Input() patientId = '';
  @Input() patient: Patient | null = null;

  form: FormGroup;
  selectedFile: File | null = null;
  uploading = false;
  sendingReportId: string | null = null;
  successMsg = '';
  errorMsg = '';
  readonly reportBaseUrl = environment.apiUrl.replace(/\/api$/, '');

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService
  ) {
    this.form = this.fb.group({
      reportType: ['Scan', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(120)]]
    });
  }

  get reports(): MedicalReport[] {
    return [...(this.patient?.medicalReports || [])].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async uploadReport(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    if (!this.selectedFile) {
      this.errorMsg = 'Please choose a PDF or image report first.';
      return;
    }

    this.uploading = true;

    try {
      const dataUrl = await this.readFileAsDataUrl(this.selectedFile);

      this.patientService.uploadMedicalReport(this.patientId, {
        reportType: this.form.value.reportType,
        title: String(this.form.value.title || '').trim(),
        fileName: this.selectedFile.name,
        mimeType: this.selectedFile.type,
        dataUrl
      }).subscribe({
        next: (res) => {
          this.uploading = false;
          if (this.patient) {
            this.patient.medicalReports = this.patient.medicalReports || [];
            this.patient.medicalReports.unshift(res.report);
          }
          this.successMsg = res.message || 'Medical report uploaded successfully.';
          this.form.reset({ reportType: 'Scan', title: '' });
          this.selectedFile = null;
          setTimeout(() => this.successMsg = '', 3000);
        },
        error: (err) => {
          this.uploading = false;
          this.errorMsg = err.error?.error || err.error?.message || 'Failed to upload medical report.';
        }
      });
    } catch (err: any) {
      this.uploading = false;
      this.errorMsg = err?.message || 'Unable to read the selected file.';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.errorMsg = '';

    if (!file) {
      this.selectedFile = null;
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.selectedFile = null;
      input.value = '';
      this.errorMsg = 'Only PDF, JPG, PNG, and WebP files are supported.';
      return;
    }

    this.selectedFile = file;

    if (!this.form.value.title) {
      this.form.patchValue({
        title: file.name.replace(/\.[^.]+$/, '')
      });
    }
  }

  sendReportWhatsapp(report: MedicalReport): void {
    if (!this.patient?.patientId || !report._id) {
      return;
    }

    this.errorMsg = '';
    this.successMsg = '';
    this.sendingReportId = report._id;

    this.patientService.sendMedicalReportWhatsapp(this.patient.patientId, report._id).subscribe({
      next: (res) => {
        this.sendingReportId = null;
        this.successMsg = res.message || 'Medical report request sent to Twilio.';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.sendingReportId = null;
        this.errorMsg = err.error?.error || err.error?.message || 'Failed to send medical report to WhatsApp.';
      }
    });
  }

  getReportUrl(report: MedicalReport): string {
    const normalizedPath = String(report.relativePath || '').replace(/\\/g, '/');
    return `${this.reportBaseUrl}/reports/${encodeURI(normalizedPath)}`;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read the selected file.'));
      reader.readAsDataURL(file);
    });
  }
}
