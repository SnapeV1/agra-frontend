import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  animations: [
    trigger('slideInUp', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate(600)
      ])
    ]),
    trigger('staggerAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger(100, [
            animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeInScale', [
      transition('void => *', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('navbar', { static: true }) navbar!: ElementRef;

  // Authentication state
  isLoggedIn: boolean = false;

  // Component state
  isScrolled = false;
  activeSection = 'overview';
  isLoading = false;
  currentYear = new Date().getFullYear();
  newsletterEmail = '';

  // Animation states
  heroAnimationState = 'in';
  featuresAnimationState = 'in';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.initializeAnimations();
    this.setupScrollObserver();
    this.preloadResources();
  }

  ngOnDestroy(): void {
    // Cleanup any subscriptions or observers
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
    this.trackInteraction('login_button_click', 'authentication');
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
    
    // Track sign out event
    this.trackInteraction('signout_button_click', 'authentication');
    
    // Optional: Show confirmation message
    console.log('User signed out successfully');
    
    // Optional: Redirect to login page or refresh
    // this.router.navigate(['/login']);
  }

  /**
   * Refresh authentication status (useful for token changes)
   */
  refreshAuthStatus(): void {
    this.checkAuthStatus();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollPosition > 50;
    this.updateActiveSection();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    this.handleResponsiveLayout();
  }

  /**
   * Initialize component animations
   */
  private initializeAnimations(): void {
    // Trigger entrance animations
    setTimeout(() => {
      this.heroAnimationState = 'in';
    }, 100);

    setTimeout(() => {
      this.featuresAnimationState = 'in';
    }, 300);
  }

  /**
   * Setup intersection observer for scroll animations
   */
  private setupScrollObserver(): void {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-up');
        }
      });
    }, options);

    // Observe all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => observer.observe(section));
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
   * Handle CTA button click
   */
  onContactClick(): void {
    console.log('Contact button clicked');
    window.location.href = 'mailto:contact@agra-platform.com?subject=Projet AGRA - Demande d\'information';
  }

  /**
   * Handle feature card hover effects
   */
  onFeatureHover(index: number, isEntering: boolean): void {
    const card = document.querySelector(`.feature-card:nth-child(${index + 1})`);
    if (card) {
      if (isEntering) {
        card.classList.add('hovered');
      } else {
        card.classList.remove('hovered');
      }
    }
  }

  /**
   * Handle pricing card selection
   */
  onPricingCardClick(cardIndex: number): void {
    console.log(`Pricing card ${cardIndex} selected`);
    this.trackInteraction('pricing_card_click', 'engagement', `card-${cardIndex}`);
  }

  /**
   * Get formatted number for animations
   */
  getAnimatedNumber(value: string): string {
    const numericValue = value.replace(/[^\d]/g, '');
    return numericValue;
  }

  /**
   * Handle responsive layout changes
   */
  private handleResponsiveLayout(): void {
    const width = window.innerWidth;
    
    if (width < 768) {
      this.adjustMobileLayout();
    } else if (width < 1024) {
      this.adjustTabletLayout();
    } else {
      this.adjustDesktopLayout();
    }
  }

  private adjustMobileLayout(): void {
    console.log('Adjusting for mobile layout');
  }

  private adjustTabletLayout(): void {
    console.log('Adjusting for tablet layout');
  }

  private adjustDesktopLayout(): void {
    console.log('Adjusting for desktop layout');
  }

  /**
   * Preload critical resources
   */
  private preloadResources(): void {
    this.isLoading = true;
    
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Track user interactions for analytics
   */
  trackInteraction(action: string, category: string, label?: string): void {
    console.log('Analytics:', { action, category, label });
  }

  /**
   * Handle timeline item click
   */
  onTimelineItemClick(item: any): void {
    console.log('Timeline item clicked:', item);
    this.trackInteraction('timeline_item_click', 'engagement', item.title);
  }

  /**
   * Get CSS classes for timeline items
   */
  getTimelineItemClasses(index: number): string {
    const baseClasses = 'timeline-item';
    const positionClass = index % 2 === 0 ? 'timeline-left' : 'timeline-right';
    return `${baseClasses} ${positionClass}`;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: string, currency: string): string {
    return `${currency}${amount}`;
  }

  /**
   * Check if section is active
   */
  isSectionActive(sectionId: string): boolean {
    return this.activeSection === sectionId;
  }

  /**
   * Get progress percentage for timeline
   */
  getTimelineProgress(): number {
    const currentMonth = new Date().getMonth() + 1;
    const projectStartMonth = 1;
    const totalMonths = 12;
    
    const progressMonths = Math.min(currentMonth - projectStartMonth + 1, totalMonths);
    return Math.max(0, (progressMonths / totalMonths) * 100);
  }

  /**
   * Handle scroll to top
   */
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Toggle mobile menu (if implemented)
   */
  toggleMobileMenu(): void {
    console.log('Mobile menu toggled');
  }

  /**
   * Handle external link clicks
   */
  onExternalLinkClick(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
    this.trackInteraction('external_link_click', 'navigation', url);
  }

  /**
   * Handle newsletter subscription
   */
  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
    
    if (this.newsletterEmail && this.isValidEmail(this.newsletterEmail)) {
      console.log('Newsletter subscription:', this.newsletterEmail);
      alert('Merci pour votre inscription à notre newsletter !');
      this.trackInteraction('newsletter_subscribe', 'engagement', this.newsletterEmail);
      this.newsletterEmail = '';
    } else {
      alert('Veuillez entrer une adresse email valide.');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle social media link clicks
   */
  onSocialClick(platform: string): void {
    const socialUrls = {
      facebook: 'https://facebook.com/agraplatform',
      twitter: 'https://twitter.com/agraplatform',
      linkedin: 'https://linkedin.com/company/agraplatform',
      youtube: 'https://youtube.com/@agraplatform',
      instagram: 'https://instagram.com/agraplatform'
    };

    const url = socialUrls[platform as keyof typeof socialUrls];
    if (url) {
      this.onExternalLinkClick(url);
      this.trackInteraction('social_click', 'engagement', platform);
    }
  }

  
}