import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LucideAngularModule, Mail, Phone, Calendar, MapPin, BarChart2, User, Globe, Briefcase, Bell, CheckCircle, AlertTriangle, Send } from 'lucide-angular';
import { AppComponent } from './app.component';
import { AuthRoutingModule } from './features/auth/auth-routing.module';
import { AuthModule } from './features/auth/auth.module';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './features/home/home.component';
import { SettingsComponent } from './features/settings/settings.component';
import { SharedModule } from "src/app/features/shared/shared.module";
import { AdminModule } from './features/admin/admin.module';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/services/auth/auth.service';
import { FeedModule } from './features/feed/feed.module';
import { RouterModule } from '@angular/router';
import { ContactModule } from './features/contact/contact.module';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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
    SettingsComponent,

    
  
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AuthRoutingModule,
    AppRoutingModule,
    AuthModule,
    SharedModule,
    ContactModule,
    AdminModule,
    FormsModule,
    FeedModule,
    RouterModule,
    BrowserAnimationsModule,
    LucideAngularModule.pick({ Mail, Phone, Calendar, MapPin, BarChart2, User, Globe, Briefcase, Bell, CheckCircle, AlertTriangle, Send }),
     ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),

  
],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
