import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/components/home/home.component';

const routes: Routes = [

   {
    path: 'home',component: HomeComponent,
  },
    {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule),
  },
    { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {} 
