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
  Eye,
  MessageCircle,
  Send,
  X,
  Bot,
  Minimize2,
  Users,
  Award,
  Clock,
  MapPin,
  Phone,
  Mail,
  Bell,
  Facebook,
  Twitter,
  Instagram,
  Wheat,
  Linkedin,
  Youtube,
  Github,
  ArrowUp
} from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatbotWidgetComponent } from './components/chatbot-widget/chatbot-widget.component';
@NgModule({
  declarations: [
    NavigationComponent,
    FooterComponent,
    ChatbotWidgetComponent
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
      Eye,
      MessageCircle,
      Send,
      X,
      Bot,
      Minimize2,
      Users,
      Award,
      Clock,
      MapPin,
      Phone,
      Mail,
      Bell,
      Facebook,
      Twitter,
      Instagram,
      Wheat,
      Linkedin,
      Youtube,
      Github,
      ArrowUp
    }),
    RouterModule,
    FormsModule
  ],
  exports: [
    NavigationComponent,
    FooterComponent,
    ChatbotWidgetComponent,
    LucideAngularModule
  ]
})
export class SharedModule {
  constructor() {
  }
}
