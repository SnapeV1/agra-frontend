import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';

// Import Jitsi Meet library
declare var JitsiMeetJS: any;

export interface JitsiConfig {
  hosts: {
    domain: string;
    muc: string;
    anonymousdomain?: string;
  };
  bosh?: string;
  serviceUrl?: string;
  clientNode: string;
  focusUserJid: string;
}

export interface JitsiRoom {
  roomName: string;
  connection: any;
  conference: any;
  localTracks: any[];
  remoteTracks: any[];
  isJoined: boolean;
  localDisplayName: string;
}

export interface JitsiParticipant {
  id: string;
  displayName: string;
  isLocal: boolean;
  audioMuted: boolean;
  videoMuted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class JitsiService {
  private readonly API_BASE_URL = 'http://localhost:8080/api';
  
  // Local Jitsi configuration
  private readonly localConfig: JitsiConfig = {
    hosts: {
      domain: 'jitsi.local',
      muc: 'conference.jitsi.local',
      anonymousdomain: 'guest.jitsi.local'
    },
    bosh: 'https://jitsi.local/http-bind',
    serviceUrl: 'wss://jitsi.local/xmpp-websocket',
    clientNode: 'http://jitsi.org/jitsimeet',
    focusUserJid: 'focus@auth.jitsi.local'
  };

  // Fallback configuration (public server)
  private readonly fallbackConfig: JitsiConfig = {
    hosts: {
      domain: 'meet.jit.si',
      muc: 'conference.meet.jit.si',
      anonymousdomain: 'guest.meet.jit.si'
    },
    bosh: 'https://meet.jit.si/http-bind',
    serviceUrl: 'wss://meet.jit.si/xmpp-websocket',
    clientNode: 'http://jitsi.org/jitsimeet',
    focusUserJid: 'focus@auth.meet.jit.si'
  };

  private currentConfig: JitsiConfig = this.localConfig;

  // Authentication handling
  private authMode: 'anonymous' | 'jwt' = 'anonymous';
  private jwtToken?: string;

  // Connection options
  private readonly connectionOptions = {
    openBridgeChannel: true
  };

  // Conference options
  private readonly conferenceOptions = {
    openBridgeChannel: true,
    recordingType: 'jibri',
    p2p: {
      enabled: false
    }
  };

  // Current room state
  private currentRoom: JitsiRoom | null = null;
  
  // Observables for real-time updates
  private connectionStatusSubject = new BehaviorSubject<string>('disconnected');
  private participantsSubject = new BehaviorSubject<JitsiParticipant[]>([]);
  private localTracksSubject = new BehaviorSubject<any[]>([]);
  private remoteTracksSubject = new BehaviorSubject<any[]>([]);
  private chatMessagesSubject = new BehaviorSubject<any[]>([]);
  private recordingStatusSubject = new BehaviorSubject<boolean>(false);
  private sessionDurationSubject = new BehaviorSubject<number>(0);

  // Devices
  private audioInputDevicesSubject = new BehaviorSubject<MediaDeviceInfo[]>([]);
  private videoInputDevicesSubject = new BehaviorSubject<MediaDeviceInfo[]>([]);
  private audioOutputDevicesSubject = new BehaviorSubject<MediaDeviceInfo[]>([]);

  public audioInputDevices$ = this.audioInputDevicesSubject.asObservable();
  public videoInputDevices$ = this.videoInputDevicesSubject.asObservable();
  public audioOutputDevices$ = this.audioOutputDevicesSubject.asObservable();

  // Pre-join preferences
  private preferredMicId: string | null = null;
  private preferredCameraId: string | null = null;
  private preferredAudioOutputId: string | null = null;
  private preJoinEnableAudio: boolean = true;
  private preJoinEnableVideo: boolean = true;

  // Internal timer state for session duration
  private sessionStartMs: number | null = null;
  private sessionTimerSub: Subscription | null = null;

  // Public observables
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public participants$ = this.participantsSubject.asObservable();
  public localTracks$ = this.localTracksSubject.asObservable();
  public remoteTracks$ = this.remoteTracksSubject.asObservable();
  public chatMessages$ = this.chatMessagesSubject.asObservable();
  public recordingStatus$ = this.recordingStatusSubject.asObservable();
  public sessionDuration$ = this.sessionDurationSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeJitsi();
  }

  /**
   * Use token-based authentication (JWT) with Prosody/Jitsi
   */
  public setJwtToken(token: string): void {
    this.authMode = 'jwt';
    this.jwtToken = token;
  }

  /**
   * Use anonymous authentication with guest domain
   */
  public useAnonymousAuth(): void {
    this.authMode = 'anonymous';
    this.jwtToken = undefined;
  }

  /**
   * Initialize Jitsi Meet library
   */
  private initializeJitsi(): void {
    
    // Load Jitsi Meet library if not already loaded
    if (typeof JitsiMeetJS === 'undefined') {
      
      const script = document.createElement('script');
      script.src = 'https://jitsi.local/libs/lib-jitsi-meet.min.js';
      
      script.onload = () => {
        this.setupJitsiMeet();
      };
      
      script.onerror = (error) => {
        
        // Fallback to public server if local fails
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://meet.jit.si/libs/lib-jitsi-meet.min.js';
        
        fallbackScript.onload = () => {
          this.setupJitsiMeet();
        };
        
        fallbackScript.onerror = (fallbackError) => {
          this.connectionStatusSubject.next('library_error');
        };
        
        document.head.appendChild(fallbackScript);
      };
      
      document.head.appendChild(script);
    } else {
      this.setupJitsiMeet();
    }
  }

  /**
   * Setup Jitsi Meet with configuration
   */
  private setupJitsiMeet(): void {
    
    try {
      const initConfig = {
        disableAudioLevels: true,
        disableThirdPartyRequests: true,
        enableAnalyticsLogging: false
      };
      JitsiMeetJS.init(initConfig);
      JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Get room name from backend
   */
  createRoom(): Observable<{roomName: string}> {
    return this.http.get<{roomName: string}>(`${this.API_BASE_URL}/jitsi/create-room`);
  }

  /**
   * Test connectivity to Jitsi server
   */
  private async testConnectivity(config: JitsiConfig): Promise<boolean> {
    try {
      // If there's no BOSH URL defined, skip connectivity test and proceed
      if (!config.bosh) {
        return true;
      }

      const response = await fetch(config.bosh as string, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (error: unknown) {
      return false;
    }
  }

  /**
   * Switch to fallback configuration
   */
  private switchToFallback(): void {
    this.currentConfig = this.fallbackConfig;
  }

  /**
   * Join a Jitsi room
   */
  async joinRoom(roomName: string, displayName: string): Promise<void> {
    const sanitizedRoomName = this.sanitizeRoomName(roomName);
    try {
      this.connectionStatusSubject.next('connecting');
      if (typeof JitsiMeetJS === 'undefined') {
        throw new Error('JitsiMeetJS library is not loaded');
      }

      // Force local configuration for testing
      this.currentConfig = this.localConfig;

      // Choose auth mode: JWT (token) or anonymous (guest domain)
      let connection: any;
      const usingWebsocket = !!this.currentConfig.serviceUrl && this.currentConfig.serviceUrl.startsWith('wss://');
      

      if (this.authMode === 'jwt' && this.jwtToken) {
        // JWT token auth: pass token as the second constructor argument
        connection = new JitsiMeetJS.JitsiConnection(null, this.jwtToken, this.currentConfig);
      } else {
        // Anonymous auth: rely on currentConfig.hosts.anonymousdomain being set correctly
        connection = new JitsiMeetJS.JitsiConnection(null, null, this.currentConfig);
      }
      this.setupConnectionListeners(connection);
      connection.connect();
      await this.waitForConnection(connection);

      const conference = connection.initJitsiConference(sanitizedRoomName, this.conferenceOptions);
      this.setupConferenceListeners(conference);

      let localTracks = await this.createLocalTracks();
      if (localTracks && localTracks.length) {
        localTracks.forEach(track => {
          try { conference.addTrack(track); } catch {}
        });

        // Apply pre-join mute preferences so devices remain available
        try {
          const audioTrack = localTracks.find((t: any) => t.getType() === 'audio');
          if (audioTrack && !this.preJoinEnableAudio && !audioTrack.isMuted()) {
            await audioTrack.mute();
          }
        } catch {}
        try {
          const videoTrack = localTracks.find((t: any) => t.getType() === 'video');
          if (videoTrack && !this.preJoinEnableVideo && !videoTrack.isMuted()) {
            await videoTrack.mute();
          }
        } catch {}
      }

      // Apply preferred audio output device if set
      try {
        if (this.preferredAudioOutputId && JitsiMeetJS && JitsiMeetJS.mediaDevices && typeof JitsiMeetJS.mediaDevices.setAudioOutputDevice === 'function') {
          await JitsiMeetJS.mediaDevices.setAudioOutputDevice(this.preferredAudioOutputId);
        }
      } catch {}

      conference.join();
      try { conference.setDisplayName(displayName); } catch {}

      this.currentRoom = {
        roomName: sanitizedRoomName,
        connection,
        conference,
        localTracks,
        remoteTracks: [],
        isJoined: true,
        localDisplayName: displayName
      };

      this.localTracksSubject.next(localTracks);
      this.connectionStatusSubject.next('connected');
    } catch (error: unknown) {
      this.connectionStatusSubject.next('error');
      throw error;
    }
  }

  /**
   * Leave the current room
   */
  async leaveRoom(): Promise<void> {
    if (!this.currentRoom) return;

    try {
      // Dispose local tracks
      this.currentRoom.localTracks.forEach(track => {
        track.dispose();
      });

      // Leave conference
      if (this.currentRoom.conference) {
        this.currentRoom.conference.leave();
      }

      // Disconnect
      if (this.currentRoom.connection) {
        this.currentRoom.connection.disconnect();
      }

      // Reset state
      this.currentRoom = null;
      this.connectionStatusSubject.next('disconnected');
      // Stop session duration tracking
      if (this.sessionTimerSub) {
        this.sessionTimerSub.unsubscribe();
        this.sessionTimerSub = null;
      }
      this.sessionStartMs = null;
      this.participantsSubject.next([]);
      this.localTracksSubject.next([]);
      this.remoteTracksSubject.next([]);

    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: string): void {
    if (this.currentRoom?.conference) {
      this.currentRoom.conference.sendTextMessage(message);
    }
  }

  /**
   * Toggle audio mute
   */
  toggleAudio(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentRoom) {
        reject('No active room');
        return;
      }

      const audioTrack = this.currentRoom.localTracks.find(track => track.getType() === 'audio');
      if (audioTrack) {
        if (audioTrack.isMuted()) {
          audioTrack.unmute().then(resolve).catch(reject);
        } else {
          audioTrack.mute().then(resolve).catch(reject);
        }
      } else {
        reject('No audio track found');
      }
    });
  }

  /**
   * Toggle video mute
   */
  toggleVideo(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentRoom) {
        reject('No active room');
        return;
      }

      const videoTrack = this.currentRoom.localTracks.find(track => track.getType() === 'video');
      if (videoTrack) {
        if (videoTrack.isMuted()) {
          videoTrack.unmute().then(resolve).catch(reject);
        } else {
          videoTrack.mute().then(resolve).catch(reject);
        }
      } else {
        reject('No video track found');
      }
    });
  }

  /**
   * Start recording
   */
  startRecording(): void {
    if (this.currentRoom?.conference) {
      this.currentRoom.conference.startRecording({
        mode: 'stream'
      });
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (this.currentRoom?.conference) {
      this.currentRoom.conference.stopRecording();
    }
  }

  /**
   * Get current room info
   */
  getCurrentRoom(): JitsiRoom | null {
    return this.currentRoom;
  }

  /**
   * Check if currently in a room
   */
  isInRoom(): boolean {
    return this.currentRoom?.isJoined || false;
  }

  // Private helper methods

  private setupConnectionListeners(connection: any): void {
    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
      // no-op
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, (error: any) => {
      this.connectionStatusSubject.next('error');
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, () => {
      this.connectionStatusSubject.next('disconnected');
    });

    // Add additional connection events for debugging
    connection.addEventListener(JitsiMeetJS.events.connection.WRONG_STATE, (error: any) => {
      // no-op
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DROPPED_ERROR, (error: any) => {
      // no-op
    });
  }

  private setupConferenceListeners(conference: any): void {
    // Conference joined
    conference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
      this.connectionStatusSubject.next('joined');
      // Start session duration tracking on join
      this.sessionStartMs = Date.now();
      this.sessionDurationSubject.next(0);
      if (this.sessionTimerSub) {
        this.sessionTimerSub.unsubscribe();
      }
      this.sessionTimerSub = interval(1000).subscribe(() => {
        if (this.sessionStartMs) {
          const elapsedSec = Math.floor((Date.now() - this.sessionStartMs) / 1000);
          this.sessionDurationSubject.next(elapsedSec);
        }
      });
      // Initialize participants at join
      this.updateParticipants();
    });

    // Conference failed
    conference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (error: any) => {
      try {
        const stringifiedError = this.safeStringify(error);
        void stringifiedError;
      } catch {
        // no-op
      }
      this.connectionStatusSubject.next('error');
    });

    // Conference error
    conference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_ERROR, (error: any) => {
      // no-op
    });

    // Conference left
    conference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_LEFT, () => {
      // Stop session duration tracking
      if (this.sessionTimerSub) {
        this.sessionTimerSub.unsubscribe();
        this.sessionTimerSub = null;
      }
      this.sessionStartMs = null;
      this.connectionStatusSubject.next('disconnected');
      this.updateParticipants();
    });

    // User joined
    conference.addEventListener(JitsiMeetJS.events.conference.USER_JOINED, (id: string) => {
      this.updateParticipants();
    });

    // User left
    conference.addEventListener(JitsiMeetJS.events.conference.USER_LEFT, (id: string) => {
      // Clean up any remote tracks associated with the participant
      try {
        if (this.currentRoom) {
          const remaining = this.currentRoom.remoteTracks.filter((t: any) => {
            try {
              return typeof t.getParticipantId === 'function' ? t.getParticipantId() !== id : true;
            } catch {
              return true;
            }
          });
          this.currentRoom.remoteTracks = remaining;
          this.remoteTracksSubject.next([...remaining]);
        }
      } catch {}
      this.updateParticipants();
    });

    // Remote track added
    conference.addEventListener(JitsiMeetJS.events.conference.TRACK_ADDED, (track: any) => {
      if (track.isLocal()) return;
      
      if (this.currentRoom) {
        this.currentRoom.remoteTracks.push(track);
        this.remoteTracksSubject.next([...this.currentRoom.remoteTracks]);
      }
    });

    // Remote track removed
    conference.addEventListener(JitsiMeetJS.events.conference.TRACK_REMOVED, (track: any) => {
      if (track.isLocal()) return;
      
      if (this.currentRoom) {
        const index = this.currentRoom.remoteTracks.indexOf(track);
        if (index > -1) {
          this.currentRoom.remoteTracks.splice(index, 1);
          this.remoteTracksSubject.next([...this.currentRoom.remoteTracks]);
        }
      }
    });

    // Chat message received
    conference.addEventListener(JitsiMeetJS.events.conference.MESSAGE_RECEIVED, (id: string, text: string, ts: number) => {
      // Attempt to determine local participant id for proper isLocal flag
      let localId: string | null = null;
      try {
        if (typeof conference.getLocalParticipant === 'function') {
          const p = conference.getLocalParticipant();
          if (p && typeof p.getId === 'function') {
            localId = p.getId();
          }
        } else if (typeof conference.myUserId === 'function') {
          localId = conference.myUserId();
        } else if (typeof conference.getMyUserId === 'function') {
          localId = conference.getMyUserId();
        }
      } catch {
        // no-op
      }

      const currentMessages = this.chatMessagesSubject.value;
      const newMessage = {
        id,
        text,
        timestamp: ts,
        isLocal: localId ? id === localId : false
      };
      this.chatMessagesSubject.next([...currentMessages, newMessage]);
    });

    // Recording status changed
    conference.addEventListener(JitsiMeetJS.events.conference.RECORDER_STATE_CHANGED, (status: any) => {
      this.recordingStatusSubject.next(status.status === 'on');
    });

    // Additional debugging events
    conference.addEventListener(JitsiMeetJS.events.conference.KICKED, (participant: any) => {
      // no-op
    });

    conference.addEventListener(JitsiMeetJS.events.conference.LOCK_STATE_CHANGED, (locked: boolean) => {
      // no-op
    });
  }

  /**
   * Sanitize room name to avoid invalid characters/spaces that MUC may reject
   */
  private sanitizeRoomName(name: string): string {
    const trimmed = (name || '').trim();
    // Replace whitespace with dashes and remove non-alphanumeric/underscore/dash
    const replaced = trimmed.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
    // Avoid empty names; fall back to a default for debugging
    return replaced || 'room';
  }

  /**
   * Safely stringify objects that may contain circular references
   */
  private safeStringify(obj: any): string {
    const cache = new Set<any>();
    const result = JSON.stringify(obj, function (_key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);
      }
      return value;
    });
    cache.clear();
    return result;
  }

  private async createLocalTracks(): Promise<any[]> {
    // Refresh available devices and check permissions
    await this.enumerateDevices();
    await this.checkMediaPermissions();

    // Always request both devices so they remain available to unmute in-call
    const requestedDevices: ('audio' | 'video')[] = ['audio', 'video'];

    const baseOptions: any = {
      devices: requestedDevices,
      resolution: 720,
      constraints: {
        video: {
          aspectRatio: 16 / 9,
          height: {
            ideal: 720,
            max: 720,
            min: 240
          }
        }
      }
    };

    // Apply preferred device IDs if set
    if (this.preferredCameraId) {
      baseOptions.cameraDeviceId = this.preferredCameraId;
    }
    if (this.preferredMicId) {
      baseOptions.micDeviceId = this.preferredMicId;
    }

    try {
      const tracks = await JitsiMeetJS.createLocalTracks(baseOptions);
      return tracks;
    } catch (error: unknown) {
      // Fallback strategies
      // Try audio-only
      try {
        const audioTracks = await JitsiMeetJS.createLocalTracks({ devices: ['audio'], micDeviceId: this.preferredMicId || undefined });
        return audioTracks;
      } catch { /* no-op */ }
      // Try video fallbacks
        try {
          const videoTracks = await JitsiMeetJS.createLocalTracks({ devices: ['video'], resolution: 480, constraints: { video: { width: { ideal: 640, max: 640, min: 320 }, height: { ideal: 480, max: 480, min: 240 } } }, cameraDeviceId: this.preferredCameraId || undefined });
          return videoTracks;
        } catch {}
        try {
          const videoTracks = await JitsiMeetJS.createLocalTracks({ devices: ['video'], constraints: { video: true }, cameraDeviceId: this.preferredCameraId || undefined });
          return videoTracks;
        } catch {}
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          const videoTracks = await JitsiMeetJS.createLocalTracks({ devices: ['video'], constraints: { video: true }, cameraDeviceId: this.preferredCameraId || undefined });
          return videoTracks;
        } catch {}
      return [];
    }
  }

  private waitForConnection(connection: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
        clearTimeout(timeout);
        resolve();
      });

      connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private updateParticipants(): void {
    if (!this.currentRoom?.conference) return;

    const participants: JitsiParticipant[] = [];
    
    // Add local participant
    participants.push({
      id: 'local',
      displayName: this.currentRoom.localDisplayName || 'You',
      isLocal: true,
      audioMuted: false, // You can track this based on local tracks
      videoMuted: false
    });

    // Add remote participants
    this.currentRoom.conference.getParticipants().forEach((participant: any) => {
      participants.push({
        id: participant.getId(),
        displayName: participant.getDisplayName() || 'Participant',
        isLocal: false,
        audioMuted: participant.isAudioMuted(),
        videoMuted: participant.isVideoMuted()
      });
    });

    this.participantsSubject.next(participants);
  }

  private async enumerateDevices(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      this.audioInputDevicesSubject.next(audioInputs);
      this.videoInputDevicesSubject.next(videoInputs);
      this.audioOutputDevicesSubject.next(audioOutputs);

      // Default preferences if not set
      if (!this.preferredMicId && audioInputs.length > 0) {
        this.preferredMicId = audioInputs[0].deviceId;
      }
      if (!this.preferredCameraId && videoInputs.length > 0) {
        this.preferredCameraId = videoInputs[0].deviceId;
      }
      if (!this.preferredAudioOutputId && audioOutputs.length > 0) {
        this.preferredAudioOutputId = audioOutputs[0].deviceId;
      }
      
    } catch (error: unknown) {
      // no-op
    }
  }

  // Public helpers for devices and preferences
  public async refreshDevices(): Promise<void> {
    await this.enumerateDevices();
  }

  public setPreferredDevices(opts: { micId?: string | null; cameraId?: string | null; audioOutputId?: string | null }): void {
    if (typeof opts.micId !== 'undefined') this.preferredMicId = opts.micId || null;
    if (typeof opts.cameraId !== 'undefined') this.preferredCameraId = opts.cameraId || null;
    if (typeof opts.audioOutputId !== 'undefined') this.preferredAudioOutputId = opts.audioOutputId || null;
  }

  public setPreJoinPreferences(opts: { enableAudio?: boolean; enableVideo?: boolean }): void {
    if (typeof opts.enableAudio !== 'undefined') this.preJoinEnableAudio = !!opts.enableAudio;
    if (typeof opts.enableVideo !== 'undefined') this.preJoinEnableVideo = !!opts.enableVideo;
  }

  public async setAudioOutputDevice(deviceId: string): Promise<void> {
    this.preferredAudioOutputId = deviceId;
    try {
      if (JitsiMeetJS && JitsiMeetJS.mediaDevices && typeof JitsiMeetJS.mediaDevices.setAudioOutputDevice === 'function') {
        await JitsiMeetJS.mediaDevices.setAudioOutputDevice(deviceId);
      }
    } catch {}
  }

  private async checkMediaPermissions(): Promise<void> {
    try {
      if (!navigator.permissions) {
        return;
      }

      // Check camera permission
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (cameraPermission.state === 'denied') {
          // no-op
        } else if (cameraPermission.state === 'prompt') {
          // no-op
        }
      } catch (permError: unknown) {
        // no-op
      }

      // Check microphone permission
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (micPermission.state === 'denied') {
          // no-op
        } else if (micPermission.state === 'prompt') {
          // no-op
        }
      } catch (permError: unknown) {
        // no-op
      }
      
    } catch (error: unknown) {
      // no-op
    }
  }
}