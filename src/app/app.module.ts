import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BarChart2,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Facebook,
  Github,
  File,
  Globe,
  GraduationCap,
  Heart,
  Image,
  Instagram,
  Layers,
  Leaf,
  Shield,
  Linkedin,
  Loader2,
  LogOut,
  LucideAngularModule,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Phone,
  Play,
  Plus,
  Save,
  Send,
  Settings,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Twitter,
  User,
  Users,
  Wheat,
  Wrench,
  X,
  Youtube
} from 'lucide-angular';
import { AppComponent } from './app.component';
import { AuthRoutingModule } from './features/frontoffice/auth/auth-routing.module';
import { AuthModule } from './features/frontoffice/auth/auth.module';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './features/frontoffice/home/home.component';
import { SharedModule } from './shared/shared.module';
import { SharedModule as AdminSharedModule } from './features/backoffice/admin/shared/shared.module';
import { AdminModule } from './features/backoffice/admin/admin.module';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/services/auth/auth.service';
import { FeedModule } from './features/frontoffice/feed/feed.module';
import { RouterModule } from '@angular/router';
import { ContactModule } from './features/frontoffice/contact/contact.module';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { LanguageInterceptor } from './core/interceptors/language.interceptor';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { VerifyCertificateComponent } from './features/frontoffice/verify-certificate/verify-certificate.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
const lucideIcons = {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BarChart2,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Facebook,
  Github,
  File,
  Globe,
  GraduationCap,
  Heart,
  Image,
  Instagram,
  Layers,
  Leaf,
  Shield,
  Linkedin,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Phone,
  Play,
  Plus,
  Save,
  Send,
  Settings,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Twitter,
  User,
  Users,
  Wheat,
  Wrench,
  X,
  Youtube
};
const lucideIconAliases = {
  'alert-triangle': AlertTriangle,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  award: Award,
  'bar-chart-2': BarChart2,
  'bar-chart-3': BarChart3,
  bell: Bell,
  bot: Bot,
  'check-circle': CheckCircle,
  'check-circle-2': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  clock: Clock,
  facebook: Facebook,
  github: Github,
  instagram: Instagram,
  leaf: Leaf,
  shield: Shield,
  linkedin: Linkedin,
  'log-out': LogOut,
  mail: Mail,
  'map-pin': MapPin,
  menu: Menu,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  'more-vertical': MoreVertical,
  phone: Phone,
  play: Play,
  plus: Plus,
  save: Save,
  send: Send,
  settings: Settings,
  'share-2': Share2,
  'trash-2': Trash2,
  twitter: Twitter,
  user: User,
  users: Users,
  wheat: Wheat,
  wrench: Wrench,
  x: X,
  youtube: Youtube
};
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
    VerifyCertificateComponent,

    
  
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AuthRoutingModule,
    AppRoutingModule,
    AuthModule,
    SharedModule,
    AdminSharedModule,
    ContactModule,
    AdminModule,
    FormsModule,
    FeedModule,
    RouterModule,
    BrowserAnimationsModule,
    LucideAngularModule.pick(lucideIcons),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
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
    { provide: HTTP_INTERCEPTORS, useClass: LanguageInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
