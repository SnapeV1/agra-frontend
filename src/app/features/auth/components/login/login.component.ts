import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginData = {
    email: '',
    password: ''
  };
  
  showPassword = false;
  rememberMe = false;
  isLoading = false;

  constructor(private router: Router, private authService: AuthService) {}

  onLogin() {
    if (this.isLoading) return;
    this.isLoading = true;

    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        this.isLoading = false;
        // AuthService handles the redirect based on redirectUrl
        // No manual redirect needed here
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.isLoading = false;
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    console.log('Forgot password clicked');
    // TO DO
  }

  onGoogleLogin() {
    console.log('Google login clicked');
    // TO DO
  }
}