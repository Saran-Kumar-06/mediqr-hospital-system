import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  patients: Patient[] = [];
  stats = { totalPatients: 0, todayVisits: 0, criticalPatients: 0 };
  loading = true;
  searchQuery = '';
  searchTimeout: any;

  constructor(private patientService: PatientService, public router: Router) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadPatients();
  }

  loadStats(): void {
    this.patientService.getStats().subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Stats error:', err)
    });
  }

  loadPatients(search = ''): void {
    this.loading = true;
    this.patientService.getPatients(search).subscribe({
      next: (data) => {
        this.patients = data.patients;
        this.loading = false;
      },
      error: (err) => {
        console.error('Load patients error:', err);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadPatients(this.searchQuery);
    }, 400);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getLastStatus(patient: Patient): string {
    if (!patient.vitalsHistory?.length) return '';
    return patient.vitalsHistory[patient.vitalsHistory.length - 1].status;
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
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
