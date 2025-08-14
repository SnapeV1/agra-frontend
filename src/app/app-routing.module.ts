import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/components/home/home.component';
import { UserProfileComponent } from './features/user/components/user-profile/user-profile.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  {
    path: 'courses',
    loadChildren: () =>
      import('./features/courses/courses.module').then(m => m.CoursesModule),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.module').then(m => m.AdminModule), 
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: 'user',  // Change this
    loadChildren: () =>
      import('./features/user/user.module').then(m => m.UserModule),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
