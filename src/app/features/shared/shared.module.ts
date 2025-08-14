import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/footer/footer.component';

@NgModule({
  declarations: [
    NavigationComponent,
    FooterComponent
  ],
  imports: [
    CommonModule
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
