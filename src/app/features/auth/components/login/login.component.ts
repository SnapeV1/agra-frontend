import { Component } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  onLogin() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
   
    setTimeout(() => {
      console.log('Login attempt:', this.loginData);
      this.isLoading = false;
          // TO DO

    }, 2000);
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