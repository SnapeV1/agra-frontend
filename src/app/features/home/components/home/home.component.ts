import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';

interface Stat {
  number: string;
  label: string;
  description?: string;
}

interface OverviewCard {
  icon: string;
  title: string;
  description: string;
}

interface Feature {
  icon: string;
  title: string;
  items: string[];
}

interface TechLayer {
  title: string;
  technologies: string[];
}

interface PricingCard {
  title: string;
  price: string;
  currency: string;
  period: string;
  features: string[];
  featured?: boolean;
}

interface CostBreakdown {
  name: string;
  cost: string;
  percentage: string;
}

interface TimelineItem {
  phase: number;
  title: string;
  duration: string;
  description: string;
  deliverables: string;
}

interface PerformanceMetric {
  value: string;
  label: string;
}

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

  // Component data
  heroStats: Stat[] = [
    { number: '30M+', label: 'Utilisateurs', description: 'Jeunes agriculteurs ciblés' },
    { number: '5+', label: 'Pays', description: 'Afrique du Nord' },
    { number: '2025', label: 'Lancement', description: 'Fin d\'année' }
  ];

  overviewCards: OverviewCard[] = [
    {
      icon: '🎯',
      title: 'Objectif',
      description: 'Former et connecter 30+ millions de jeunes agriculteurs à travers l\'Afrique du Nord via une plateforme d\'apprentissage innovante et accessible.'
    },
    {
      icon: '🌍',
      title: 'Portée',
      description: 'Couverture complète des pays d\'Afrique du Nord avec support multilingue et adaptation aux contextes locaux spécifiques.'
    },
    {
      icon: '⚡',
      title: 'Innovation',
      description: 'Technologies de pointe, IA pour personnalisation, réalité augmentée pour démonstrations pratiques agricoles.'
    }
  ];

  features: Feature[] = [
    {
      icon: '👥',
      title: 'Gestion des Utilisateurs',
      items: [
        'Enregistrement simplifié pour 30M+ utilisateurs',
        'Profils détaillés par domaine et filière',
        'Système de rôles et permissions',
        'Tableau de bord personnalisé'
      ]
    },
    {
      icon: '🎓',
      title: 'Formation en Ligne',
      items: [
        '5+ sessions annuelles personnalisables',
        'Streaming vidéo haute qualité',
        'Contenu interactif et gamifié',
        'Évaluations et certifications'
      ]
    },
    {
      icon: '💬',
      title: 'Interaction & Collaboration',
      items: [
        'Chat en temps réel formateurs-apprenants',
        'Forums de discussion thématiques',
        'Système de mentorat',
        'Partage d\'expériences pratiques'
      ]
    },
    {
      icon: '📊',
      title: 'Base de Données',
      items: [
        'Classification par pays et régions',
        'Segmentation par domaines agricoles',
        'Suivi des filières spécialisées',
        'Analytics et rapports détaillés'
      ]
    },
    {
      icon: '📚',
      title: 'Ressources Pédagogiques',
      items: [
        'Bibliothèque de kits de formation',
        'Guides pratiques téléchargeables',
        'Vidéos démonstration techniques',
        'Mise à jour continue du contenu'
      ]
    },
    {
      icon: '📱',
      title: 'Accessibilité Mobile',
      items: [
        'Application mobile native',
        'Mode hors-ligne intelligent',
        'Interface responsive adaptative',
        'Optimisation bande passante faible'
      ]
    }
  ];

  techLayers: TechLayer[] = [
    {
      title: 'Frontend',
      technologies: ['Angular 17+', 'TypeScript', 'Material Design', 'PWA']
    },
    {
      title: 'Backend',
      technologies: ['Node.js', 'Express.js', 'Microservices', 'GraphQL']
    },
    {
      title: 'Base de Données',
      technologies: ['MongoDB Atlas', 'Redis Cache', 'Elasticsearch', 'PostgreSQL']
    },
    {
      title: 'Infrastructure',
      technologies: ['AWS/Azure', 'Docker', 'Kubernetes', 'CDN Global']
    }
  ];

  performanceMetrics: PerformanceMetric[] = [
    { value: '99.9%', label: 'Disponibilité' },
    { value: '< 2s', label: 'Temps de Chargement' },
    { value: '30M+', label: 'Utilisateurs Simultanés' },
    { value: '24/7', label: 'Support Technique' }
  ];

  pricingCards: PricingCard[] = [
    {
      title: 'Phase de Développement',
      price: '850,000',
      currency: '€',
      period: 'Paiement échelonné sur 12 mois',
      featured: true,
      features: [
        '✓ Conception et développement complet',
        '✓ Architecture cloud scalable',
        '✓ Applications mobile natives',
        '✓ Tests et validation utilisateur',
        '✓ Formation équipe technique',
        '✓ Documentation complète',
        '✓ Garantie 6 mois post-livraison'
      ]
    },
    {
      title: 'Maintenance & Support',
      price: '180,000',
      currency: '€',
      period: 'Par année',
      features: [
        '✓ Support technique 24/7',
        '✓ Mises à jour automatiques',
        '✓ Monitoring et sécurité',
        '✓ Évolutions fonctionnelles',
        '✓ Formation continue staff',
        '✓ Rapports de performance',
        '✓ Sauvegarde et récupération'
      ]
    }
  ];

  costBreakdown: CostBreakdown[] = [
    { name: 'Conception & UX/UI', cost: '€85,000', percentage: '10%' },
    { name: 'Développement Backend', cost: '€340,000', percentage: '40%' },
    { name: 'Développement Frontend', cost: '€255,000', percentage: '30%' },
    { name: 'Infrastructure & DevOps', cost: '€85,000', percentage: '10%' },
    { name: 'Tests & Déploiement', cost: '€85,000', percentage: '10%' }
  ];

  timelineItems: TimelineItem[] = [
    {
      phase: 1,
      title: 'Analyse & Conception',
      duration: 'Mois 1-2',
      description: 'Analyse détaillée des besoins, conception UX/UI, architecture technique, validation avec AGRA et définition de la charte graphique.',
      deliverables: 'Spécifications, Maquettes, Architecture'
    },
    {
      phase: 2,
      title: 'Développement Core',
      duration: 'Mois 3-6',
      description: 'Développement des fonctionnalités principales : authentification, gestion utilisateurs, base de données, API backend.',
      deliverables: 'MVP, API Backend, Base de données'
    },
    {
      phase: 3,
      title: 'Fonctionnalités Avancées',
      duration: 'Mois 7-9',
      description: 'Système de formation, streaming vidéo, interactions, publication contenu, certifications, applications mobiles.',
      deliverables: 'Plateforme complète, Apps mobiles'
    },
    {
      phase: 4,
      title: 'Tests & Optimisation',
      duration: 'Mois 10-11',
      description: 'Tests de charge, optimisation performance, tests utilisateurs pilotes, sécurité, corrections et ajustements.',
      deliverables: 'Version finalisée, Rapports de tests'
    },
    {
      phase: 5,
      title: 'Déploiement & Formation',
      duration: 'Mois 12',
      description: 'Déploiement production, formation équipe technique, documentation, migration données, lancement officiel.',
      deliverables: 'Plateforme en production, Formation'
    }
  ];

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
    this.initializeAnimations();
    this.setupScrollObserver();
    this.preloadResources();
  }

  ngOnDestroy(): void {
    // Cleanup any subscriptions or observers
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
    // Add contact logic here - could open modal, navigate to contact page, etc.
    console.log('Contact button clicked');
    
    // Example: Show contact modal or navigate
    // this.router.navigate(['/contact']);
    
    // Or trigger email
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
    console.log(`Pricing card ${cardIndex} selected:`, this.pricingCards[cardIndex]);
    // Add pricing card selection logic
  }

  /**
   * Get formatted number for animations
   */
  getAnimatedNumber(value: string): string {
    // Remove non-numeric characters for animation purposes
    const numericValue = value.replace(/[^\d]/g, '');
    return numericValue;
  }

  /**
   * Handle responsive layout changes
   */
  private handleResponsiveLayout(): void {
    const width = window.innerWidth;
    
    if (width < 768) {
      // Mobile layout adjustments
      this.adjustMobileLayout();
    } else if (width < 1024) {
      // Tablet layout adjustments
      this.adjustTabletLayout();
    } else {
      // Desktop layout adjustments
      this.adjustDesktopLayout();
    }
  }

  private adjustMobileLayout(): void {
    // Mobile-specific adjustments
    console.log('Adjusting for mobile layout');
  }

  private adjustTabletLayout(): void {
    // Tablet-specific adjustments
    console.log('Adjusting for tablet layout');
  }

  private adjustDesktopLayout(): void {
    // Desktop-specific adjustments
    console.log('Adjusting for desktop layout');
  }

  /**
   * Preload critical resources
   */
  private preloadResources(): void {
    this.isLoading = true;
    
    // Simulate resource loading
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Track user interactions for analytics
   */
  trackInteraction(action: string, category: string, label?: string): void {
    // Add analytics tracking here
    console.log('Analytics:', { action, category, label });
    
    // Example: Google Analytics 4
    // gtag('event', action, {
    //   event_category: category,
    //   event_label: label
    // });
  }

  /**
   * Handle timeline item click
   */
  onTimelineItemClick(item: TimelineItem): void {
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
    // Calculate progress based on current date or project status
    const currentMonth = new Date().getMonth() + 1;
    const projectStartMonth = 1; // January
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
    // Add mobile menu toggle logic
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
      // Simulate newsletter subscription
      console.log('Newsletter subscription:', this.newsletterEmail);
      
      // Show success message (you can implement a toast/notification service)
      alert('Merci pour votre inscription à notre newsletter !');
      
      // Track the subscription
      this.trackInteraction('newsletter_subscribe', 'engagement', this.newsletterEmail);
      
      // Reset form
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

  /**
   * Handle footer link navigation
   */
  onFooterLinkClick(linkType: string, linkName: string): void {
    console.log(`Footer link clicked: ${linkType} - ${linkName}`);
    this.trackInteraction('footer_link_click', 'navigation', `${linkType}-${linkName}`);
    
    // Handle different types of footer links
    switch (linkType) {
      case 'platform':
        // Navigate to platform sections
        this.scrollToSection(linkName);
        break;
      case 'legal':
        // Navigate to legal pages
        this.router.navigate([`/${linkName}`]);
        break;
      case 'resource':
        // Navigate to resource pages
        this.router.navigate([`/${linkName}`]);
        break;
      default:
        console.log('Unknown link type:', linkType);
    }
  }
}