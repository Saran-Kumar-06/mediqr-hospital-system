import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';

@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.scss']
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  loading = true;
  errorMsg = '';
  showQR = false;
  activeTab: 'overview' | 'vitals' | 'prescriptions' = 'overview';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPatient(id);
  }

  loadPatient(id: string): void {
    this.loading = true;
    this.patientService.getPatient(id).subscribe({
      next: (data) => { this.patient = data; this.loading = false; },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.status === 404
          ? 'Patient not found.'
          : 'Failed to load patient.';
      }
    });
  }

  downloadQR(): void {
    if (!this.patient?.qrCode) return;
    const link = document.createElement('a');
    link.href = this.patient.qrCode;
    link.download = `QR_${this.patient.patientId}.png`;
    link.click();
  }

  getLatestVitals() {
    if (!this.patient?.vitalsHistory?.length) return null;
    return this.patient.vitalsHistory[this.patient.vitalsHistory.length - 1];
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Normal': 'badge-normal',
      'Low': 'badge-low',
      'High': 'badge-high',
      'Critical': 'badge-critical'
    };
    return map[status] || '';
  }

  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatDateShort(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  getTimeSince(date: any): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  get pendingPrescriptions() {
    return this.patient?.prescriptions?.filter(p => !p.dispensed) || [];
  }

  get recentPrescriptions() {
    return this.patient ? [...this.patient.prescriptions].reverse().slice(0, 3) : [];
  }
}
