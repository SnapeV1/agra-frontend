import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoutingModule } from './user-routing.module';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule } from '@angular/forms';

import { LucideAngularModule, Mail, Phone, Calendar, MapPin, BarChart2, User, Globe, Briefcase, Camera, Save, X, Book, Star, BookOpen, Clock, Trophy, Play, CheckCircle, BarChart3, Check, Plus, Award, ArrowRight, Loader2 } from 'lucide-angular';

@NgModule({
  declarations: [
    UserProfileComponent
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    SharedModule,
    FormsModule,

    LucideAngularModule.pick({
      Mail,
      Phone,
      Calendar,
      MapPin,
      BarChart2,
      User,
      Globe,
      Briefcase,
      Camera,
      Save,
      X,
      Book,
      Star,
      BookOpen,
      Clock,
      Trophy,
      Play,
      CheckCircle,
      BarChart3,
      Check,
      Plus,
      Award,
      ArrowRight,
      Loader2
    })]
})
export class UserModule { }


