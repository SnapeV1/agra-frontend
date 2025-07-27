import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  isScrolled = false;
  isLoggedIn: boolean = false;
  activeSection = 'overview';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkAuthStatus();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 20;
    this.updateActiveSection();
  }

  /**
   * Check if user is authenticated by checking JWT token
   */
  checkAuthStatus(): void {
    const token = localStorage.getItem('jwt') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('access_token');
    this.isLoggedIn = !!token;
  }

  /**
   * Handle user login - navigate to login page
   */
  login(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Handle user sign out
   */
  signOut(): void {
    // Remove all possible JWT token keys
    localStorage.removeItem('jwt');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Update authentication status
    this.isLoggedIn = false;
    
 
    
    
    this.router.navigate(['/login']);
  }

  /**
   * Refresh authentication status (useful for token changes)
   */
  refreshAuthStatus(): void {
    this.checkAuthStatus();
  }

  /**
   * Update active navigation section based on scroll position
   */
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

  /**
   * Smooth scroll to section
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -70; // Account for fixed navbar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Check if section is active
   */
  isSectionActive(sectionId: string): boolean {
    return this.activeSection === sectionId;
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu(): void {
    const mobileMenu = document.querySelector('.nav-menu');
    if (mobileMenu) {
      mobileMenu.classList.toggle('mobile-active');
    }
    console.log('Mobile menu toggled');
  }




  onContactClick(): void {
    console.log('Contact button clicked from navigation');
    window.location.href = 'mailto:contact@agra-platform.com?subject=Projet AGRA - Demande d\'information';
  }
}