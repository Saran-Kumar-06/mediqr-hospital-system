import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RegisterComponent } from './components/register/register.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { PatientDetailComponent } from './components/patient-detail/patient-detail.component';
import { VitalsEntryComponent } from './components/vitals-entry/vitals-entry.component';
import { VisitHistoryComponent } from './components/visit-history/visit-history.component';
import { AuthComponent } from './components/auth/auth.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: AuthComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [AuthGuard] },
  { path: 'scan', component: ScannerComponent, canActivate: [AuthGuard] },
  { path: 'patient/:id', component: PatientDetailComponent, canActivate: [AuthGuard] },
  { path: 'patient/:id/vitals', component: VitalsEntryComponent, canActivate: [AuthGuard] },
  { path: 'patient/:id/history', component: VisitHistoryComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
