import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TitleCasePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RegisterComponent } from './components/register/register.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { PatientDetailComponent } from './components/patient-detail/patient-detail.component';
import { VitalsEntryComponent } from './components/vitals-entry/vitals-entry.component';
import { VisitHistoryComponent } from './components/visit-history/visit-history.component';
import { PrescriptionComponent } from './components/prescription/prescription.component';
import { MedicalReportsComponent } from './components/medical-reports/medical-reports.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    DashboardComponent,
    RegisterComponent,
    ScannerComponent,
    PatientDetailComponent,
    VitalsEntryComponent,
    VisitHistoryComponent,
    PrescriptionComponent,
    MedicalReportsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [TitleCasePipe],
  bootstrap: [AppComponent]
})
export class AppModule {}
