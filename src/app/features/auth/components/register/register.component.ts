import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerData = {
    name: '',
    email: '',
    phone: '',
    country: '',
    language: '',
    domain: '',
    role: '',
    password: '',
    confirmPassword: ''
  };
  
  showPassword = false;
  showConfirmPassword = false;
  agreeToTerms = false;
  subscribeNewsletter = false;
  isLoading = false;

constructor(private router: Router, private authService: AuthService) {}

  onRegister() {
    if (this.isLoading) return;
    
    if (!this.passwordsMatch()) {
      console.log('Passwords do not match');
      return;
    }
    
    if (!this.agreeToTerms) {
      console.log('Must agree to terms and conditions');
      return;
    }
    
    this.isLoading = true;
    
    const userData = {
      name: this.registerData.name,
      email: this.registerData.email,
      phone: this.registerData.phone,
      country: this.registerData.country,
      language: this.registerData.language,
      domain: this.registerData.domain,
      role: this.registerData.role,
      password: this.registerData.password
    };
    
   this.authService.register(userData).subscribe({
  next: (response) => {
    console.log('Registration successful:', response);
    this.isLoading = false;
    this.router.navigate(['/login']);
  },
  error: (error) => {
    console.error('Registration failed:', error);
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
    console.log('Google registration clicked');
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

  onFacebookRegister() {
    console.log('Facebook registration clicked');
    // To Implement Facebook OAuth registration
  
    // this.authService.facebookSignUp().subscribe({
    //   next: (response) => {
    //     console.log('Facebook registration successful:', response);
    //     this.router.navigate(['/dashboard']);
    //   },
    //   error: (error) => {
    //     console.error('Facebook registration failed:', error);
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
      this.registerData.domain &&
      this.registerData.role &&
      this.registerData.password &&
      this.registerData.confirmPassword &&
      this.passwordsMatch() &&
      this.agreeToTerms
    );
  }

  // Helper method to reset form
  resetForm() {
    this.registerData = {
      name: '',
      email: '',
      phone: '',
      country: '',
      language: '',
      domain: '',
      role: '',
      password: '',
      confirmPassword: ''
    };
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.agreeToTerms = false;
    this.subscribeNewsletter = false;
    this.isLoading = false;
  }
}