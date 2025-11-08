import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { environment } from 'src/environments/environment';
import { OnDestroy } from '@angular/core';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  isLoading = false;
  email = '';
  password = '';
  showPassword = false;
  errorMessage: string | null = null;
  infoMessage: string | null = null;
  rememberMe = false;
  // Forgot-password cooldown state
  forgotCooldown = 0; // seconds remaining
  private forgotTimer: any = null;
  private readonly RESET_COOLDOWN_KEY = 'pwd_reset_cooldown_until';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.initGoogleButton();
    this.restoreForgotCooldown();
  }

  ngOnDestroy(): void {
    if (this.forgotTimer) {
      clearInterval(this.forgotTimer);
      this.forgotTimer = null;
    }
  }

  private initGoogleButton() {
    this.isLoading = true;
    this.loadGoogleScript()
      .then(() => {
        if (!environment.googleClientId) {
          alert('Missing Google Client ID.');
          this.isLoading = false;
          return;
        }
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          // Avoid auto-using FedCM prompt; only on explicit user action
          use_fedcm_for_prompt: false,
          auto_select: false,
          callback: (response: any) => {
            const idToken = response?.credential;
            if (!idToken) {
              this.isLoading = false;
              alert('No credential returned by Google.');
              return;
            }
            try {
              const claims = this.decodeJwt(idToken);
              if (claims) {
                const { sub, email, name, picture } = claims as any;
                console.log('[Google][Login] ID token claims', { sub, email, name, picture });
              }
            } catch {}
            try { this.authService.setRememberMe(!!this.rememberMe); } catch {}
            this.authService.loginWithGoogleIdToken(idToken);
            this.isLoading = false;
          }
        });

        const btnContainer = document.getElementById('gsi-button');
        if (btnContainer && btnContainer.childElementCount === 0) {
          google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 360
          });
        }
        this.isLoading = false;
      })
      .catch(() => {
        this.isLoading = false;
      });
  }

  onGooglePrompt() {
    try {
      google.accounts.id.prompt((notification: any) => {
        // Gracefully handle cases where prompt is not shown or skipped
        const notDisplayed = notification?.isNotDisplayed?.() ?? false;
        const skipped = notification?.isSkippedMoment?.() ?? false;
        if (notDisplayed || skipped) {
          const reason = notification?.getNotDisplayedReason?.() || notification?.getSkippedReason?.() || 'unknown';
          console.info('[Google][Login] Prompt not shown/skipped:', { notDisplayed, skipped, reason });
        }
      });
    } catch {
      // Swallow errors to avoid noisy console when environment blocks FedCM
    }
  }

  onLogin() {
    if (this.isLoading) return;
    this.errorMessage = null;
    const email = (this.email || '').trim();
    const password = this.password || '';
    if (!email || !password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.isLoading = true;
    try { this.authService.setRememberMe(!!this.rememberMe); } catch {}
    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Invalid email or password.';
      }
    });
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.errorMessage = null;
    this.infoMessage = null;
    if (this.forgotCooldown > 0) {
      // Ignore clicks during cooldown
      return;
    }
    const email = (this.email || '').trim();
    if (!email) {
      this.errorMessage = 'Enter your email above to reset your password.';
      return;
    }
    this.isLoading = true;
    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.infoMessage = 'If an account exists, a reset link has been sent.';
        this.startForgotCooldown(60);
      },
      error: () => {
        this.isLoading = false;
        // Do not reveal whether email exists
        this.infoMessage = 'If an account exists, a reset link has been sent.';
        this.startForgotCooldown(60);
      }
    });
  }

  private startForgotCooldown(seconds: number) {
    try {
      const until = Date.now() + seconds * 1000;
      localStorage.setItem(this.RESET_COOLDOWN_KEY, String(until));
    } catch {}
    this.forgotCooldown = seconds;
    if (this.forgotTimer) clearInterval(this.forgotTimer);
    this.forgotTimer = setInterval(() => {
      this.forgotCooldown = Math.max(0, this.forgotCooldown - 1);
      if (this.forgotCooldown === 0) {
        clearInterval(this.forgotTimer);
        this.forgotTimer = null;
      }
    }, 1000);
  }

  private restoreForgotCooldown() {
    try {
      const untilStr = localStorage.getItem(this.RESET_COOLDOWN_KEY);
      if (!untilStr) return;
      const until = parseInt(untilStr, 10);
      if (isNaN(until)) return;
      const remainingMs = until - Date.now();
      if (remainingMs > 0) {
        const seconds = Math.ceil(remainingMs / 1000);
        this.startForgotCooldown(seconds);
      } else {
        localStorage.removeItem(this.RESET_COOLDOWN_KEY);
      }
    } catch {}
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
}

