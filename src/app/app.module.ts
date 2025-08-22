import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AuthRoutingModule } from './features/auth/auth-routing.module';
import { AuthModule } from './features/auth/auth.module';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './features/home/components/home/home.component';
import { SharedModule } from "src/app/features/shared/shared.module";
import { AdminModule } from './features/admin/admin.module';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth/auth.service';
import { FeedComponent } from './features/feed/feed.component';
import { FeedModule } from './features/feed/feed.module';
export function initializeAuth(authService: AuthService) {
  return () => {
    authService.refreshAuthState();
    return Promise.resolve();
  };
}
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
    FormsModule,
    FeedModule
  
],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
