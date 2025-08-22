
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/components/home/home.component';
import { AuthGuard } from './features/auth/guards/authguards.guard';
import { AdminGuard } from './features/auth/guards/admin.guard';
import { FeedComponent } from './features/feed/feed.component';



const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule),
    canActivate: [AuthGuard] 
  },

  { 
    path: 'home', 
    component: HomeComponent,
  },

  // Courses - accessible to authenticated users
  {
    path: 'courses',
    loadChildren: () =>
      import('./features/courses/courses.module').then(m => m.CoursesModule),
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard]
  },
{ path: 'feed', component: FeedComponent },


  // Admin routes - only for ADMIN role
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard]
  },

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
    enableTracing: false,
    preloadingStrategy: PreloadAllModules 
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}