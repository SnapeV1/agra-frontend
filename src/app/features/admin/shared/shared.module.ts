import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { SidebarComponent } from './sidebar/sidebar.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { BaseLayoutComponent } from './base-layout/base-layout.component';
import { SidebarService } from '../services/sidebar.service';

@NgModule({
  declarations: [
    SidebarComponent,
    NavbarComponent,
    FooterComponent,
    BaseLayoutComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  exports: [
    SidebarComponent,
    NavbarComponent,
    FooterComponent,
    BaseLayoutComponent,
    RouterModule,
    FormsModule
  ],
  providers: [
    SidebarService
  ]
})
export class SharedModule { }