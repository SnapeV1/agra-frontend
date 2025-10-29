import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';
import { User } from 'src/app/core/models/user.model';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.css']
})
export class CompleteProfileComponent implements OnInit {
  phone = '';
  selectedCountryCode = '+1';
  address = '';
  language = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  error: string | null = null;
  success = false;
  missingFields: string[] = [];
  triggerReasons: string[] = [];
  isCountryDropdownOpen = false;
  searchTerm = '';
  searchTimeout: any;
  highlightedCountry: any = null;

  // Minimal subset; extend as needed or share with Register
  countryCodes = [
    { code: '+1', country: 'US', name: 'United States' },
    { code: '+1', country: 'CA', name: 'Canada' },
    { code: '+44', country: 'GB', name: 'United Kingdom' },
    { code: '+33', country: 'FR', name: 'France' },
    { code: '+49', country: 'DE', name: 'Germany' },
    { code: '+34', country: 'ES', name: 'Spain' },
    { code: '+39', country: 'IT', name: 'Italy' },
    { code: '+213', country: 'DZ', name: 'Algeria' },
    { code: '+212', country: 'MA', name: 'Morocco' },
    { code: '+216', country: 'TN', name: 'Tunisia' },
    { code: '+20', country: 'EG', name: 'Egypt' },
    { code: '+966', country: 'SA', name: 'Saudi Arabia' }
  ];

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const current: User | undefined = this.authService.currentUserValue?.user;
    if (current) {
      this.phone = current.phone || '';
      // @ts-ignore — backend may accept address though not in User model
      this.address = (current as any).address || '';
      this.language = current.language || '';
      // Compute and log reasons this screen was triggered
      if (!current.phone) this.triggerReasons.push('phone');
      if (!current.role) this.triggerReasons.push('role');
      try {
        console.log('[CompleteProfile] Current user profile', current);
        console.log('[CompleteProfile] Missing (trigger reasons)', this.triggerReasons);
      } catch {}
    }
    this.updateMissingUI();
    // Sort countries alphabetically by name for easier scan
    try {
      this.countryCodes.sort((a, b) => a.name.localeCompare(b.name));
    } catch {}
  }

  passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  submit() {
    if (this.isLoading) return;
    this.error = null;
    if (this.password && (!this.passwordsMatch() || this.password.length < 8)) {
      this.error = 'Passwords must match and be at least 8 characters.';
      return;
    }

    this.isLoading = true;
    const userData: any = { phone: `${this.selectedCountryCode} ${this.phone}`.trim(), language: this.language };
    if (this.address) userData.address = this.address;

    // If a password is provided, include it in the standard profile update payload
    if (this.password) {
      userData.password = this.password;
    }

    this.profileService.updateUserProfile(userData).subscribe({
      next: () => this.finish(),
      error: (err) => this.fail(err)
    });
  }

  onFieldChange() {
    this.updateMissingUI();
  }

  isMissing(field: 'phone' | 'address' | 'language'): boolean {
    return this.missingFields.includes(field);
  }

  private updateMissingUI() {
    const fields: string[] = [];
    if (!this.phone || !this.phone.trim()) fields.push('phone');
    if (!this.address || !this.address.trim()) fields.push('address');
    if (!this.language || !this.language.trim()) fields.push('language');
    this.missingFields = fields;
  }

  toggleCountryDropdown() {
    this.isCountryDropdownOpen = !this.isCountryDropdownOpen;
    if (!this.isCountryDropdownOpen) {
      this.highlightedCountry = null;
      this.searchTerm = '';
    } else {
      setTimeout(() => {
        try {
          const el = document.querySelector('.custom-select') as HTMLElement | null;
          el?.focus();
        } catch {}
      }, 0);
    }
  }

  selectCountry(country: any) {
    this.selectedCountryCode = country.code;
    this.isCountryDropdownOpen = false;
  }

  getSelectedCountry() {
    return this.countryCodes.find(c => c.code === this.selectedCountryCode) || { country: 'US', code: '+1', name: 'United States' };
  }

  onDropdownKeydown(event: KeyboardEvent) {
    if (!this.isCountryDropdownOpen) return;
    const key = (event.key || '').toLowerCase();
    if (key === 'escape') { this.isCountryDropdownOpen = false; return; }
    if (key === 'arrowdown' || key === 'arrowup') {
      event.preventDefault();
      const list = this.countryCodes;
      if (!list || list.length === 0) return;
      const currentCode = (this.highlightedCountry?.code) || this.selectedCountryCode || list[0].code;
      let idx = list.findIndex(c => c.code === currentCode && (!this.highlightedCountry || c.name === this.highlightedCountry.name));
      if (idx < 0) idx = 0;
      if (key === 'arrowdown') { if (idx === list.length - 1) return; idx = idx + 1; }
      if (key === 'arrowup') { if (idx === 0) return; idx = idx - 1; }
      this.highlightedCountry = list[idx];
      this.scrollToHighlightedCountry();
      return;
    }
    if (key === 'enter') {
      event.preventDefault();
      const toSelect = this.highlightedCountry ||
        this.countryCodes.find(c => c.code === this.selectedCountryCode) ||
        this.countryCodes[0];
      if (toSelect) this.selectCountry(toSelect);
      return;
    }
    if (key.length === 1 && /[a-z]/.test(key)) {
      event.preventDefault();
      this.searchTerm += key;
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      const match = this.countryCodes.find(c => c.name.toLowerCase().startsWith(this.searchTerm));
      if (match) {
        this.highlightedCountry = match;
        this.scrollToHighlightedCountry();
      }
      this.searchTimeout = setTimeout(() => { this.searchTerm = ''; }, 1000);
    }
  }

  private scrollToHighlightedCountry() {
    if (!this.highlightedCountry) return;
    setTimeout(() => {
      const container = document.querySelector('.select-options') as HTMLElement | null;
      if (!container) return;
      const items = Array.from(container.querySelectorAll('.country-option')) as HTMLElement[];
      const idx = this.countryCodes.findIndex(
        c => c.code === this.highlightedCountry.code && c.name === this.highlightedCountry.name
      );
      if (idx >= 0 && idx < items.length) {
        items[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  }

  onPhoneKeydown(event: KeyboardEvent) {
    const e: any = event as any;
    if ([8,9,27,13,46].includes(e.keyCode) ||
        (e.keyCode === 65 && e.ctrlKey) ||
        (e.keyCode === 67 && e.ctrlKey) ||
        (e.keyCode === 86 && e.ctrlKey) ||
        (e.keyCode === 88 && e.ctrlKey) ||
        (e.keyCode >= 35 && e.keyCode <= 39)) { return; }
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      event.preventDefault();
    }
  }

  onPhoneInput(event: any) {
    let value = event.target.value as string;
    value = value.replace(/\D/g, '');
    if (value.length >= 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1-$2-$3');
    } else if (value.length >= 3) {
      value = value.replace(/(\d{3})(\d{0,3})/, '$1-$2');
    }
    this.phone = value;
    event.target.value = value;
  }

  private finish() {
    this.authService.getCurrentUserFromBackend().subscribe({
      next: () => {
        this.isLoading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/home']), 600);
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/home']);
      }
    });
  }

  private fail(err: any) {
    this.isLoading = false;
    this.error = err?.error?.message || 'Could not update profile. Please try again.';
  }
}

