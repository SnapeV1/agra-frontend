
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AuthGuard } from './core/guards/authguards.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { FeedComponent } from './features/feed/feed.component';
import { ContactComponent } from './features/contact/contact.component';



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
   { 
    path: 'contact', 
    component: ContactComponent,
  },

  {
    path: 'courses',
    loadChildren: () =>
      import('./features/courses/courses.module').then(m => m.CoursesModule),
  
  },
{ path: 'feed', component: FeedComponent },


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

  //
  // {
  //   path: 'admin',
  //   loadChildren: () =>
  //     import('./features/admin/admin.module').then(m => m.AdminModule),
  //   canActivate: [RoleGuard],
  //   canActivateChild: [RoleGuard],
  //   data: { roles: ['ADMIN'] }
  // },

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