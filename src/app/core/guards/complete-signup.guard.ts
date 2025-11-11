import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CompleteSignupGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Allow when a setup token exists OR a provisional Google signup exists
    try {
      const token = (this.authService as any).getStoredPasswordSetupToken?.();
      if (token) return true;
      const prov = (this.authService as any).getProvisionalSignup?.();
      if (prov && prov.email) return true;
    } catch {}

    // Redirect based on auth status
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login']);
    }
    return false;
  }
}
