// src/app/services/socket.service.ts
import { Injectable, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { UserService } from './user.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private socket!: Socket;
  private connected$ = new BehaviorSubject<boolean>(false);
  private activeRoom$ = new BehaviorSubject<string>('');
  private currentContactId: string = '';

  // Message-related subjects
  private messageSubject = new Subject<any>();
  private typingSubject = new Subject<any>();
  private joinRoomSubject = new Subject<string>();
  private seenSubject = new Subject<any>();
  private chatMessenger = new Subject<any>();

  // User details
  private userDetails: any;
  private imgBaseUrl = environment.apiUrl + '/api/media/';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private userService: UserService,
    private http: HttpClient
  ) {}

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.disconnect();
    }
  }

  /**
   * Connect to the messaging socket server
   * @param token The Auth0 token for authentication
   */
  connect(token: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }

    if (!token || typeof token !== 'string') {
      console.error('❌ Invalid token passed to socket connect:', token);
      return;
    }

    this.socket = io(environment.messagingServiceUrl, {
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('🟢 Connected to messaging socket:', this.socket.id);
      this.connected$.next(true);

      // Get user details after connection
      this.getUserDetails();

      // Rejoin active room if we have one
      const roomContactId = this.getCurrentContact();
      if (roomContactId) {
        console.log(`Rejoining chat with contact: ${roomContactId}`);
        this.joinRoom(roomContactId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Disconnected from messaging socket');
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Setup listeners once we're connected
    this.setupSocketListeners();
  }

  /**
   * Get user details from the server
   */
  private getUserDetails() {
    this.userService.getCurrentUser().subscribe({
      next: (res: any) => {
        if (res) {
          this.userDetails = res.user;
          console.log('User details loaded for socket communication');
        }
      },
      error: (err: any) => {
        console.error('Error fetching user details for socket', err);
      },
    });
  }

  /**
   * Setup all socket event listeners
   */
  private setupSocketListeners() {
    // Room data listener
    this.socket.on('roomData', (data) => {
      this.chatMessenger.next({ type: 'roomData', data });
    });

    // Message listener
    this.socket.on('message', (message) => {
      this.messageSubject.next(message);
      this.chatMessenger.next({ type: 'messageReceive', data: message });
    });

    // Typing status listener
    this.socket.on('typing', (status) => {
      this.typingSubject.next(status);
      this.chatMessenger.next({ type: 'typingStatus', data: status });
    });

    // Room joined listener
    this.socket.on('joined-room', (roomId) => {
      this.activeRoom$.next(roomId);
      this.joinRoomSubject.next(roomId);
    });

    // New message notification listener
    this.socket.on(`${this.userDetails?._id}newMsg`, (data) => {
      this.chatMessenger.next({ type: 'IncomingMessage', data });
    });

    // Typing notification listener
    this.socket.on(`${this.userDetails?._id}Typing`, (data) => {
      this.chatMessenger.next({ type: 'IncomingTyping', data });
    });

    // Reaction listener
    this.socket.on('reaction', (data) => {
      this.chatMessenger.next({ type: 'reactionStatus', data });
    });

    // Seen status listener
    this.socket.on('seen', (data) => {
      this.seenSubject.next(data);
      this.chatMessenger.next({ type: 'seenEvent', data });
    });

    // New chat notification
    this.socket.on(`${this.userDetails?._id}NewChat`, (data) => {
      this.chatMessenger.next({ type: 'ChatCountReload', data });
    });

    // New notification listener
    this.socket.on(`${this.userDetails?._id}NewNotification`, (data) => {
      this.chatMessenger.next({ type: 'NotificationCountReload', data });
    });

    // General notification listener
    this.socket.on(`notify${this.userDetails?._id}`, (data) => {
      this.chatMessenger.next({ type: 'Notification', data });
    });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  /**
   * Get the current active room
   */
  getActiveRoom(): Observable<string> {
    return this.activeRoom$.asObservable();
  }

  /**
   * Get all events from the chat messenger
   */
  getChatEvents(): Observable<any> {
    return this.chatMessenger.asObservable();
  }

  /**
   * Set current contact for auto-reconnection
   */
  setChatContact(contactId: string) {
    this.currentContactId = contactId;
    localStorage.setItem('talentlink_current_chat_contact', contactId);
  }

  /**
   * Get current contact for auto-reconnection
   */
  getCurrentContact(): string {
    if (this.currentContactId) {
      return this.currentContactId;
    }

    // Try to get from localStorage as fallback
    const storedContact = localStorage.getItem(
      'talentlink_current_chat_contact'
    );
    return storedContact || '';
  }

  /**
   * Join a chat room with another user
   * @param otherUserId The user ID to chat with
   */
  joinRoom(otherUserId: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected. Cannot join room.');
      return;
    }

    // Remember this contact for reconnections
    this.setChatContact(otherUserId);

    this.socket.emit('join', { otherUserId });
    console.log(`Attempting to join room with ${otherUserId}`);
  }

  /**
   * Observable for room join events
   */
  onJoinRoom(): Observable<string> {
    return this.joinRoomSubject.asObservable();
  }

  /**
   * Send a message to a room
   * @param roomId The room ID
   * @param text The message text
   */
  sendMessage(roomId: string, text: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected. Cannot send message.');
      return;
    }

    this.socket.emit('message', { roomId, text });
  }

  /**
   * Send a message with files
   * @param data Message data including room and text
   * @param files Array of files to send
   */
  sendMessageWithFiles(data: any, files: File[]) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const formData = new FormData();
    formData.append('room_id', data.room);
    formData.append('text', data.text || '');

    files.forEach((file, index) => {
      formData.append('files', file);
    });

    return this.http.post(
      `${environment.messagingServiceUrl}/api/chat/attachments`,
      formData
    );
  }

  /**
   * Observable for message events
   */
  onMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  /**
   * Send typing status
   * @param roomId The room ID
   * @param status Typing status ('start' or 'end')
   */
  sendTyping(roomId: string, status: 'start' | 'end') {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.socket || !this.socket.connected) {
      return;
    }
    this.socket.emit('typing', { roomId, status });
  }

  /**
   * Observable for typing events
   */
  onTyping(): Observable<any> {
    return this.typingSubject.asObservable();
  }

  /**
   * Mark messages as seen
   * @param roomId The room ID
   */
  markSeen(roomId: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.socket || !this.socket.connected) {
      return;
    }
    this.socket.emit('seen', { roomId });
  }

  /**
   * Observable for seen events
   */
  onSeen(): Observable<any> {
    return this.seenSubject.asObservable();
  }

  /**
   * Send message reaction
   * @param data Reaction data
   */
  sendReaction(data: any) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('reaction', data);
  }

  /**
   * Get chat history for a room
   * @param roomId The room ID
   */
  getChatHistory(roomId: string): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable((observer) => observer.next([]));
    }

    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected. Cannot get chat history.');
      return new Observable((observer) => observer.next([]));
    }

    return new Observable((observer) => {
      this.socket.emit('get-history', { roomId }, (response: any) => {
        observer.next(response);
        observer.complete();
      });
    });
  }

  /**
   * Get all chats for the current user
   */
  getAllChats(searchQuery?: string): Observable<any> {
    const data = {
      search: searchQuery || '',
    };

    return this.http.post(
      `${environment.messagingServiceUrl}/api/chat/list`,
      data
    );
  }

  /**
   * Get chat details for a specific room
   * @param roomId The room ID
   */
  getChatDetails(roomId: string): Observable<any> {
    return this.http.get(
      `${environment.messagingServiceUrl}/api/chat/chats/${roomId}`
    );
  }

  /**
   * Get chat room details
   * @param roomId The room ID
   */
  getChatRoomDetails(roomId: string): Observable<any> {
    return this.http.get(
      `${environment.messagingServiceUrl}/api/chat/room/detail/${roomId}`
    );
  }

  /**
   * Get files for a chat room
   * @param roomId The room ID
   * @param searchQuery Optional search query
   */
  getChatRoomFiles(roomId: string, searchQuery?: string): Observable<any> {
    const url = searchQuery
      ? `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}?keyword=${searchQuery}`
      : `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}`;

    return this.http.get(url);
  }

  /**
   * Search messages in a room
   * @param roomId The room ID
   * @param keyword Search keyword
   */
  searchMessages(roomId: string, keyword: string): Observable<any> {
    return this.http.post(
      `${environment.messagingServiceUrl}/api/chat/search`,
      {
        room_id: roomId,
        keyword,
      }
    );
  }

  /**
   * User logout handler
   */
  onUserLogOut() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit('loggedOut');
    }
  }

  /**
   * Disconnect from the socket
   */
  disconnect() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.connected$.next(false);
      this.activeRoom$.next('');
    }
  }
}
