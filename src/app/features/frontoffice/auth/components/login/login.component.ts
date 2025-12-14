import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { environment } from 'src/environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  isLoading = false;
  email = '';
  password = '';
  showPassword = false;
  errorMessage: string | null = null;
  infoMessage: string | null = null;
  // Default to "remember me" so auth lives in localStorage and is shared across tabs
  rememberMe = true;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.initGoogleButton();
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
            try { this.authService.setRememberMe(!!this.rememberMe); } catch {}
            this.authService.beginGoogleSignup(idToken);
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
      google.accounts.id.prompt((notification: any) => {});
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
        // Failsafe: ensure we leave the login page after successful auth
        try {
          if (this.authService.isAuthenticated()) {
            this.router.navigate(['/home']);
          }
        } catch {}
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Invalid email or password.';
        if (this.errorMessage?.toLowerCase().includes('verify')) {
          this.infoMessage = 'Check your inbox for the verification link. The link expires in 1 hour.';
          this.router.navigate(['/verify-email'], { queryParams: { email } });
        }
      }
    });
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.errorMessage = null;
    this.infoMessage = null;
    const email = (this.email || '').trim();
    this.router.navigate(['/reset-password'], { queryParams: email ? { email } : undefined });
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
