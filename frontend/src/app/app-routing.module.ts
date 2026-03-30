import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RegisterComponent } from './components/register/register.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { PatientDetailComponent } from './components/patient-detail/patient-detail.component';
import { VitalsEntryComponent } from './components/vitals-entry/vitals-entry.component';
import { VisitHistoryComponent } from './components/visit-history/visit-history.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'scan', component: ScannerComponent },
  { path: 'patient/:id', component: PatientDetailComponent },
  { path: 'patient/:id/vitals', component: VitalsEntryComponent },
  { path: 'patient/:id/history', component: VisitHistoryComponent },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
