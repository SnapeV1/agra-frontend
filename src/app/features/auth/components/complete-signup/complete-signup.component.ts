import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-complete-signup',
  templateUrl: './complete-signup.component.html',
  styleUrls: ['./complete-signup.component.css']
})
export class CompleteSignupComponent {
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  error: string | null = null;
  success = false;

  constructor(private authService: AuthService, private router: Router) {}

  passwordsMatch(): boolean {
    return !!this.password && this.password === this.confirmPassword;
  }

  submit() {
    if (this.isLoading) return;
    this.error = null;
    if (!this.passwordsMatch() || this.password.length < 8) {
      this.error = 'Passwords must match and be at least 8 characters.';
      return;
    }
    this.isLoading = true;
    this.authService.setPassword(this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/home']), 800);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to set password. Please try again.';
      }
    });
  }

  skip() {
    this.router.navigate(['/home']);
  }
}
