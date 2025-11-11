import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-complete-signup',
  templateUrl: './complete-signup.component.html',
  styleUrls: ['./complete-signup.component.css']
})
export class CompleteSignupComponent implements OnInit {
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  error: string | null = null;
  success = false;
  provisional: any | null = null;
  passwordStrength = 0;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    try {
      // Prefer provisional Google profile if present
      this.provisional = this.authService.getProvisionalSignup?.() || null;
      
    } catch {}
  }

  onPasswordInput() {
    const p = this.password || '';
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    this.passwordStrength = Math.max(0, Math.min(4, score));
  }

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

    // If we have a provisional Google profile, simply set password for the logged-in Google user
    if (this.provisional && this.provisional.email) {
      this.authService.setPassword(this.password).subscribe({
        next: () => {
          try { this.authService.clearProvisionalSignup?.(); } catch {}
          this.isLoading = false;
          this.success = true;
          setTimeout(() => this.router.navigate(['/home']), 500);
        },
        error: (e) => {
          this.isLoading = false;
          this.error = e?.message || 'Failed to set password. Please try again.';
        }
      });
      return;
    }

    // Default path: attempt to set password with stored token
    this.authService.setPassword(this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/home']), 800);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to set password. Re-login with Google to get a new link or request a reset email.';
      }
    });
  }

  onAvatarError(evt: Event) {
    const img = evt?.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/default-avatar.png';
    }
  }
}
