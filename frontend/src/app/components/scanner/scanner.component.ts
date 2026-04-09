import { Component, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { PatientService } from '../../services/patient.service';

import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss']
})
export class ScannerComponent implements AfterViewInit, OnDestroy {
  mode: 'camera' | 'upload' | 'manual' = 'camera';
  scanResult = '';
  manualId = '';
  loading = false;
  errorMsg = '';
  successMsg = '';
  scanner: any = null;

  constructor(
    private patientService: PatientService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (this.mode === 'camera') {
      setTimeout(() => this.startCamera(), 300);
    }
  }



  switchMode(m: 'camera' | 'upload' | 'manual'): void {
    this.stopCamera();
    this.mode = m;
    this.errorMsg = '';
    this.successMsg = '';
    this.scanResult = '';
    if (m === 'camera') {
      setTimeout(() => this.startCamera(), 300);
    }
  }

  startCamera(): void {
    try {
      this.scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        false
      );
      this.scanner.render(
        (decodedText: string) => {
          this.ngZone.run(() => this.handleScan(decodedText));
        },
        (err: any) => { /* ignore scan errors during scan */ }
      );
    } catch (e) {
      this.errorMsg = 'Camera access failed. Try upload or manual entry.';
    }
  }

  stopCamera(): void {
    if (this.scanner) {
      try { this.scanner.clear(); } catch (_) {}
      this.scanner = null;
    }
  }

  handleScan(decodedText: string): void {
    this.stopCamera();
    let patientId = decodedText;
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.patientId) patientId = parsed.patientId;
    } catch (_) {}
    this.scanResult = patientId;
    this.fetchPatient(patientId);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.loading = true;
    this.errorMsg = '';
    
    try {
      const html5QrCode = new Html5Qrcode('file-reader-div');
      html5QrCode.scanFile(file, true)
        .then((decodedText: string) => {
          this.ngZone.run(() => {
            this.loading = false;
            this.handleScan(decodedText);
          });
        })
        .catch(() => {
          this.ngZone.run(() => {
            this.loading = false;
            this.errorMsg = 'Could not read QR code from image. Try a clearer photo.';
          });
        });
    } catch (err) {
      this.loading = false;
      this.errorMsg = 'Failed to initialize QR scanner. Please try again.';
      console.error('QR Scanner init error:', err);
    }
  }

  fetchPatient(patientId: string): void {
    this.loading = true;
    this.errorMsg = '';
    this.patientService.getPatient(patientId).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/patient', patientId]);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 404) {
          this.errorMsg = `No patient found with ID: ${patientId}`;
        } else {
          this.errorMsg = 'Failed to fetch patient. Check your connection.';
        }
      }
    });
  }

  submitManual(): void {
    if (!this.manualId.trim()) return;
    this.fetchPatient(this.manualId.trim().toUpperCase());
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
