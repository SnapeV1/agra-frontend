import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

// Import Jitsi Meet library
declare var JitsiMeetJS: any;

export interface JitsiConfig {
  hosts: {
    domain: string;
    muc: string;
  };
  bosh: string;
  serviceUrl: string;
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
      muc: 'conference.jitsi.local'
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
      muc: 'conference.meet.jit.si'
    },
    bosh: 'https://meet.jit.si/http-bind',
    serviceUrl: 'wss://meet.jit.si/xmpp-websocket',
    clientNode: 'http://jitsi.org/jitsimeet',
    focusUserJid: 'focus@auth.meet.jit.si'
  };

  private currentConfig: JitsiConfig = this.localConfig;

  // Connection options
  private readonly connectionOptions = {
    openBridgeChannel: true
  };

  // Conference options
  private readonly conferenceOptions = {
    openBridgeChannel: true,
    recordingType: 'jibri'
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

  // Public observables
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public participants$ = this.participantsSubject.asObservable();
  public localTracks$ = this.localTracksSubject.asObservable();
  public remoteTracks$ = this.remoteTracksSubject.asObservable();
  public chatMessages$ = this.chatMessagesSubject.asObservable();
  public recordingStatus$ = this.recordingStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeJitsi();
  }

  /**
   * Initialize Jitsi Meet library
   */
  private initializeJitsi(): void {
    console.log('=== JITSI INITIALIZATION DEBUG START ===');
    console.log('Checking JitsiMeetJS availability...');
    
    // Load Jitsi Meet library if not already loaded
    if (typeof JitsiMeetJS === 'undefined') {
      console.log('JitsiMeetJS not found, loading library...');
      console.log('Attempting to load from local server: https://jitsi.local/libs/lib-jitsi-meet.min.js');
      
      const script = document.createElement('script');
      script.src = 'https://jitsi.local/libs/lib-jitsi-meet.min.js';
      
      script.onload = () => {
        console.log('✓ Successfully loaded Jitsi library from local server');
        console.log('JitsiMeetJS type:', typeof JitsiMeetJS);
        console.log('JitsiMeetJS version:', JitsiMeetJS?.version || 'Unknown');
        this.setupJitsiMeet();
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load Jitsi library from local server');
        console.error('Local library load error:', error);
        console.log('Attempting fallback to public server: https://meet.jit.si/libs/lib-jitsi-meet.min.js');
        
        // Fallback to public server if local fails
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://meet.jit.si/libs/lib-jitsi-meet.min.js';
        
        fallbackScript.onload = () => {
          console.log('✓ Successfully loaded Jitsi library from public server (fallback)');
          console.log('JitsiMeetJS type:', typeof JitsiMeetJS);
          console.log('JitsiMeetJS version:', JitsiMeetJS?.version || 'Unknown');
          this.setupJitsiMeet();
        };
        
        fallbackScript.onerror = (fallbackError) => {
          console.error('❌ Failed to load Jitsi library from both local and public servers');
          console.error('Fallback library load error:', fallbackError);
          console.error('=== CRITICAL ERROR: Cannot load Jitsi library ===');
          this.connectionStatusSubject.next('library_error');
        };
        
        document.head.appendChild(fallbackScript);
      };
      
      document.head.appendChild(script);
    } else {
      console.log('✓ JitsiMeetJS already available');
      console.log('JitsiMeetJS type:', typeof JitsiMeetJS);
      console.log('JitsiMeetJS version:', JitsiMeetJS?.version || 'Unknown');
      this.setupJitsiMeet();
    }
  }

  /**
   * Setup Jitsi Meet with configuration
   */
  private setupJitsiMeet(): void {
    console.log('=== JITSI SETUP DEBUG START ===');
    console.log('Setting up JitsiMeetJS...');
    
    try {
      console.log('Available JitsiMeetJS properties:', Object.keys(JitsiMeetJS || {}));
      console.log('Available events:', Object.keys(JitsiMeetJS?.events || {}));
      console.log('Available log levels:', JitsiMeetJS?.logLevels || 'Not available');
      
      const initConfig = {
        disableAudioLevels: true,
        disableThirdPartyRequests: true,
        enableAnalyticsLogging: false
      };
      
      console.log('Initializing JitsiMeetJS with config:', initConfig);
      JitsiMeetJS.init(initConfig);
      console.log('✓ JitsiMeetJS.init() completed successfully');

      console.log('Setting log level to ERROR...');
      JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
      console.log('✓ Log level set successfully');
      
      console.log('=== JITSI SETUP DEBUG END (SUCCESS) ===');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown setup error';
      console.error('❌ Error during JitsiMeetJS setup:', error);
      console.error('Setup error message:', errorMessage);
      console.error('=== JITSI SETUP DEBUG END (FAILED) ===');
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
      const response = await fetch(config.bosh, { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (error: unknown) {
      console.warn('Connectivity test failed for:', config.hosts.domain, error);
      return false;
    }
  }

  /**
   * Switch to fallback configuration
   */
  private switchToFallback(): void {
    console.log('Switching to fallback configuration (public Jitsi server)');
    this.currentConfig = this.fallbackConfig;
  }

  /**
   * Join a Jitsi room
   */
  async joinRoom(roomName: string, displayName: string): Promise<void> {
    console.log('=== JITSI JOIN ROOM DEBUG START ===');
    console.log('Room Name:', roomName);
    console.log('Display Name:', displayName);
    console.log('Current Config:', JSON.stringify(this.currentConfig, null, 2));
    console.log('JitsiMeetJS available:', typeof JitsiMeetJS !== 'undefined');
    
    if (typeof JitsiMeetJS !== 'undefined') {
      console.log('JitsiMeetJS version:', JitsiMeetJS.version);
      console.log('JitsiMeetJS events:', Object.keys(JitsiMeetJS.events || {}));
    }

    try {
      console.log('STEP 1: Setting connection status to connecting...');
      this.connectionStatusSubject.next('connecting');

      // Check if JitsiMeetJS is available
      console.log('STEP 2: Checking JitsiMeetJS availability...');
      if (typeof JitsiMeetJS === 'undefined') {
        console.error('ERROR: JitsiMeetJS library is not loaded');
        throw new Error('JitsiMeetJS library is not loaded');
      }
      console.log('✓ JitsiMeetJS is available');

      // Test connectivity first
      console.log('STEP 3: Testing connectivity to server...');
      const isConnectable = await this.testConnectivity(this.currentConfig);
      console.log('Connectivity test result:', isConnectable);

      // Create connection
      console.log('STEP 4: Creating Jitsi connection...');
      console.log('Connection options:', this.connectionOptions);
      
      let connection;
      try {
        connection = new JitsiMeetJS.JitsiConnection(null, null, this.currentConfig);
        console.log('✓ Connection object created successfully');
        console.log('Connection state:', connection.getConnectionState ? connection.getConnectionState() : 'unknown');
      } catch (connError: unknown) {
        console.error('ERROR: Failed to create connection object:', connError);
        throw connError;
      }
      
      // Setup connection event listeners
      console.log('STEP 5: Setting up connection event listeners...');
      this.setupConnectionListeners(connection);
      console.log('✓ Connection listeners set up');

      // Connect
      console.log('STEP 6: Initiating connection to Jitsi server...');
      console.log('Connecting to:', this.currentConfig.hosts.domain);
      console.log('BOSH URL:', this.currentConfig.bosh);
      console.log('WebSocket URL:', this.currentConfig.serviceUrl);
      
      try {
        connection.connect();
        console.log('✓ Connection.connect() called successfully');
      } catch (connectError: unknown) {
        console.error('ERROR: connection.connect() failed:', connectError);
        throw connectError;
      }

      // Wait for connection to be established
      console.log('STEP 7: Waiting for connection to be established...');
      try {
        await this.waitForConnection(connection);
        console.log('✓ Connection established successfully');
      } catch (waitError: unknown) {
        console.error('ERROR: Connection establishment failed:', waitError);
        throw waitError;
      }

      // Create and join conference
      console.log('STEP 8: Creating conference...');
      console.log('Conference options:', this.conferenceOptions);
      
      let conference: any;
      try {
        conference = connection.initJitsiConference(roomName, this.conferenceOptions);
        console.log('✓ Conference object created successfully');
      } catch (confError: unknown) {
        console.error('ERROR: Failed to create conference:', confError);
        throw confError;
      }
      
      console.log('STEP 9: Setting up conference event listeners...');
      this.setupConferenceListeners(conference);
      console.log('✓ Conference listeners set up');

      // Get local tracks (audio and video)
      console.log('STEP 10: Creating local tracks...');
      let localTracks;
      try {
        localTracks = await this.createLocalTracks();
        console.log('✓ Local tracks created successfully:', localTracks.length);
        localTracks.forEach((track, index) => {
          console.log(`Track ${index}:`, {
            type: track.getType(),
            deviceId: track.getDeviceId(),
            muted: track.isMuted()
          });
        });
      } catch (trackError: unknown) {
        console.error('ERROR: Failed to create local tracks:', trackError);
        // Continue without local tracks for debugging
        localTracks = [];
        console.log('Continuing without local tracks for debugging...');
      }

      // Add local tracks to conference
      console.log('STEP 11: Adding local tracks to conference...');
      if (localTracks.length > 0) {
        localTracks.forEach((track, index) => {
          try {
            console.log(`Adding track ${index} (${track.getType()}) to conference...`);
            conference.addTrack(track);
            console.log(`✓ Track ${index} added successfully`);
          } catch (trackAddError: unknown) {
            console.error(`ERROR: Failed to add track ${index}:`, trackAddError);
          }
        });
      } else {
        console.log('No local tracks to add to conference');
      }

      // Join the conference
      console.log('STEP 12: Joining conference...');
      try {
        conference.join();
        console.log('✓ Conference.join() called successfully');
      } catch (joinError: unknown) {
        console.error('ERROR: conference.join() failed:', joinError);
        throw joinError;
      }

      // Set display name
      console.log('STEP 13: Setting display name...');
      try {
        conference.setDisplayName(displayName);
        console.log('✓ Display name set successfully:', displayName);
      } catch (nameError: unknown) {
        console.error('ERROR: Failed to set display name:', nameError);
        // Continue anyway, this is not critical
      }

      // Update current room state
      console.log('STEP 14: Updating room state...');
      this.currentRoom = {
        roomName,
        connection,
        conference,
        localTracks,
        remoteTracks: [],
        isJoined: true
      };

      console.log('📡 Emitting localTracks to component:', localTracks.length, 'tracks');
      localTracks.forEach((track, index) => {
        console.log(`📊 Track ${index} being emitted:`, {
          type: track.getType(),
          deviceId: track.getDeviceId ? track.getDeviceId() : 'unknown',
          muted: track.isMuted ? track.isMuted() : 'unknown'
        });
      });
      
      this.localTracksSubject.next(localTracks);
      this.connectionStatusSubject.next('connected');
      console.log('✓ Successfully joined room:', roomName);
      console.log('=== JITSI JOIN ROOM DEBUG END (SUCCESS) ===');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('=== JITSI JOIN ROOM ERROR ===');
      console.error('Error joining room:', error);
      console.error('Error details:', {
        message: errorMessage,
        stack: errorStack,
        config: this.currentConfig,
        currentConfigType: this.currentConfig === this.localConfig ? 'local' : 'fallback'
      });

      // If using local config and it fails, try fallback
      if (this.currentConfig === this.localConfig) {
        console.log('=== ATTEMPTING FALLBACK TO PUBLIC SERVER ===');
        console.log('Local server failed, switching to public server...');
        this.switchToFallback();
        
        try {
          // Retry with fallback configuration
          console.log('Retrying with fallback configuration...');
          return await this.joinRoom(roomName, displayName);
        } catch (fallbackError: unknown) {
          const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
          console.error('=== FALLBACK ALSO FAILED ===');
          console.error('Fallback error:', fallbackError);
          console.error('Fallback error message:', fallbackErrorMessage);
          this.connectionStatusSubject.next('error');
          throw new Error(`Failed to connect to both local and public Jitsi servers. Local error: ${errorMessage}, Fallback error: ${fallbackErrorMessage}`);
        }
      } else {
        console.error('=== FALLBACK SERVER FAILED ===');
        this.connectionStatusSubject.next('error');
        throw error;
      }
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
      this.participantsSubject.next([]);
      this.localTracksSubject.next([]);
      this.remoteTracksSubject.next([]);

    } catch (error: unknown) {
      console.error('Error leaving room:', error);
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
    console.log('Setting up connection event listeners...');

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
      console.log('🟢 CONNECTION_ESTABLISHED: Connection successfully established');
      console.log('Connection details:', {
        readyState: connection.xmpp?.connection?.readyState,
        connected: connection.xmpp?.connection?.connected,
        authenticated: connection.xmpp?.connection?.authenticated
      });
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, (error: any) => {
      console.error('🔴 CONNECTION_FAILED: Connection failed');
      console.error('Connection failure details:', {
        error: error,
        errorType: typeof error,
        errorMessage: error?.message || 'No error message',
        errorCode: error?.code || 'No error code',
        config: this.currentConfig,
        connectionState: connection.xmpp?.connection?.readyState
      });
      this.connectionStatusSubject.next('error');
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, () => {
      console.log('🟡 CONNECTION_DISCONNECTED: Connection disconnected');
      console.log('Disconnection details:', {
        readyState: connection.xmpp?.connection?.readyState,
        connected: connection.xmpp?.connection?.connected
      });
      this.connectionStatusSubject.next('disconnected');
    });

    // Add additional connection events for debugging
    connection.addEventListener(JitsiMeetJS.events.connection.WRONG_STATE, (error: any) => {
      console.error('🔴 WRONG_STATE: Connection in wrong state', error);
    });

    connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DROPPED_ERROR, (error: any) => {
      console.error('🔴 CONNECTION_DROPPED_ERROR: Connection dropped', error);
    });

    console.log('✓ Connection event listeners set up successfully');
  }

  private setupConferenceListeners(conference: any): void {
    console.log('Setting up conference event listeners...');

    // Conference joined
    conference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
      console.log('🟢 CONFERENCE_JOINED: Successfully joined conference');
      console.log('Conference details:', {
        roomName: conference.room,
        participantCount: conference.getParticipantCount(),
        localId: conference.myUserId()
      });
      this.connectionStatusSubject.next('joined');
    });

    // Conference failed
    conference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (error: any) => {
      console.error('🔴 CONFERENCE_FAILED: Failed to join conference');
      console.error('Conference failure details:', {
        error: error,
        errorType: typeof error,
        errorMessage: error?.message || 'No error message',
        errorCode: error?.code || 'No error code',
        roomName: conference.room,
        config: this.currentConfig
      });
      this.connectionStatusSubject.next('error');
    });

    // Conference error
    conference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_ERROR, (error: any) => {
      console.error('🔴 CONFERENCE_ERROR: Conference error occurred');
      console.error('Conference error details:', error);
    });

    // User joined
    conference.addEventListener(JitsiMeetJS.events.conference.USER_JOINED, (id: string) => {
      console.log('👤 USER_JOINED:', id);
      console.log('Participant count:', conference.getParticipantCount());
      this.updateParticipants();
    });

    // User left
    conference.addEventListener(JitsiMeetJS.events.conference.USER_LEFT, (id: string) => {
      console.log('👤 USER_LEFT:', id);
      console.log('Participant count:', conference.getParticipantCount());
      this.updateParticipants();
    });

    // Remote track added
    conference.addEventListener(JitsiMeetJS.events.conference.TRACK_ADDED, (track: any) => {
      if (track.isLocal()) return;

      console.log('🎥 TRACK_ADDED: Remote track added');
      console.log('Track details:', {
        type: track.getType(),
        participantId: track.getParticipantId(),
        muted: track.isMuted(),
        videoType: track.videoType
      });
      
      if (this.currentRoom) {
        this.currentRoom.remoteTracks.push(track);
        this.remoteTracksSubject.next([...this.currentRoom.remoteTracks]);
      }
    });

    // Remote track removed
    conference.addEventListener(JitsiMeetJS.events.conference.TRACK_REMOVED, (track: any) => {
      if (track.isLocal()) return;

      console.log('🎥 TRACK_REMOVED: Remote track removed');
      console.log('Track details:', {
        type: track.getType(),
        participantId: track.getParticipantId()
      });
      
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
      console.log('💬 MESSAGE_RECEIVED from:', id);
      const currentMessages = this.chatMessagesSubject.value;
      const newMessage = {
        id,
        text,
        timestamp: ts,
        isLocal: false
      };
      this.chatMessagesSubject.next([...currentMessages, newMessage]);
    });

    // Recording status changed
    conference.addEventListener(JitsiMeetJS.events.conference.RECORDER_STATE_CHANGED, (status: any) => {
      console.log('🔴 RECORDER_STATE_CHANGED:', status);
      this.recordingStatusSubject.next(status.status === 'on');
    });

    // Additional debugging events
    conference.addEventListener(JitsiMeetJS.events.conference.KICKED, (participant: any) => {
      console.log('🚫 KICKED: Participant was kicked', participant);
    });

    conference.addEventListener(JitsiMeetJS.events.conference.LOCK_STATE_CHANGED, (locked: boolean) => {
      console.log('🔒 LOCK_STATE_CHANGED:', locked);
    });

    console.log('✓ Conference event listeners set up successfully');
  }

  private async createLocalTracks(): Promise<any[]> {
    console.log('Creating local tracks...');
    
    // First, enumerate available devices
    await this.enumerateDevices();
    
    // Check browser permissions
    await this.checkMediaPermissions();
    
    // First, try to get both audio and video
    try {
      console.log('Attempting to create audio and video tracks...');
      const tracks = await JitsiMeetJS.createLocalTracks({
        devices: ['audio', 'video'],
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
      });
      console.log('✓ Successfully created both audio and video tracks');
      return tracks;
    } catch (error: unknown) {
      console.warn('Failed to create both audio and video tracks:', error);
      
      // Try audio only
      try {
        console.log('Attempting to create audio track only...');
        const audioTracks = await JitsiMeetJS.createLocalTracks({
          devices: ['audio']
        });
        console.log('✓ Successfully created audio track only');
        return audioTracks;
      } catch (audioError: unknown) {
        console.warn('Failed to create audio track:', audioError);
        
        // Try video only with multiple fallback strategies
        try {
          console.log('Attempting to create video track only...');
          
          // Try with high quality first
          try {
            const videoTracks = await JitsiMeetJS.createLocalTracks({
              devices: ['video'],
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
            });
            console.log('✓ Successfully created high-quality video track');
            return videoTracks;
          } catch (highQualityError: unknown) {
            console.warn('High-quality video failed, trying medium quality:', highQualityError);
            
            // Try with medium quality
            try {
              const videoTracks = await JitsiMeetJS.createLocalTracks({
                devices: ['video'],
                resolution: 480,
                constraints: {
                  video: {
                    width: { ideal: 640, max: 640, min: 320 },
                    height: { ideal: 480, max: 480, min: 240 }
                  }
                }
              });
              console.log('✓ Successfully created medium-quality video track');
              return videoTracks;
            } catch (mediumQualityError: unknown) {
              console.warn('Medium-quality video failed, trying basic quality:', mediumQualityError);
              
              // Try with basic quality and minimal constraints
              try {
                const videoTracks = await JitsiMeetJS.createLocalTracks({
                  devices: ['video'],
                  constraints: {
                    video: true  // Use browser defaults
                  }
                });
                console.log('✓ Successfully created basic video track');
                return videoTracks;
              } catch (basicVideoError: unknown) {
                console.warn('Basic video failed, trying to request permissions first:', basicVideoError);
                
                // Try to explicitly request permissions first
                try {
                  console.log('Requesting camera permission explicitly...');
                  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                  
                  // Stop the stream immediately, we just wanted to trigger permission
                  stream.getTracks().forEach(track => track.stop());
                  console.log('✓ Camera permission granted, retrying video track creation...');
                  
                  // Now try creating the track again
                  const videoTracks = await JitsiMeetJS.createLocalTracks({
                    devices: ['video'],
                    constraints: {
                      video: true
                    }
                  });
                  console.log('✓ Successfully created video track after permission request');
                  return videoTracks;
                } catch (permissionError: unknown) {
                  console.error('❌ Failed to get camera permission or create video track:', permissionError);
                  console.log('No local tracks available - continuing without media devices');
                  return [];
                }
              }
            }
          }
        } catch (videoError: unknown) {
          console.warn('Failed to create video track:', videoError);
          console.log('No local tracks available - continuing without media devices');
          return [];
        }
      }
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
      displayName: this.currentRoom.conference.getDisplayName() || 'You',
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
      console.log('🔍 Enumerating available media devices...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('⚠️ MediaDevices API not supported');
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log(`📱 Found ${devices.length} total devices:`);
      
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      console.log(`🎤 Audio inputs: ${audioInputs.length}`);
      audioInputs.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.label || 'Unknown Audio Device'} (${device.deviceId})`);
      });
      
      console.log(`📹 Video inputs: ${videoInputs.length}`);
      videoInputs.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.label || 'Unknown Camera'} (${device.deviceId})`);
      });
      
      console.log(`🔊 Audio outputs: ${audioOutputs.length}`);
      audioOutputs.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.label || 'Unknown Speaker'} (${device.deviceId})`);
      });

      if (videoInputs.length === 0) {
        console.warn('⚠️ No video input devices found! Please check:');
        console.warn('   - Camera is connected and recognized by the system');
        console.warn('   - Camera drivers are installed');
        console.warn('   - Camera is not being used by another application');
      }
      
    } catch (error: unknown) {
      console.error('❌ Failed to enumerate devices:', error);
    }
  }

  private async checkMediaPermissions(): Promise<void> {
    try {
      console.log('🔐 Checking media permissions...');
      
      if (!navigator.permissions) {
        console.warn('⚠️ Permissions API not supported');
        return;
      }

      // Check camera permission
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log(`📹 Camera permission: ${cameraPermission.state}`);
        
        if (cameraPermission.state === 'denied') {
          console.warn('❌ Camera permission is DENIED. Please enable camera access in browser settings.');
        } else if (cameraPermission.state === 'prompt') {
          console.log('❓ Camera permission will be requested when accessing camera.');
        }
      } catch (permError: unknown) {
        console.warn('Could not check camera permission:', permError);
      }

      // Check microphone permission
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log(`🎤 Microphone permission: ${micPermission.state}`);
        
        if (micPermission.state === 'denied') {
          console.warn('❌ Microphone permission is DENIED. Please enable microphone access in browser settings.');
        } else if (micPermission.state === 'prompt') {
          console.log('❓ Microphone permission will be requested when accessing microphone.');
        }
      } catch (permError: unknown) {
        console.warn('Could not check microphone permission:', permError);
      }
      
    } catch (error: unknown) {
      console.error('❌ Failed to check permissions:', error);
    }
  }
}