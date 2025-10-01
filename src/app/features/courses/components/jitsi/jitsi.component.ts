import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { JitsiService, JitsiParticipant } from 'src/app/core/services/jitsi.service';

@Component({
  selector: 'app-jitsi',
  templateUrl: './jitsi.component.html',
  styleUrls: ['./jitsi.component.css']
})
export class JitsiComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo', { static: false }) localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideos', { static: false }) remoteVideosRef!: ElementRef<HTMLDivElement>;

  // Component state
  roomName: string = '';
  displayName: string = '';
  isJoined: boolean = false;
  isConnecting: boolean = false;
  connectionStatus: string = 'disconnected';
  
  // Media controls
  isAudioMuted: boolean = false;
  isVideoMuted: boolean = false;
  isRecording: boolean = false;

  // Participants and chat
  participants: JitsiParticipant[] = [];
  chatMessages: any[] = [];
  newChatMessage: string = '';
  showChat: boolean = false;

  // Tracks
  localTracks: any[] = [];
  remoteTracks: any[] = [];

  // Video attachment retry counter
  private videoAttachRetryCount: number = 0;
  private readonly MAX_VIDEO_ATTACH_RETRIES: number = 10;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private jitsiService: JitsiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🚀 ngOnInit - Component initializing');
    
    // Get room name from route
    this.route.params.subscribe(params => {
      if (params['roomName']) {
        this.roomName = params['roomName'];
      }
    });

    // Set default display name (you can get this from auth service)
    this.displayName = 'User ' + Math.floor(Math.random() * 1000);

    this.setupSubscriptions();
    console.log('✅ ngOnInit - Component initialized');
  }

  ngAfterViewInit(): void {
    // View is initialized, video elements are ready
    console.log('🎬 ngAfterViewInit - Video elements should be ready');
    console.log('📹 localVideoRef available:', !!this.localVideoRef);
    
    // If we have tracks waiting to be attached, attach them now
    if (this.localTracks.length > 0) {
      console.log('🔄 Retrying local track attachment after view init');
      this.attachLocalTracks();
    }
  }

  ngOnDestroy(): void {
    this.leaveRoom();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions(): void {
    // Connection status
    this.subscriptions.push(
      this.jitsiService.connectionStatus$.subscribe(status => {
        this.connectionStatus = status;
        this.isConnecting = status === 'connecting';
        this.isJoined = status === 'joined';
      })
    );

    // Participants
    this.subscriptions.push(
      this.jitsiService.participants$.subscribe(participants => {
        this.participants = participants;
      })
    );

    // Local tracks
    this.subscriptions.push(
      this.jitsiService.localTracks$.subscribe(tracks => {
        this.localTracks = tracks;
        this.attachLocalTracks();
      })
    );

    // Remote tracks
    this.subscriptions.push(
      this.jitsiService.remoteTracks$.subscribe(tracks => {
        this.remoteTracks = tracks;
        this.attachRemoteTracks();
      })
    );

    // Chat messages
    this.subscriptions.push(
      this.jitsiService.chatMessages$.subscribe(messages => {
        this.chatMessages = messages;
      })
    );

    // Recording status
    this.subscriptions.push(
      this.jitsiService.recordingStatus$.subscribe(isRecording => {
        this.isRecording = isRecording;
      })
    );
  }

  /**
   * Create a new room
   */
  async createRoom(): Promise<void> {
    try {
      const response = await this.jitsiService.createRoom().toPromise();
      if (response) {
        this.roomName = response.roomName;
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  }

  /**
   * Join the room
   */
  async joinRoom(): Promise<void> {
    if (!this.roomName || !this.displayName) {
      alert('Please enter room name and display name');
      return;
    }

    try {
      await this.jitsiService.joinRoom(this.roomName, this.displayName);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    }
  }

  /**
   * Leave the room
   */
  async leaveRoom(): Promise<void> {
    try {
      await this.jitsiService.leaveRoom();
      this.isJoined = false;
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  /**
   * Toggle audio mute
   */
  async toggleAudio(): Promise<void> {
    try {
      await this.jitsiService.toggleAudio();
      this.isAudioMuted = !this.isAudioMuted;
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  }

  /**
   * Toggle video mute
   */
  async toggleVideo(): Promise<void> {
    try {
      await this.jitsiService.toggleVideo();
      this.isVideoMuted = !this.isVideoMuted;
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  }

  /**
   * Toggle recording
   */
  toggleRecording(): void {
    if (this.isRecording) {
      this.jitsiService.stopRecording();
    } else {
      this.jitsiService.startRecording();
    }
  }

  /**
   * Send chat message
   */
  sendChatMessage(): void {
    if (this.newChatMessage.trim()) {
      this.jitsiService.sendChatMessage(this.newChatMessage);
      
      // Add to local chat (for immediate feedback)
      this.chatMessages.push({
        id: 'local',
        text: this.newChatMessage,
        timestamp: Date.now(),
        isLocal: true
      });
      
      this.newChatMessage = '';
    }
  }

  /**
   * Toggle chat panel
   */
  toggleChat(): void {
    this.showChat = !this.showChat;
  }

  /**
   * Attach local tracks to video elements
   */
  private attachLocalTracks(): void {
    console.log('🎬 attachLocalTracks called');
    console.log('📹 localVideoRef exists:', !!this.localVideoRef);
    console.log('📊 localTracks length:', this.localTracks.length);
    console.log('📋 localTracks:', this.localTracks);

    if (!this.localVideoRef) {
      if (this.videoAttachRetryCount < this.MAX_VIDEO_ATTACH_RETRIES) {
        this.videoAttachRetryCount++;
        console.log(`❌ No localVideoRef - video element not ready, will retry in 100ms (attempt ${this.videoAttachRetryCount}/${this.MAX_VIDEO_ATTACH_RETRIES})`);
        // Retry after a short delay to allow Angular to initialize the ViewChild
        setTimeout(() => {
          console.log('🔄 Retrying attachLocalTracks after delay...');
          this.attachLocalTracks();
        }, 100);
      } else {
        console.error('❌ Max retries reached for video attachment. Video element never became available.');
      }
      return;
    }

    if (this.localTracks.length === 0) {
      console.log('❌ No local tracks available');
      return;
    }

    const videoTrack = this.localTracks.find(track => track.getType() === 'video');
    console.log('🎥 Video track found:', !!videoTrack);
    
    if (videoTrack) {
      console.log('🎯 Video track details:', {
        type: videoTrack.getType(),
        deviceId: videoTrack.getDeviceId ? videoTrack.getDeviceId() : 'unknown',
        muted: videoTrack.isMuted ? videoTrack.isMuted() : 'unknown'
      });
      
      console.log('🖥️ Video element details:', {
        tagName: this.localVideoRef.nativeElement.tagName,
        autoplay: this.localVideoRef.nativeElement.autoplay,
        muted: this.localVideoRef.nativeElement.muted,
        srcObject: this.localVideoRef.nativeElement.srcObject
      });

      try {
        console.log('🔗 Attempting to attach video track...');
        videoTrack.attach(this.localVideoRef.nativeElement);
        console.log('✅ Video track attached successfully');
        
        // Reset retry counter on successful attachment
        this.videoAttachRetryCount = 0;
        
        // Make sure video is not muted and playing
        this.localVideoRef.nativeElement.muted = true; // Local video should be muted
        this.localVideoRef.nativeElement.play().catch(e => console.log('Video play failed:', e));
        
        // Additional debugging after attachment
        setTimeout(() => {
          console.log('🔍 Post-attachment video element state:', {
            srcObject: this.localVideoRef.nativeElement.srcObject,
            videoWidth: this.localVideoRef.nativeElement.videoWidth,
            videoHeight: this.localVideoRef.nativeElement.videoHeight,
            readyState: this.localVideoRef.nativeElement.readyState,
            paused: this.localVideoRef.nativeElement.paused
          });
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error attaching video track:', error);
      }
    } else {
      console.log('⚠️ No video track found in local tracks');
      // Show what tracks we do have
      this.localTracks.forEach((track, index) => {
        console.log(`📊 Track ${index}:`, {
          type: track.getType(),
          deviceId: track.getDeviceId ? track.getDeviceId() : 'unknown'
        });
      });
    }
  }

  /**
   * Attach remote tracks to video elements
   */
  private attachRemoteTracks(): void {
    if (!this.remoteVideosRef) return;

    // Clear existing remote videos
    this.remoteVideosRef.nativeElement.innerHTML = '';

    // Group tracks by participant
    const participantTracks: { [key: string]: any[] } = {};
    
    this.remoteTracks.forEach(track => {
      const participantId = track.getParticipantId();
      if (!participantTracks[participantId]) {
        participantTracks[participantId] = [];
      }
      participantTracks[participantId].push(track);
    });

    // Create video elements for each participant
    Object.keys(participantTracks).forEach(participantId => {
      const tracks = participantTracks[participantId];
      const videoTrack = tracks.find(track => track.getType() === 'video');
      const audioTrack = tracks.find(track => track.getType() === 'audio');

      if (videoTrack || audioTrack) {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'remote-participant';
        participantDiv.id = `participant-${participantId}`;

        if (videoTrack) {
          const videoElement = document.createElement('video');
          videoElement.autoplay = true;
          videoElement.className = 'remote-video';
          videoTrack.attach(videoElement);
          participantDiv.appendChild(videoElement);
        }

        if (audioTrack) {
          const audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioTrack.attach(audioElement);
          participantDiv.appendChild(audioElement);
        }

        // Add participant name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'participant-name';
        const participant = this.participants.find(p => p.id === participantId);
        nameDiv.textContent = participant?.displayName || 'Participant';
        participantDiv.appendChild(nameDiv);

        this.remoteVideosRef.nativeElement.appendChild(participantDiv);
      }
    });
  }

  /**
   * Get connection status display text
   */
  getConnectionStatusText(): string {
    switch (this.connectionStatus) {
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'joined': return 'In Meeting';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  }

  /**
   * Get connection status CSS class
   */
  getConnectionStatusClass(): string {
    switch (this.connectionStatus) {
      case 'disconnected': return 'status-disconnected';
      case 'connecting': return 'status-connecting';
      case 'connected': 
      case 'joined': return 'status-connected';
      case 'error': return 'status-error';
      default: return 'status-unknown';
    }
  }
}