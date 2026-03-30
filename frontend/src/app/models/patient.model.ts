export interface VitalsEntry {
  _id?: string;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  pulse?: number;
  oxygen?: number;
  weight?: number;
  status: 'Normal' | 'Low' | 'High' | 'Critical';
  conditions: string[];
  doctorFeedback: string;
  date: Date | string;
}

export interface Prescription {
  _id?: string;
  prescriptionGroupId?: string;
  medicineName: string;
  dosage: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  days: number;
  mealTiming: 'Before Food' | 'After Food';
  notes?: string;
  dispensed: boolean;
  date: Date | string;
}

export interface MedicalReport {
  _id?: string;
  reportType: 'Scan' | 'Test' | 'Lab' | 'Other';
  title: string;
  fileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  relativePath: string;
  uploadedAt: Date | string;
}

export interface Patient {
  _id?: string;
  patientId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  bloodGroup?: string;
  address?: string;
  qrCode?: string;
  vitalsHistory: VitalsEntry[];
  prescriptions: Prescription[];
  medicalReports: MedicalReport[];
  registeredAt?: Date | string;
  lastVisit?: Date | string;
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  limit: number;
}

export interface VitalsResult {
  message: string;
  vitals: VitalsEntry;
  status: string;
  conditions: string[];
}
