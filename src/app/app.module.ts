import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AuthRoutingModule } from './features/auth/auth-routing.module';
import { AuthModule } from './features/auth/auth.module';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './features/home/components/home/home.component';
import { NavigationComponent } from './features/shared/components/navigation/navigation.component';
import { FooterComponent } from './features/shared/components/footer/footer.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NavigationComponent,
    FooterComponent,
  
  ],
  imports: [
    BrowserModule,
    AuthRoutingModule, 
    AppRoutingModule,
    AuthModule
          
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
