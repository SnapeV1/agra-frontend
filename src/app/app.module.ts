import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AuthRoutingModule } from './features/auth/auth-routing.module';
import { AuthModule } from './features/auth/auth.module';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './features/home/components/home/home.component';
import { SharedModule } from "src/app/features/shared/shared.module";
import { AdminModule } from './features/admin/admin.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,

    
  
  ],
  imports: [
    BrowserModule,
    AuthRoutingModule,
    AppRoutingModule,
    AuthModule,
    SharedModule,
    AdminModule,
    FormsModule
],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
