import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';



@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})
export class SessionModule { 
  id?:string;
  courseId?: string;
  title?: string;
  description?: string;
  roomName?: string;
  startTime?: string;
  endTime?: string;
  lobbyEnabled?: boolean;
  recordingEnabled?: boolean;
  recordingUrl?: string;
}

export interface CreateSessionDto {
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  lobbyEnabled?: boolean;
  recordingEnabled?: boolean;
}

export interface JoinResponse {
  roomName: string;
  domain?: string;
  jwt: string;
  displayName: string;
  avatarUrl?: string;
}