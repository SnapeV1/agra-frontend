import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { CompleteSignupComponent } from './components/complete-signup/complete-signup.component';
import { CompleteSignupGuard } from 'src/app/core/guards/complete-signup.guard';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'complete-signup', component: CompleteSignupComponent, canActivate: [CompleteSignupGuard] },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },
  { path: 'verify-email', component: VerifyEmailComponent },

];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule {}
