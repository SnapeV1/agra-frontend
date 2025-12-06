import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CoursesRoutingModule } from './courses-routing.module';
import { CoursesComponent } from './components/courses/courses.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { LucideAngularModule, AlertTriangle, RefreshCw, Search, X, BookOpen, Globe, Users, Clock, Eye, Plus, ArrowLeft, Menu, Maximize, Maximize2, Minimize2, MoreVertical, CheckCircle, Play, ChevronLeft, ChevronRight, FileText, Download, Award, Share2, ExternalLink, Image as ImageIcon, Video, Music, File as FileIcon, PartyPopper } from 'lucide-angular';
import { CourseDetailsComponent } from './components/course-details/course-details.component';
import { CourseEnrolledComponent } from './components/course-enrolled/course-enrolled.component';
import { CertificateComponent } from './components/certificate/certificate.component';
import { SessionListComponent } from './components/sessions/session-list/session-list.component';
import { LiveSessionPlayerComponent } from './components/sessions/live-session-player/live-session-player.component';


@NgModule({
  declarations: [
    CoursesComponent,
    CourseDetailsComponent,
    CourseEnrolledComponent,
    CertificateComponent,
    SessionListComponent,
    LiveSessionPlayerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    CoursesRoutingModule,
    SharedModule,
    LucideAngularModule.pick({
      AlertTriangle,
      RefreshCw,
      Search,
      X,
      BookOpen,
      Globe,
      Users,
      Clock,
      Eye,
      Plus,
      ArrowLeft,
      Menu,
      Maximize,
      Maximize2,
      Minimize2,
      MoreVertical,
      CheckCircle,
      Play,
      ChevronLeft,
      ChevronRight,
      FileText,
      Download,
      Award,
      Share2,
      ExternalLink,
      PartyPopper,
      // Icons used in course-enrolled resources
      Image: ImageIcon,
      Video,
      Music,
      File: FileIcon
    })
  ]
})
export class CoursesModule { }
