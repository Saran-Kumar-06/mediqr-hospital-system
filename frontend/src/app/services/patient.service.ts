import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Patient, VitalsEntry, Prescription, MedicalReport } from '../models/patient.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Patients ─────────────────────────────────────────────────────────────
  registerPatient(data: Partial<Patient>): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients`, data);
  }

  getPatients(search = '', page = 1, limit = 20): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (search) params = params.set('search', search);
    return this.http.get(`${this.apiUrl}/patients`, { params });
  }

  getPatient(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/patients/${patientId}`);
  }

  updatePatient(patientId: string, data: Partial<Patient>): Observable<any> {
    return this.http.put(`${this.apiUrl}/patients/${patientId}`, data);
  }

  getQrCode(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/patients/${patientId}/qr`);
  }

  // ── Vitals ────────────────────────────────────────────────────────────────
  addVitals(patientId: string, vitals: Partial<VitalsEntry>): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/vitals`, vitals);
  }

  updateFeedback(patientId: string, vitalsId: string, feedback: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/patients/${patientId}/vitals/${vitalsId}/feedback`,
      { doctorFeedback: feedback }
    );
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────
  addPrescription(
    patientId: string,
    rx: Partial<Prescription> | { medicines: Partial<Prescription>[] }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/prescriptions`, rx);
  }

  markDispensed(patientId: string, rxId: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/patients/${patientId}/prescriptions/${rxId}/dispense`,
      {}
    );
  }

  markPrescriptionGroupDispensed(patientId: string, groupId: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/patients/${patientId}/prescriptions/group/${groupId}/dispense-all`,
      {}
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  sendPrescriptionWhatsapp(groupId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/prescriptions/${groupId}/send-whatsapp`, {});
  }

  sendAllPrescriptionsWhatsapp(patientId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/send-all-prescriptions`, {});
  }

  uploadMedicalReport(
    patientId: string,
    report: Partial<MedicalReport> & { dataUrl: string; fileName: string; title: string }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/reports`, report);
  }

  sendMedicalReportWhatsapp(patientId: string, reportId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/reports/${reportId}/send-whatsapp`, {});
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/patients/stats/summary`);
  }
}
