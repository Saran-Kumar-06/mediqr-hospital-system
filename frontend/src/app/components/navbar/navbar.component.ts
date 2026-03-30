import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  mobileMenuOpen = false;
  scrolled = false;

  constructor(public router: Router) {}

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = window.scrollY > 10;
  }

  toggleMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMenu()  { this.mobileMenuOpen = false; }

  isActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }
}
