
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/frontoffice/home/home.component';
import { AuthGuard } from './core/guards/authguards.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { FeedComponent } from './features/frontoffice/feed/feed.component';
import { ContactComponent } from './features/frontoffice/contact/contact.component';



const routes: Routes = [
  // Default route shows Home at root
  { path: '', component: HomeComponent, pathMatch: 'full' },

  { path: 'home', component: HomeComponent },
  {
    path: 'settings',
    loadChildren: () =>
      import('./features/frontoffice/settings/settings.module').then(m => m.SettingsModule)
  },
   { 
    path: 'contact', 
    component: ContactComponent,
  },

  {
    path: 'courses',
    loadChildren: () =>
      import('./features/frontoffice/courses/courses.module').then(m => m.CoursesModule),
  
  },
{ path: 'feed', component: FeedComponent },


  {
    path: 'admin',
    loadChildren: () =>
      import('./features/backoffice/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard]
  },

  {
    path: 'user',
    loadChildren: () =>
      import('./features/frontoffice/user/user.module').then(m => m.UserModule),
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

  // Wildcard: redirect unknown routes to home
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false,
    preloadingStrategy: PreloadAllModules,
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled',
    scrollOffset: [0, 0]
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
