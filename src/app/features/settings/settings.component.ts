import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  // Password form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwMessage = '';
  pwError = '';

  // Email form
  newEmail = '';
  emailPassword = '';
  emailMessage = '';
  emailError = '';

  // Preferences
  theme: 'light' | 'dark' = (() => {
    const stored = localStorage.getItem('pref_theme');
    if (stored === 'dark' || stored === 'light') return stored as 'light' | 'dark';
    // Coerce legacy 'auto' to system preference once and persist
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = prefersDark ? 'dark' : 'light';
    try { localStorage.setItem('pref_theme', resolved); } catch {}
    return resolved as 'light' | 'dark';
  })();
  language = localStorage.getItem('pref_lang') || 'en';

  // Notification preferences (local only for now)
  emailNotificationsEnabled = localStorage.getItem('pref_notify_email') === 'true';
  pushNotificationsEnabled = localStorage.getItem('pref_notify_push') === 'true';
  smsNotificationsEnabled = localStorage.getItem('pref_notify_sms') === 'true';

  // Modals
  showEmailModal = false;
  showPasswordModal = false;
  showDeleteModal = false;

  constructor(private auth: AuthService, private profileService: ProfileService) {}

  ngOnInit(): void {
    this.applyTheme(this.theme, false);
    // No system-watch needed; 'auto' removed.
  }

  ngOnDestroy(): void {
    // No-op (listener lifecycle tied to page lifetime)
  }

  saveTheme(): void {
    localStorage.setItem('pref_theme', this.theme);
    this.applyTheme(this.theme, true);
    // Persist to backend profile as themePreference
    this.profileService.updateUserProfile({ themePreference: this.theme }).subscribe({
      next: () => {
        const current = this.auth.currentUserValue?.user;
        if (current) {
          this.auth.updateCurrentUser({ ...current, themePreference: this.theme } as any);
        }
      },
      error: () => {
        // Keep UI applied locally even if backend fails
      }
    });
  }

  saveLanguage(): void {
    localStorage.setItem('pref_lang', this.language);
  }

  private applyTheme(theme: 'light' | 'dark', persistSelection = false): void {
    try {
      if (persistSelection) localStorage.setItem('pref_theme', theme);
      const root = document.documentElement;
      if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        root.removeAttribute('data-theme');
      }
    } catch {}
  }

  changePassword(): void {
    this.pwMessage = '';
    this.pwError = '';
    if (!this.currentPassword || !this.newPassword) {
      this.pwError = 'Please fill all password fields.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwError = 'New passwords do not match.';
      return;
    }
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.pwMessage = 'Password updated successfully';
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: (err) => {
        this.pwError = err?.message || 'Failed to change password';
      }
    });
  }

  changeEmail(): void {
    this.emailMessage = '';
    this.emailError = '';
    if (!this.newEmail || !this.emailPassword) {
      this.emailError = 'Please provide new email and current password.';
      return;
    }
    this.auth.changeEmail(this.newEmail, this.emailPassword).subscribe({
      next: () => {
        this.emailMessage = 'Email change requested successfully';
        this.newEmail = '';
        this.emailPassword = '';
        this.showEmailModal = false;
      },
      error: (err) => {
        this.emailError = err?.message || 'Failed to change email';
      }
    });
  }

  // UI helpers
  get currentEmail(): string {
    return this.auth.currentUserValue?.user?.email || this.auth.getUserEmail() || '—';
  }

  openModal(kind: 'email' | 'password' | 'delete'): void {
    this.showEmailModal = kind === 'email';
    this.showPasswordModal = kind === 'password';
    this.showDeleteModal = kind === 'delete';
  }

  closeModal(): void {
    this.showEmailModal = this.showPasswordModal = this.showDeleteModal = false;
  }

  overlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }

  togglePreference(key: 'email' | 'push' | 'sms'): void {
    if (key === 'email') {
      this.emailNotificationsEnabled = !this.emailNotificationsEnabled;
      localStorage.setItem('pref_notify_email', String(this.emailNotificationsEnabled));
    } else if (key === 'push') {
      this.pushNotificationsEnabled = !this.pushNotificationsEnabled;
      localStorage.setItem('pref_notify_push', String(this.pushNotificationsEnabled));
    } else {
      this.smsNotificationsEnabled = !this.smsNotificationsEnabled;
      localStorage.setItem('pref_notify_sms', String(this.smsNotificationsEnabled));
    }
  }
}
