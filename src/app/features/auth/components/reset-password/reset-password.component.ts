import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  token: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  infoMessage: string | null = null;
  showPassword = false;
  showConfirm = false;
  success = false;

  // Password requirement flags
  reqLength = false;
  reqUppercase = false;
  reqLowercase = false;
  reqNumber = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]]
    });

    // Support token via query param or path param
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || this.route.snapshot.params['token'] || null;
      if (!this.token) {
        this.errorMessage = 'Reset token is missing or invalid.';
      }
    });

    // Live validation for password requirements and match
    this.form.get('password')?.valueChanges.subscribe((val: string) => this.updateRequirements(val || ''));
    this.form.get('confirm')?.valueChanges.subscribe(() => {
      // trigger UI update for match state
    });
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    if (this.isLoading) return;
    this.errorMessage = null;
    this.infoMessage = null;

    if (!this.token) {
      this.errorMessage = 'Reset token is missing or invalid.';
      return;
    }
    if (this.form.invalid) {
      this.errorMessage = 'Please provide a valid password (min 8 characters).';
      return;
    }
    const password = this.f['password'].value as string;
    const confirm = this.f['confirm'].value as string;
    if (password !== confirm) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.authService.resetPassword(this.token, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.infoMessage = 'Your password has been reset successfully.';
        this.success = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to reset password. Please try again or request a new link.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  get passwordsMatch(): boolean {
    const p = this.f['password'].value as string;
    const c = this.f['confirm'].value as string;
    return !!p && !!c && p === c;
  }

  private updateRequirements(password: string): void {
    this.reqLength = password.length >= 8;
    this.reqUppercase = /[A-Z]/.test(password);
    this.reqLowercase = /[a-z]/.test(password);
    this.reqNumber = /[0-9]/.test(password);
  }
}
