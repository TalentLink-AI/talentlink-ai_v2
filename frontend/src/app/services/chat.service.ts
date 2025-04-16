// src/app/services/chat.service.ts
import { Injectable, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, Subject, map, switchMap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';

export interface ChatRoom {
  _id: string;
  members: string[];
  last_message_text: string;
  last_message_at: Date;
  unseen_count: Array<{
    user_id: string;
    count: number;
  }>;
  other_member?: Array<{
    _id: string;
    full_name: string;
    profile_image?: string;
    is_online: boolean;
  }>;
}

export interface ChatMessage {
  _id?: string;
  room_id: string;
  from: string;
  from_id?: string;
  text?: string;
  type?: string;
  chat_type?: string;
  files?: Array<{
    file: string;
    type: string;
  }>;
  meta_data?: any;
  createdAt: Date;
  profile_image?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private socket!: Socket;
  private connected$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  // Message-related subjects
  private messageReceived$ = new Subject<ChatMessage>();
  private typingStatus$ = new Subject<any>();
  private activeRoom$ = new BehaviorSubject<string>('');
  private seenStatus$ = new Subject<any>();
  private chatEvents$ = new Subject<any>();
  private unreadCount$ = new BehaviorSubject<number>(0);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private auth: AuthService
  ) {
    // Initialize socket if in browser
    if (isPlatformBrowser(this.platformId)) {
      this.auth.isAuthenticated$
        .pipe(takeUntil(this.destroy$))
        .subscribe((isAuthenticated) => {
          if (isAuthenticated) {
            this.auth.getAccessTokenSilently().subscribe((token) => {
              if (token) {
                this.connect(token);
              }
            });
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  /**
   * Connect to the messaging socket server
   * @param token The Auth0 token for authentication
   */
  connect(token: string): void {
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

    // Configure and connect socket
    this.socket = io(environment.messagingServiceUrl, {
      auth: {
        token, // send token as `socket.handshake.auth.token`
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupSocketListeners();
  }

  private getAuthHeader(): Observable<any> {
    return this.auth.getAccessTokenSilently().pipe(
      map((token) => {
        return {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
      })
    );
  }

  private setupSocketListeners(): void {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to messaging socket:', this.socket.id);
      this.connected$.next(true);

      // Rejoin active room if we have one
      const roomId = this.activeRoom$.getValue();
      if (roomId) {
        this.socket.emit('rejoin', { roomId });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from messaging socket');
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Message events
    this.socket.on('message', (message: ChatMessage) => {
      this.messageReceived$.next(message);
      this.chatEvents$.next({ type: 'messageReceive', data: message });
    });

    // Room events
    this.socket.on('joined-room', (roomId: string) => {
      this.activeRoom$.next(roomId);
      this.chatEvents$.next({ type: 'joinedRoom', data: roomId });
    });

    // Typing events
    this.socket.on('typing', (status: any) => {
      this.typingStatus$.next(status);
      this.chatEvents$.next({ type: 'typing', data: status });
    });

    // Seen events
    this.socket.on('seen', (data: any) => {
      this.seenStatus$.next(data);
      this.chatEvents$.next({ type: 'seen', data });
    });
  }

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  /**
   * Join a chat room with another user
   * @param otherUserId Auth0 ID of the other user
   */
  joinRoom(otherUserId: string): void {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      console.error('Socket not connected. Cannot join room.');
      return;
    }

    this.socket.emit('join', { otherUserId });
  }

  /**
   * Send a message to a room
   * @param roomId Room ID
   * @param text Message text
   */
  sendMessage(text: string): void {
    const roomId = this.activeRoom$.getValue();

    if (!this.socket?.connected || !roomId) {
      console.warn('Socket not connected or room not set');
      return;
    }

    this.socket.emit('message', { roomId, text });
  }

  /**
   * Send typing status
   * @param roomId Room ID
   * @param status 'start' or 'end'
   */
  sendTyping(roomId: string, status: 'start' | 'end'): void {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      return;
    }

    this.socket.emit('typing', { roomId, status });
  }

  /**
   * Mark messages as seen in a room
   * @param roomId Room ID
   */
  markSeen(roomId: string): void {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      return;
    }

    this.socket.emit('seen', { roomId });
  }

  /**
   * Get chat history for a room
   * @param roomId Room ID
   */
  getChatHistory(roomId: string): Observable<ChatMessage[]> {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      console.error('Socket not connected. Cannot get chat history.');
      return new Observable((observer) => observer.next([]));
    }

    return new Observable((observer) => {
      this.socket.emit('get-history', { roomId }, (response: ChatMessage[]) => {
        observer.next(response);
        observer.complete();
      });
    });
  }

  /**
   * Get all user chats
   */
  getUserChats(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      console.error('Socket not connected. Cannot get user chats.');
      return new Observable((observer) => observer.next([]));
    }

    return new Observable((observer) => {
      this.socket.emit('get-user-chats', {}, (response: any) => {
        observer.next(response);
        observer.complete();
      });
    });
  }

  /**
   * Get chat data from HTTP API
   */
  getAllChats(searchQuery?: string): Observable<any> {
    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        return this.http.get(
          `${environment.messagingServiceUrl}/api/chat/list${
            searchQuery ? '?search=' + searchQuery : ''
          }`,
          headers
        );
      })
    );
  }

  getChatDetails(roomId: string): Observable<any> {
    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        return this.http.get(
          `${environment.messagingServiceUrl}/api/chat/chats/${roomId}`,
          headers
        );
      })
    );
  }

  getChatRoomDetails(roomId: string): Observable<any> {
    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        return this.http.get(
          `${environment.messagingServiceUrl}/api/chat/room/detail/${roomId}`,
          headers
        );
      })
    );
  }

  getChatRoomFiles(roomId: string, keyword?: string): Observable<any> {
    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        const url = keyword
          ? `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}?keyword=${keyword}`
          : `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}`;
        return this.http.get(url, headers);
      })
    );
  }

  /**
   * Send a message with file attachments
   * @param roomId Room ID
   * @param text Optional text message
   * @param files Array of files to send
   */
  sendMessageWithFiles(
    roomId: string,
    text: string,
    files: File[]
  ): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable((observer) =>
        observer.error('Not in browser environment')
      );
    }

    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        const formData = new FormData();
        formData.append('room_id', roomId);
        formData.append('text', text || '');

        files.forEach((file) => {
          formData.append('files', file);
        });

        return this.http.post(
          `${environment.messagingServiceUrl}/api/chat/attachments`,
          formData,
          headers
        );
      })
    );
  }

  // Observable getters
  getMessageEvents(): Observable<ChatMessage> {
    return this.messageReceived$.asObservable();
  }

  getTypingEvents(): Observable<any> {
    return this.typingStatus$.asObservable();
  }

  getSeenEvents(): Observable<any> {
    return this.seenStatus$.asObservable();
  }

  getActiveRoom(): Observable<string> {
    return this.activeRoom$.asObservable();
  }

  getAllEvents(): Observable<any> {
    return this.chatEvents$.asObservable();
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  updateUnreadCount(count: number): void {
    this.unreadCount$.next(count);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.connected$.next(false);
    }
  }
}
