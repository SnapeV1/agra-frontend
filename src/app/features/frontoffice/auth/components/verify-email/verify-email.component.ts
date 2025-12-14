import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

type VerifyStatus = 'pending' | 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  status: VerifyStatus = 'pending';
  message: string | null = null;
  token: string | null = null;
  emailHint: string | null = null;
  hasToken = false;
  isLoading = false;
  resendLoading = false;
  resendMessage: string | null = null;
  resendError: string | null = null;
  resendCooldown = 0;
  private resendTimer: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.hasToken = !!this.authService.getToken();
    this.emailHint = this.authService.getUserEmail() || this.authService.currentUserValue?.user?.email || null;

    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || null;
      this.emailHint = this.emailHint || params['email'] || null;

      if (this.token) {
        this.status = 'verifying';
        this.verifyToken(this.token);
      } else {
        this.status = 'pending';
      }
    });
  }

  private verifyToken(token: string): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.message = null;
    this.resendMessage = null;
    this.resendError = null;

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.isLoading = false;
        this.status = 'success';
        this.message = 'Your email is verified. You can now sign in with full access.';
      },
      error: (err) => {
        this.isLoading = false;
        this.status = 'error';
        this.message = err?.message || 'Verification failed or link expired. Request a new link and try again.';
      }
    });
  }

  resend(): void {
    if (this.resendLoading || this.resendCooldown > 0) return;
    this.resendMessage = null;
    this.resendError = null;
    if (!this.hasToken) {
      this.resendError = 'Sign in first to resend the verification email.';
      return;
    }
    this.resendLoading = true;
    this.authService.resendVerification().subscribe({
      next: () => {
        this.resendLoading = false;
        this.resendMessage = 'A new verification link has been sent. It expires in 1 hour.';
        this.startCooldown(60);
      },
      error: (err) => {
        this.resendLoading = false;
        this.resendError = err?.message || 'Could not resend verification. Try again in a moment.';
      }
    });
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
