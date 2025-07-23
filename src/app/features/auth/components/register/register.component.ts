import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    farmName: '',
    farmType: '',
    password: '',
    confirmPassword: ''
  };
  
  showPassword = false;
  showConfirmPassword = false;
  agreeToTerms = false;
  subscribeNewsletter = false;
  isLoading = false;

  constructor(private router: Router) {}

  onRegister() {
    if (this.isLoading) return;
    
    if (!this.passwordsMatch()) {
      console.log('Passwords do not match');
      return;
    }
    
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      console.log('Registration attempt:', this.registerData);
      this.isLoading = false;
      // Add your registration logic here
      // this.router.navigate(['/login']);
    }, 2000);
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
    // Implement Google OAuth registration
  }

  onFacebookRegister() {
    console.log('Facebook registration clicked');
    // Implement Facebook OAuth registration
  }
}