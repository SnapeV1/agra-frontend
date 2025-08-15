// app-routing.module.ts - Updated with guards
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/components/home/home.component';
import { UserProfileComponent } from './features/user/components/user-profile/user-profile.component';
import { AuthGuard } from './features/auth/guards/authguards.guard';
import { AdminGuard } from './features/auth/guards/admin.guard';
import { UserGuard } from './features/auth/guards/user-guard.guard';



const routes: Routes = [
  // Public routes (protected by GuestGuard to prevent authenticated users from accessing)
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule),
    canActivate: [AuthGuard] 
  },

  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [AuthGuard]
  },

  // Courses - accessible to authenticated users
  {
    path: 'courses',
    loadChildren: () =>
      import('./features/courses/courses.module').then(m => m.CoursesModule),
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard]
  },

  // Admin routes - only for ADMIN role
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard]
  },

  // User routes - for USER and ADMIN roles
  {
    path: 'user',
    loadChildren: () =>
      import('./features/user/user.module').then(m => m.UserModule),
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard]
  },

  // Alternative: Using RoleGuard with data
  // {
  //   path: 'admin',
  //   loadChildren: () =>
  //     import('./features/admin/admin.module').then(m => m.AdminModule),
  //   canActivate: [RoleGuard],
  //   canActivateChild: [RoleGuard],
  //   data: { roles: ['ADMIN'] }
  // },

  // Default redirects
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Set to true for debugging
    preloadingStrategy: PreloadAllModules // Optional: preload lazy modules
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}