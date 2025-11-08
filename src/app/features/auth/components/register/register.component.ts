import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { environment } from 'src/environments/environment';

declare const google: any;

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerData = {
    name: '',
    email: '',
    phone: '',
    country: '',
    language: '',
    profession: '',
    password: '',
    confirmPassword: '',
    selectedCountryCode: '+1'
  };
  
  showPassword = false;
  showConfirmPassword = false;
  agreeToTerms = false;
  subscribeNewsletter = false;
  isLoading = false;
  isCountryDropdownOpen = false;
  searchTerm = '';
  searchTimeout: any;
  highlightedCountry: any = null;

  // Country codes with flags for phone number (sorted alphabetically by name)
  countryCodes = [
    { code: '+355', country: 'AL', flag: '🇦🇱', name: 'Albania' },
    { code: '+213', country: 'DZ', flag: '🇩🇿', name: 'Algeria' },
    { code: '+376', country: 'AD', flag: '🇦🇩', name: 'Andorra' },
    { code: '+54', country: 'AR', flag: '🇦🇷', name: 'Argentina' },
    { code: '+374', country: 'AM', flag: '🇦🇲', name: 'Armenia' },
    { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
    { code: '+43', country: 'AT', flag: '🇦🇹', name: 'Austria' },
    { code: '+994', country: 'AZ', flag: '🇦🇿', name: 'Azerbaijan' },
    { code: '+375', country: 'BY', flag: '🇧🇾', name: 'Belarus' },
    { code: '+32', country: 'BE', flag: '🇧🇪', name: 'Belgium' },
    { code: '+591', country: 'BO', flag: '🇧🇴', name: 'Bolivia' },
    { code: '+387', country: 'BA', flag: '🇧🇦', name: 'Bosnia and Herzegovina' },
    { code: '+267', country: 'BW', flag: '🇧🇼', name: 'Botswana' },
    { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
    { code: '+359', country: 'BG', flag: '🇧🇬', name: 'Bulgaria' },
    { code: '+257', country: 'BI', flag: '🇧🇮', name: 'Burundi' },
    { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
    { code: '+56', country: 'CL', flag: '🇨🇱', name: 'Chile' },
    { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
    { code: '+57', country: 'CO', flag: '🇨🇴', name: 'Colombia' },
    { code: '+385', country: 'HR', flag: '🇭🇷', name: 'Croatia' },
    { code: '+357', country: 'CY', flag: '🇨🇾', name: 'Cyprus' },
    { code: '+420', country: 'CZ', flag: '🇨🇿', name: 'Czech Republic' },
    { code: '+45', country: 'DK', flag: '🇩🇰', name: 'Denmark' },
    { code: '+593', country: 'EC', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+20', country: 'EG', flag: '🇪🇬', name: 'Egypt' },
    { code: '+372', country: 'EE', flag: '🇪🇪', name: 'Estonia' },
    { code: '+268', country: 'SZ', flag: '🇸🇿', name: 'Eswatini' },
    { code: '+251', country: 'ET', flag: '🇪🇹', name: 'Ethiopia' },
    { code: '+298', country: 'FO', flag: '🇫🇴', name: 'Faroe Islands' },
    { code: '+358', country: 'FI', flag: '🇫🇮', name: 'Finland' },
    { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
    { code: '+594', country: 'GF', flag: '🇬🇫', name: 'French Guiana' },
    { code: '+995', country: 'GE', flag: '🇬🇪', name: 'Georgia' },
    { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
    { code: '+30', country: 'GR', flag: '🇬🇷', name: 'Greece' },
    { code: '+592', country: 'GY', flag: '🇬🇾', name: 'Guyana' },
    { code: '+36', country: 'HU', flag: '🇭🇺', name: 'Hungary' },
    { code: '+354', country: 'IS', flag: '🇮🇸', name: 'Iceland' },
    { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
    { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
    { code: '+353', country: 'IE', flag: '🇮🇪', name: 'Ireland' },
    { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
    { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
    { code: '+7', country: 'KZ', flag: '🇰🇿', name: 'Kazakhstan' },
    { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
    { code: '+383', country: 'XK', flag: '🇽🇰', name: 'Kosovo' },
    { code: '+996', country: 'KG', flag: '🇰🇬', name: 'Kyrgyzstan' },
    { code: '+371', country: 'LV', flag: '🇱🇻', name: 'Latvia' },
    { code: '+266', country: 'LS', flag: '🇱🇸', name: 'Lesotho' },
    { code: '+218', country: 'LY', flag: '🇱🇾', name: 'Libya' },
    { code: '+423', country: 'LI', flag: '🇱🇮', name: 'Liechtenstein' },
    { code: '+370', country: 'LT', flag: '🇱🇹', name: 'Lithuania' },
    { code: '+265', country: 'MW', flag: '🇲🇼', name: 'Malawi' },
    { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
    { code: '+356', country: 'MT', flag: '🇲🇹', name: 'Malta' },
    { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
    { code: '+373', country: 'MD', flag: '🇲🇩', name: 'Moldova' },
    { code: '+377', country: 'MC', flag: '🇲🇨', name: 'Monaco' },
    { code: '+382', country: 'ME', flag: '🇲🇪', name: 'Montenegro' },
    { code: '+212', country: 'MA', flag: '🇲🇦', name: 'Morocco' },
    { code: '+258', country: 'MZ', flag: '🇲🇿', name: 'Mozambique' },
    { code: '+264', country: 'NA', flag: '🇳🇦', name: 'Namibia' },
    { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
    { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
    { code: '+234', country: 'NG', flag: '🇳🇬', name: 'Nigeria' },
    { code: '+389', country: 'MK', flag: '🇲🇰', name: 'North Macedonia' },
    { code: '+47', country: 'NO', flag: '🇳🇴', name: 'Norway' },
    { code: '+595', country: 'PY', flag: '🇵🇾', name: 'Paraguay' },
    { code: '+51', country: 'PE', flag: '🇵🇪', name: 'Peru' },
    { code: '+63', country: 'PH', flag: '🇵🇭', name: 'Philippines' },
    { code: '+48', country: 'PL', flag: '🇵🇱', name: 'Poland' },
    { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal' },
    { code: '+40', country: 'RO', flag: '🇷🇴', name: 'Romania' },
    { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
    { code: '+250', country: 'RW', flag: '🇷🇼', name: 'Rwanda' },
    { code: '+378', country: 'SM', flag: '🇸🇲', name: 'San Marino' },
    { code: '+381', country: 'RS', flag: '🇷🇸', name: 'Serbia' },
    { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
    { code: '+421', country: 'SK', flag: '🇸🇰', name: 'Slovakia' },
    { code: '+386', country: 'SI', flag: '🇸🇮', name: 'Slovenia' },
    { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
    { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
    { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
    { code: '+249', country: 'SD', flag: '🇸🇩', name: 'Sudan' },
    { code: '+597', country: 'SR', flag: '🇸🇷', name: 'Suriname' },
    { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
    { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
    { code: '+992', country: 'TJ', flag: '🇹🇯', name: 'Tajikistan' },
    { code: '+255', country: 'TZ', flag: '🇹🇿', name: 'Tanzania' },
    { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
    { code: '+216', country: 'TN', flag: '🇹🇳', name: 'Tunisia' },
    { code: '+90', country: 'TR', flag: '🇹🇷', name: 'Turkey' },
    { code: '+993', country: 'TM', flag: '🇹🇲', name: 'Turkmenistan' },
    { code: '+256', country: 'UG', flag: '🇺🇬', name: 'Uganda' },
    { code: '+380', country: 'UA', flag: '🇺🇦', name: 'Ukraine' },
    { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
    { code: '+598', country: 'UY', flag: '🇺🇾', name: 'Uruguay' },
    { code: '+998', country: 'UZ', flag: '🇺🇿', name: 'Uzbekistan' },
    { code: '+39', country: 'VA', flag: '🇻🇦', name: 'Vatican City' },
    { code: '+58', country: 'VE', flag: '🇻🇪', name: 'Venezuela' },
    { code: '+84', country: 'VN', flag: '🇻🇳', name: 'Vietnam' },
    { code: '+260', country: 'ZM', flag: '🇿🇲', name: 'Zambia' },
    { code: '+263', country: 'ZW', flag: '🇿🇼', name: 'Zimbabwe' }
  ];

constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.initGoogleButton();
  }

private initGoogleButton() {
  this.loadGoogleScript()
    .then(() => {
      if (!environment.googleClientId) return;

      try {
        // 👇 disable all automatic One-Tap or remembered sessions
        google.accounts.id.disableAutoSelect();
        google.accounts.id.cancel();

        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          use_fedcm_for_prompt: false,
          auto_select: false,
          callback: (response: any) => {
            const idToken = response?.credential;
            if (idToken) {
              try {
                const claims = this.decodeJwt(idToken);
                if (claims) {
                  const { sub, email, name, picture } = claims as any;
                  console.log('[Google][Register] ID token claims', { sub, email, name, picture });
                }
              } catch {}
              this.authService.redirectUrl = '/complete-profile';
              this.authService.loginWithGoogleIdToken(idToken);
            }
          }
        });

        const btnContainer = document.getElementById('gsi-signup');
        if (btnContainer && btnContainer.childElementCount === 0) {
          google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 360,
          });
        }
      } catch (err) {
        console.error('Google Sign-In init error', err);
      }
    })
    .catch(() => {});
}

  private loadGoogleScript(): Promise<void> {
    
    return new Promise((resolve, reject) => {
      if ((window as any).google && (window as any).google.accounts) {
        resolve();
        return;
      }
      const id = 'google-identity-services';
      const existing = document.getElementById(id) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private decodeJwt(token: string): any | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  onRegister() {
    if (this.isLoading) return;
    
    if (!this.passwordsMatch()) {
      return;
    }
    
    if (!this.agreeToTerms) {
      return;
    }
    
    this.isLoading = true;
    
    const userData = {
      name: this.registerData.name,
      email: this.registerData.email,
      phone: `${this.registerData.selectedCountryCode} ${this.registerData.phone}`,
      country: this.registerData.country,
      language: this.registerData.language,
      profession: this.registerData.profession,
      password: this.registerData.password
    };
    
   this.authService.register(userData).subscribe({
  next: (response) => {
    this.isLoading = false;
    this.router.navigate(['/login']);
  },
  error: (error) => {
    this.isLoading = false;
  }
});

  }

  passwordsMatch(): boolean {
    return this.registerData.password === this.registerData.confirmPassword;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onGoogleRegister() {
    // TO Implement, Google OAuth registration
  
    // this.authService.googleSignUp().subscribe({
    //   next: (response) => {
    //     console.log('Google registration successful:', response);
    //     this.router.navigate(['/dashboard']);
    //   },
    //   error: (error) => {
    //     console.error('Google registration failed:', error);
    //   }
    // });
  }

  // Helper method to validate form before submission
  isFormValid(): boolean {
    return !!(
      this.registerData.name &&
      this.registerData.email &&
      this.registerData.phone &&
      this.registerData.country &&
      this.registerData.language &&
      this.registerData.password &&
      this.registerData.confirmPassword &&
      this.passwordsMatch() &&
      this.agreeToTerms
    );
  }

  // Helper method to reset form
  toggleCountryDropdown() {
    this.isCountryDropdownOpen = !this.isCountryDropdownOpen;
    if (!this.isCountryDropdownOpen) {
      this.highlightedCountry = null;
      this.searchTerm = '';
    }
  }

  selectCountry(country: any) {
    this.registerData.selectedCountryCode = country.code;
    this.isCountryDropdownOpen = false;
  }

  getSelectedCountry() {
    return this.countryCodes.find(country => country.code === this.registerData.selectedCountryCode) || { country: 'us', code: '+1', name: 'United States' };
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
    
    // Handle escape key
    if (key === 'escape') {
      this.isCountryDropdownOpen = false;
      return;
    }

    // Handle enter key to select highlighted country
    if (key === 'enter' && this.highlightedCountry) {
      event.preventDefault();
      this.selectCountry(this.highlightedCountry);
      return;
    }

    // Handle letter keys for search
    if (key.length === 1 && key.match(/[a-z]/)) {
      event.preventDefault();
      this.searchTerm += key;
      
      // Clear previous timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      // Find matching country and highlight it (don't select)
      const matchingCountry = this.countryCodes.find(country => 
        country.name.toLowerCase().startsWith(this.searchTerm)
      );
      
      if (matchingCountry) {
        this.highlightedCountry = matchingCountry;
        // Scroll to the highlighted country
        this.scrollToHighlightedCountry();
      }
      
      // Reset search term after 1 second
      this.searchTimeout = setTimeout(() => {
        this.searchTerm = '';
      }, 1000);
    }
  }

  onPhoneKeydown(event: KeyboardEvent) {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (event.keyCode === 65 && event.ctrlKey === true) ||
        (event.keyCode === 67 && event.ctrlKey === true) ||
        (event.keyCode === 86 && event.ctrlKey === true) ||
        (event.keyCode === 88 && event.ctrlKey === true) ||
        // Allow: home, end, left, right
        (event.keyCode >= 35 && event.keyCode <= 39)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }

  onPhoneInput(event: any) {
     let value = event.target.value;
     // Remove all non-numeric characters
     value = value.replace(/\D/g, '');
     
     // Format the phone number
     if (value.length >= 6) {
       value = value.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1-$2-$3');
     } else if (value.length >= 3) {
       value = value.replace(/(\d{3})(\d{0,3})/, '$1-$2');
     }
     
     // Update the model
     this.registerData.phone = value;
     event.target.value = value;
   }

   scrollToHighlightedCountry() {
     if (!this.highlightedCountry) return;
     
     setTimeout(() => {
       const highlightedElement = document.querySelector('.country-option.highlighted');
       if (highlightedElement) {
         highlightedElement.scrollIntoView({ 
           behavior: 'smooth', 
           block: 'nearest' 
         });
       }
     }, 0);
   }

  resetForm() {
    this.registerData = {
      name: '',
      email: '',
      phone: '',
      country: '',
      language: '',
      profession: '',
      password: '',
      confirmPassword: '',
      selectedCountryCode: '+1'
    };
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.agreeToTerms = false;
    this.subscribeNewsletter = false;
    this.isLoading = false;
    this.isCountryDropdownOpen = false;
  }
}

