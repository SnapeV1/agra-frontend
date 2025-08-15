import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthUser } from 'src/app/features/auth/models/auth-user.model';
import { AuthService } from 'src/app/services/auth/auth.service';

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
    if (!dropdown && this.isDropdownOpen) {
      this.closeDropdown();
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

    // Initialize immediately
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
    return 'assets/default-avatar.png';
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
