import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  isScrolled = false;
  isLoggedIn: boolean = false;
  activeSection = 'overview';
  isDropdownOpen = false;
  user: User | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    if (this.isLoggedIn) {
      this.loadUserData();
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 20;
    this.updateActiveSection();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.user-menu');
    
    if (!dropdown && this.isDropdownOpen) {
      this.closeDropdown();
    }
  }

  checkAuthStatus(): void {
    const token = localStorage.getItem('jwt') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('access_token');
    this.isLoggedIn = !!token;
  }

  loadUserData(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.user = {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          picture: 'assets/default-avatar.png'
        };
      }
    } else {
      this.user = {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        picture: 'assets/default-avatar.png'
      };
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  navigateToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.closeDropdown();
    this.router.navigate(['/settings']);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  signOut(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    this.isLoggedIn = false;
    this.user = null;
    this.closeDropdown();
    
    this.router.navigate(['/login']);
  }

  private updateActiveSection(): void {
    const sections = ['overview', 'features', 'technical', 'pricing', 'timeline'];
    const scrollPosition = window.pageYOffset + 100;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetHeight = element.offsetHeight;

        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          this.activeSection = section;
          break;
        }
      }
    }
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -70;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  }

  isSectionActive(sectionId: string): boolean {
    return this.activeSection === sectionId;
  }

  toggleMobileMenu(): void {
    const mobileMenu = document.querySelector('.nav-menu');
    if (mobileMenu) {
      mobileMenu.classList.toggle('mobile-active');
    }
  }
}