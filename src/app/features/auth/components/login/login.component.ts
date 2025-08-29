import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

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
        console.log('Login successful:', response);
        this.isLoading = false;
        
        // Redirect based on user role
        this.redirectBasedOnRole();
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.isLoading = false;
      }
    });
  }

  private redirectBasedOnRole() {
    // Check if user is admin
    if (this.authService.isAdmin()) {
      // Redirect to external admin dashboard
      this.router.navigate(['/admin/dashboard']);
    } else {
      // Redirect regular users to home page
      this.router.navigate(['/home']);
    }
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

  onFacebookLogin() {
    console.log('Facebook login clicked');
    // TO DO
  }
}