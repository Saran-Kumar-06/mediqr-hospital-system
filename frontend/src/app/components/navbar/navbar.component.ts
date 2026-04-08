import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  mobileMenuOpen = false;
  scrolled = false;

  constructor(public router: Router, public authService: AuthService) {}

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = window.scrollY > 10;
  }

  toggleMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMenu()  { this.mobileMenuOpen = false; }

  isActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
