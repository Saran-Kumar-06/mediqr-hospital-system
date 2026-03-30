import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  success = false;
  errorMsg = '';
  registeredPatient: Patient | null = null;

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name:       ['', [Validators.required, Validators.minLength(2)]],
      age:        ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      gender:     ['', Validators.required],
      phone:      ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-()]{7,15}$/)]],
      bloodGroup: [''],
      address:    ['']
    });
  }

  get f() { return this.form.controls; }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMsg = '';

    this.patientService.registerPatient(this.form.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = true;
        this.registeredPatient = res.patient;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  downloadQR(): void {
    if (!this.registeredPatient?.qrCode) return;
    const link = document.createElement('a');
    link.href = this.registeredPatient.qrCode;
    link.download = `QR_${this.registeredPatient.patientId}.png`;
    link.click();
  }

  printQR(): void {
    window.print();
  }

  viewPatient(): void {
    if (this.registeredPatient) {
      this.router.navigate(['/patient', this.registeredPatient.patientId]);
    }
  }

  registerAnother(): void {
    this.form.reset();
    this.success = false;
    this.registeredPatient = null;
    this.errorMsg = '';
  }
}
