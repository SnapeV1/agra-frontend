import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthUser } from 'src/app/core/models/auth-user.model';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isLoggedIn = false;
  activeSection = 'overview';
  isDropdownOpen = false;
  isMobileMenuOpen = false;
  user: AuthUser | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subscribeToAuthState();
    this.checkTokenExpiration();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    const mobileToggle = target.closest('.mobile-toggle');
    const mobileMenu = target.closest('.nav-menu');
    
    if (!dropdown && this.isDropdownOpen) {
      this.closeDropdown();
    }
    
    if (!mobileToggle && !mobileMenu && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  private subscribeToAuthState(): void {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isLoggedIn = isAuthenticated;
        if (!isAuthenticated) this.user = null;
      });

    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.user = user;
      });

    this.isLoggedIn = this.authService.isAuthenticated();
    this.user = this.authService.currentUserValue;
  }

  private checkTokenExpiration(): void {
    if (this.authService.isTokenExpiringSoon()) {
      console.warn('Token is expiring soon');
    }
  }

  getUserDisplayName(): string {
    if (this.user?.user?.name) {
      return this.user.user.name;
    }
    const email = this.getUserEmail();
    return email ? email.split('@')[0] : 'User';
  }

  getUserEmail(): string {
    return this.user?.user?.email || this.authService.getUserEmail() || '';
  }

  getUserRole(): string {
    return this.user?.user?.role || this.authService.getUserRole() || '';
  }

  getUserAvatar(): string {
    return this.user?.user?.picture || 'assets/default-avatar.png';
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  isUser(): boolean {
    return this.getUserRole() === 'USER';
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  navigateToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/user/profile']);
  }

  navigateToSettings(): void {
    this.closeDropdown();
    this.router.navigate(['/user/settings']);
  }

  navigateToDashboard(): void {
    this.closeDropdown();
    if (this.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/user/dashboard']);
    }
  }

  // New method for admin view navigation
  navigateToAdminView(): void {
    this.router.navigate(['/admin']);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  signOut(): void {
    this.closeDropdown();
    this.authService.logout('/login');
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
    
    // Close mobile menu after navigation
    this.closeMobileMenu();
  }

  onNavLinkClick(): void {
    // Close mobile menu when any navigation link is clicked
    this.closeMobileMenu();
  }

  isSectionActive(sectionId: string): boolean {
    return this.activeSection === sectionId;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    const mobileMenu = document.querySelector('.nav-menu');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const body = document.body;
    
    if (mobileMenu && mobileToggle) {
      mobileMenu.classList.toggle('mobile-active', this.isMobileMenuOpen);
      mobileToggle.classList.toggle('active', this.isMobileMenuOpen);
    }
    
    // Prevent body scroll when mobile menu is open
    if (this.isMobileMenuOpen) {
      body.classList.add('mobile-menu-open');
    } else {
      body.classList.remove('mobile-menu-open');
    }
    
    // Close dropdown if open
    if (this.isMobileMenuOpen && this.isDropdownOpen) {
      this.closeDropdown();
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    const mobileMenu = document.querySelector('.nav-menu');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const body = document.body;
    
    if (mobileMenu && mobileToggle) {
      mobileMenu.classList.remove('mobile-active');
      mobileToggle.classList.remove('active');
    }
    
    // Remove body scroll prevention
    body.classList.remove('mobile-menu-open');
  }
}