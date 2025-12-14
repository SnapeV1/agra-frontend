import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  token: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  infoMessage: string | null = null;
  showPassword = false;
  showConfirm = false;
  success = false;

  // Password requirement flags
  reqLength = false;
  reqUppercase = false;
  reqLowercase = false;
  reqNumber = false;

  // Multi-step reset state (email or phone)
  step: 'method' | 'code' | 'reset' | 'success' = 'method';
  method: 'email' | 'phone' | null = null;
  emailInput = '';
  codeInput = '';
  codeSending = false;
  codeSentTo = '';
  codeVerified = false;
  resetLoading = false;
  statusMessage: string | null = null;
  verificationToken: string | null = null;
  resendCooldown = 0;
  private resendTimer: any = null;
  // Phone input (matches signup)
  phoneInput = '';
  selectedCountryCode = '+1';
  isCountryDropdownOpen = false;
  highlightedCountry: any = null;
  searchTerm = '';
  searchTimeout: any;
  countryCodes = [
    { code: '+355', country: 'AL', name: 'Albania' },
    { code: '+213', country: 'DZ', name: 'Algeria' },
    { code: '+376', country: 'AD', name: 'Andorra' },
    { code: '+54', country: 'AR', name: 'Argentina' },
    { code: '+374', country: 'AM', name: 'Armenia' },
    { code: '+61', country: 'AU', name: 'Australia' },
    { code: '+43', country: 'AT', name: 'Austria' },
    { code: '+994', country: 'AZ', name: 'Azerbaijan' },
    { code: '+375', country: 'BY', name: 'Belarus' },
    { code: '+32', country: 'BE', name: 'Belgium' },
    { code: '+591', country: 'BO', name: 'Bolivia' },
    { code: '+387', country: 'BA', name: 'Bosnia and Herzegovina' },
    { code: '+267', country: 'BW', name: 'Botswana' },
    { code: '+55', country: 'BR', name: 'Brazil' },
    { code: '+359', country: 'BG', name: 'Bulgaria' },
    { code: '+257', country: 'BI', name: 'Burundi' },
    { code: '+1', country: 'CA', name: 'Canada' },
    { code: '+56', country: 'CL', name: 'Chile' },
    { code: '+86', country: 'CN', name: 'China' },
    { code: '+57', country: 'CO', name: 'Colombia' },
    { code: '+385', country: 'HR', name: 'Croatia' },
    { code: '+357', country: 'CY', name: 'Cyprus' },
    { code: '+420', country: 'CZ', name: 'Czech Republic' },
    { code: '+45', country: 'DK', name: 'Denmark' },
    { code: '+593', country: 'EC', name: 'Ecuador' },
    { code: '+20', country: 'EG', name: 'Egypt' },
    { code: '+372', country: 'EE', name: 'Estonia' },
    { code: '+268', country: 'SZ', name: 'Eswatini' },
    { code: '+251', country: 'ET', name: 'Ethiopia' },
    { code: '+358', country: 'FI', name: 'Finland' },
    { code: '+33', country: 'FR', name: 'France' },
    { code: '+995', country: 'GE', name: 'Georgia' },
    { code: '+49', country: 'DE', name: 'Germany' },
    { code: '+30', country: 'GR', name: 'Greece' },
    { code: '+91', country: 'IN', name: 'India' },
    { code: '+353', country: 'IE', name: 'Ireland' },
    { code: '+39', country: 'IT', name: 'Italy' },
    { code: '+81', country: 'JP', name: 'Japan' },
    { code: '+212', country: 'MA', name: 'Morocco' },
    { code: '+234', country: 'NG', name: 'Nigeria' },
    { code: '+1', country: 'US', name: 'United States' },
    { code: '+44', country: 'GB', name: 'United Kingdom' },
    { code: '+216', country: 'TN', name: 'Tunisia' },
    { code: '+971', country: 'AE', name: 'United Arab Emirates' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]]
    });

    // Support token via query param or path param
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || this.route.snapshot.params['token'] || null;
      if (this.token) {
        this.step = 'reset';
        this.codeVerified = true;
        this.verificationToken = this.token;
        this.statusMessage = null;
      }
      if (params['email']) {
        this.emailInput = params['email'];
        this.method = 'email';
      }
    });

    // Live validation for password requirements and match
    this.form.get('password')?.valueChanges.subscribe((val: string) => this.updateRequirements(val || ''));
    this.form.get('confirm')?.valueChanges.subscribe(() => {
      // trigger UI update for match state
    });
  }

  get f() { return this.form.controls; }

  sendCode(): void {
    if (this.codeSending) return;
    if (this.resendCooldown > 0) {
      this.errorMessage = `Please wait ${this.resendCooldown}s before resending.`;
      return;
    }
    this.errorMessage = null;
    this.statusMessage = null;
    if (!this.method) {
      this.errorMessage = 'Choose email or phone first.';
      return;
    }
    if (this.method === 'email') {
      const email = (this.emailInput || '').trim();
      if (!email) {
        this.errorMessage = 'Enter your email to receive a code.';
        return;
      }
      this.codeSending = true;
      this.authService.requestPasswordReset(email).subscribe({
        next: () => {
          this.codeSending = false;
          this.codeSentTo = email;
          this.statusMessage = 'If an account exists, we emailed you a reset link.';
          this.startCooldown(60);
        },
        error: () => {
          this.codeSending = false;
          this.codeSentTo = email;
          this.statusMessage = 'If an account exists, we emailed you a reset link.';
          this.startCooldown(60);
        }
      });
      return;
    }

    // Phone path: phone number input with country code
    const phone = (this.phoneInput || '').trim();
    if (!phone) {
      this.errorMessage = 'Enter your phone number to receive a code.';
      return;
    }
    this.codeSending = true;
    const fullPhone = `${this.selectedCountryCode} ${phone}`.trim();
    this.authService.requestPasswordResetSms(fullPhone).subscribe({
      next: () => {
        this.codeSending = false;
        this.codeSentTo = fullPhone;
        this.step = 'code';
        this.statusMessage = 'We sent a code to your phone.';
        this.startCooldown(60);
      },
      error: err => {
        this.codeSending = false;
        this.errorMessage = err?.message || 'Failed to send SMS code.';
      }
    });
  }

  verifyCode(): void {
    this.errorMessage = null;
    this.statusMessage = null;
    if (this.method === 'email') {
      this.statusMessage = 'Check your email for the reset link.';
      return;
    }
    if (!(this.codeInput || '').trim()) {
      this.errorMessage = 'Enter the verification code you received.';
      return;
    }
    this.isLoading = true;
    if (this.method === 'phone') {
      const fullPhone = `${this.selectedCountryCode} ${this.phoneInput}`.trim();
      this.authService.verifyPasswordResetSms(fullPhone, this.codeInput.trim()).subscribe({
        next: res => {
          this.isLoading = false;
          this.codeVerified = true;
          this.verificationToken = res?.token || null;
          this.step = 'reset';
          this.statusMessage = 'Code verified. Create your new password.';
          this.stopCooldown();
        },
        error: err => {
          this.isLoading = false;
          this.errorMessage = err?.message || 'Invalid code. Try again.';
        }
      });
      return;
    }

    // Email code fallback (if backend supports code verification returning token)
    this.authService.requestPasswordReset(this.emailInput).subscribe({
      next: () => {
        this.isLoading = false;
        this.codeVerified = true;
        this.verificationToken = this.codeInput.trim();
        this.step = 'reset';
        this.statusMessage = 'Code verified. Create your new password.';
      },
      error: err => {
        this.isLoading = false;
      this.errorMessage = err?.message || 'Invalid code. Try again.';
    }
  });
}

  onSubmit(): void {
    if (this.isLoading || this.resetLoading) return;
    this.errorMessage = null;
    this.infoMessage = null;

    const effectiveToken = this.token || this.verificationToken;
    if (!effectiveToken) {
      this.errorMessage = 'Verify your code before resetting your password.';
      return;
    }
    if (this.form.invalid) {
      this.errorMessage = 'Please provide a valid password (min 8 characters).';
      return;
    }
    const password = this.f['password'].value as string;
    const confirm = this.f['confirm'].value as string;
    if (password !== confirm) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.resetLoading = true;
    this.authService.resetPassword(effectiveToken, password).subscribe({
      next: () => {
        this.resetLoading = false;
        this.infoMessage = 'Your password has been reset successfully.';
        this.success = true;
        this.step = 'success';
      },
      error: (err) => {
        this.resetLoading = false;
        this.errorMessage = err?.message || 'Failed to reset password. Please try again or request a new link.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  get passwordsMatch(): boolean {
    const p = this.f['password'].value as string;
    const c = this.f['confirm'].value as string;
    return !!p && !!c && p === c;
  }

  private updateRequirements(password: string): void {
    this.reqLength = password.length >= 8;
    this.reqUppercase = /[A-Z]/.test(password);
    this.reqLowercase = /[a-z]/.test(password);
    this.reqNumber = /[0-9]/.test(password);
  }

  get stepTitle(): string {
    if (this.success || this.step === 'success') return 'Password reset complete';
    if (this.step === 'reset') return 'Create new password';
    return 'Reset your password';
  }

  get stepDescription(): string {
    if (this.success || this.step === 'success') return 'You can now sign in with your new password.';
    if (this.step === 'reset') return 'Choose a strong password for your account.';
    if (this.step === 'code') return 'Enter the verification code we sent you.';
    return "Choose how you'd like to receive your code.";
  }

  toggleCountryDropdown() {
    this.isCountryDropdownOpen = !this.isCountryDropdownOpen;
    if (!this.isCountryDropdownOpen) {
      this.highlightedCountry = null;
      this.searchTerm = '';
    }
  }

  selectCountry(country: any) {
    this.selectedCountryCode = country.code;
    this.isCountryDropdownOpen = false;
  }

  getSelectedCountry() {
    return this.countryCodes.find(c => c.code === this.selectedCountryCode) || { code: '+1', country: 'US', name: 'United States' };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select')) {
      this.isCountryDropdownOpen = false;
      this.highlightedCountry = null;
      this.searchTerm = '';
    }
  }

  onDropdownKeydown(event: KeyboardEvent) {
    if (!this.isCountryDropdownOpen) return;

    const key = event.key.toLowerCase();
    if (key === 'escape') {
      this.isCountryDropdownOpen = false;
      return;
    }
    if (key === 'enter' && this.highlightedCountry) {
      event.preventDefault();
      this.selectCountry(this.highlightedCountry);
      return;
    }
    if (key.length === 1 && key.match(/[a-z]/)) {
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

  onPhoneKeydown(event: KeyboardEvent) {
    if ([8,9,27,13,46].includes(event.keyCode) ||
      (event.keyCode === 65 && event.ctrlKey) ||
      (event.keyCode === 67 && event.ctrlKey) ||
      (event.keyCode === 86 && event.ctrlKey) ||
      (event.keyCode === 88 && event.ctrlKey) ||
      (event.keyCode >= 35 && event.keyCode <= 39)) {
      return;
    }
    if ((event.shiftKey || event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }

  onPhoneInput(event: any) {
    let value = event.target.value || '';
    value = value.replace(/\D/g, '');
    if (value.length >= 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1-$2-$3');
    } else if (value.length >= 3) {
      value = value.replace(/(\d{3})(\d{0,3})/, '$1-$2');
    }
    this.phoneInput = value;
    event.target.value = value;
  }

  private scrollToHighlightedCountry() {
    if (!this.highlightedCountry) return;
    setTimeout(() => {
      const el = document.querySelector('.country-option.highlighted');
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }

  private startCooldown(seconds: number) {
    this.resendCooldown = seconds;
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown = Math.max(0, this.resendCooldown - 1);
      if (this.resendCooldown === 0 && this.resendTimer) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    }, 1000);
  }

  private stopCooldown() {
    this.resendCooldown = 0;
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }
}
