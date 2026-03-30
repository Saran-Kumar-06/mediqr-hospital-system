import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Patient, VitalsEntry } from '../../models/patient.model';

@Component({
  selector: 'app-visit-history',
  templateUrl: './visit-history.component.html',
  styleUrls: ['./visit-history.component.scss']
})
export class VisitHistoryComponent implements OnInit {
  patient: Patient | null = null;
  loading = true;
  errorMsg = '';
  patientId = '';
  editingFeedbackId: string | null = null;
  feedbackDraft = '';
  savingFeedback = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    if (this.patientId) this.loadPatient();
  }

  loadPatient(): void {
    this.patientService.getPatient(this.patientId).subscribe({
      next: (data) => { this.patient = data; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'Failed to load patient.'; }
    });
  }

  get sortedVisits(): VitalsEntry[] {
    if (!this.patient?.vitalsHistory) return [];
    return [...this.patient.vitalsHistory].reverse();
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      Normal: 'badge-normal', Low: 'badge-low',
      High: 'badge-high', Critical: 'badge-critical'
    };
    return map[status] || '';
  }

  getStatusBg(status: string): string {
    const map: Record<string, string> = {
      Normal: 'visit-normal', Low: 'visit-low',
      High: 'visit-high', Critical: 'visit-critical'
    };
    return map[status] || '';
  }

  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatTime(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  startEditFeedback(visit: VitalsEntry): void {
    this.editingFeedbackId = visit._id || null;
    this.feedbackDraft = visit.doctorFeedback || '';
  }

  cancelEditFeedback(): void {
    this.editingFeedbackId = null;
    this.feedbackDraft = '';
  }

  saveFeedback(visitId: string): void {
    if (!this.patient) return;
    this.savingFeedback = true;
    this.patientService.updateFeedback(this.patientId, visitId, this.feedbackDraft).subscribe({
      next: () => {
        const visit = this.patient!.vitalsHistory.find(v => v._id === visitId);
        if (visit) visit.doctorFeedback = this.feedbackDraft;
        this.editingFeedbackId = null;
        this.savingFeedback = false;
      },
      error: () => { this.savingFeedback = false; }
    });
  }
}
