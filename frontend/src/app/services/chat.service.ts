// src/app/services/chat.service.ts
import { Injectable, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import {
  BehaviorSubject,
  Observable,
  Subject,
  of,
  from,
  throwError,
  filter,
  take,
} from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntil, catchError, retry, switchMap } from 'rxjs/operators';
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
  text?: string;
  type?: string;
  chat_type?: string;
  files?: Array<{
    file: string;
    type: string;
  }>;
  createdAt: Date;
  profile_image?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();
  private connecting = false;

  // Message-related subjects
  private messageReceived$ = new Subject<ChatMessage>();
  private typingStatus$ = new Subject<any>();
  private activeRoom$ = new BehaviorSubject<string>('');
  private seenStatus$ = new Subject<any>();
  private chatEvents$ = new Subject<any>();
  private unreadCount$ = new BehaviorSubject<number>(0);
  private connectionError$ = new Subject<string>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private auth: AuthService
  ) {
    // Initialize socket if in browser
    if (isPlatformBrowser(this.platformId)) {
      this.setupAuthSubscription();
    }
  }

  private setupAuthSubscription(): void {
    this.auth.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        if (isAuthenticated) {
          this.auth
            .getAccessTokenSilently()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (token) => {
                if (token) this.connect(token);
              },
              error: (err) => {
                console.error('Failed to get auth token:', err);
                this.connectionError$.next('Authentication failed');
              },
            });
        } else if (this.socket) {
          this.disconnect();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  /**
   * Connect to the messaging socket server
   */
  private connect(token: string): void {
    if (!isPlatformBrowser(this.platformId) || this.connecting) return;

    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.connecting = true;

    try {
      // Disconnect any existing socket
      this.disconnect();

      // Connect new socket
      this.socket = io(environment.messagingServiceUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.setupSocketListeners();
    } catch (err) {
      console.error('Socket creation error:', err);
      this.connectionError$.next('Failed to create socket connection');
      this.connecting = false;
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.connected$.next(true);
      this.connecting = false;

      // Rejoin active room if we have one
      const roomId = this.activeRoom$.getValue();
      if (roomId) {
        this.socket?.emit('rejoin', { roomId });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionError$.next(`Connection error: ${error.message}`);
      this.connecting = false;
    });

    // Message events
    this.socket.on('message', (message: ChatMessage) => {
      this.messageReceived$.next(message);
      this.chatEvents$.next({ type: 'messageReceive', data: message });
    });

    // Room events
    this.socket.on('joined-room', (data) => {
      const roomId = typeof data === 'string' ? data : data.roomId;
      const otherUserId = typeof data === 'object' ? data.otherUserId : null;

      this.activeRoom$.next(roomId);
      this.chatEvents$.next({
        type: 'joinedRoom',
        data: { roomId, otherUserId },
      });

      // Get message history
      this.getChatHistory(roomId).subscribe((messages) => {
        this.chatEvents$.next({ type: 'historyLoaded', data: messages });
      });
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

  // Public API methods

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  getConnectionErrors(): Observable<string> {
    return this.connectionError$.asObservable();
  }

  joinRoom(otherUserId: string): void {
    // First check if socket is actually connected
    if (!this.socket?.connected) {
      console.warn('Socket not connected yet, waiting for connection...');

      // Try again when connection is established
      this.connected$
        .pipe(
          filter((connected) => connected),
          take(1)
        )
        .subscribe(() => {
          console.log('Socket now connected, joining room');
          this.joinRoom(otherUserId);
        });
      return;
    }

    // Rest of your joinRoom code
    this.socket.emit('join', { otherUserId });
  }

  sendMessage(text: string): void {
    const roomId = this.activeRoom$.getValue();
    if (!this.socket?.connected || !roomId || !text?.trim()) return;

    this.socket.emit('message', { roomId, text });
  }

  sendTyping(roomId: string, status: 'start' | 'end'): void {
    if (!this.socket?.connected) return;
    this.socket.emit('typing', { roomId, status });
  }

  markSeen(roomId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('seen', { roomId });
  }

  getChatHistory(roomId: string): Observable<ChatMessage[]> {
    if (!this.socket?.connected) return of([]);

    return new Observable((observer) => {
      this.socket?.emit(
        'get-history',
        { roomId },
        (response: ChatMessage[]) => {
          observer.next(response);
          observer.complete();
        }
      );
    });
  }

  // HTTP API methods

  getAllChats(searchQuery?: string): Observable<any> {
    return from(this.auth.getAccessTokenSilently()).pipe(
      catchError(() => of(null)),
      switchMap((token) => {
        if (!token) return of({ status: 401, data: [] });

        const url = `${environment.messagingServiceUrl}/api/chat/list${
          searchQuery ? '?search=' + searchQuery : ''
        }`;

        return this.http
          .get(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(catchError(() => of({ status: 200, data: [] })));
      })
    );
  }

  getChatDetails(roomId: string): Observable<any> {
    return from(this.auth.getAccessTokenSilently()).pipe(
      catchError(() => of(null)),
      switchMap((token) => {
        if (!token)
          return of({ status: 401, data: { chatDetail: {}, chats: [] } });

        const url = `${environment.messagingServiceUrl}/api/chat/chats/${roomId}`;

        return this.http
          .get(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            catchError(() => of({ status: 404, message: 'Chat not found' }))
          );
      })
    );
  }

  getChatRoomDetails(roomId: string): Observable<any> {
    return from(this.auth.getAccessTokenSilently()).pipe(
      catchError(() => of(null)),
      switchMap((token) => {
        if (!token) return of({ status: 401, data: null });

        const url = `${environment.messagingServiceUrl}/api/chat/room/detail/${roomId}`;

        return this.http
          .get(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            catchError(() => of({ status: 404, message: 'Room not found' }))
          );
      })
    );
  }

  getChatRoomFiles(roomId: string, keyword?: string): Observable<any> {
    return from(this.auth.getAccessTokenSilently()).pipe(
      catchError(() => of(null)),
      switchMap((token) => {
        if (!token) return of({ status: 401, data: { files: [], links: [] } });

        const url = keyword
          ? `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}?keyword=${keyword}`
          : `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}`;

        return this.http
          .get(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            catchError(() =>
              of({ status: 200, data: { files: [], links: [] } })
            )
          );
      })
    );
  }

  sendMessageWithFiles(
    roomId: string,
    text: string,
    files: File[]
  ): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return throwError(() => new Error('Not in browser environment'));
    }

    return from(this.auth.getAccessTokenSilently()).pipe(
      catchError(() => throwError(() => new Error('Authentication failed'))),
      switchMap((token) => {
        const formData = new FormData();
        formData.append('room_id', roomId);
        formData.append('text', text || '');

        files.forEach((file) => formData.append('files', file));

        return this.http
          .post(
            `${environment.messagingServiceUrl}/api/chat/attachments`,
            formData,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .pipe(
            catchError((err) =>
              throwError(() => new Error('Failed to send files'))
            )
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

  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected$.next(false);
    }
  }
}
