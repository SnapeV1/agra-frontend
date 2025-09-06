import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/footer/footer.component';
import {
  LucideAngularModule,
  Leaf,
  BarChart2,
  User,
  Settings,
  Wrench,
  LogOut,
  AlertTriangle,
  Eye
} from 'lucide-angular';
import { RouterModule } from '@angular/router';
@NgModule({
  declarations: [
    NavigationComponent,
    FooterComponent
  ],
  imports: [
    CommonModule,
     LucideAngularModule.pick({
      Leaf,
      BarChart2,
      User,
      Settings,
      Wrench,
      LogOut,
      AlertTriangle,
      Eye
    }),
    RouterModule
  ],
  exports: [
    NavigationComponent,
    FooterComponent
  ]
})
export class SharedModule {
  constructor() {
    console.log('SharedModule loaded');
  }
}
