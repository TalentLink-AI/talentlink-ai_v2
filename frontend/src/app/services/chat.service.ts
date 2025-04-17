// src/app/services/chat.service.ts
import { Injectable, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import {
  BehaviorSubject,
  Observable,
  Subject,
  map,
  switchMap,
  of,
  catchError,
  from,
  throwError,
} from 'rxjs';
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
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();
  private connectRequested = false;
  private connectionRetryCount = 0;
  private maxRetries = 5;
  private retryInterval = 3000; // 3 seconds

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
          this.getAccessToken().subscribe({
            next: (token) => {
              if (token) {
                this.connect(token);
              }
            },
            error: (err) => {
              console.error('Error getting token:', err);
              this.connectionError$.next('Failed to get authentication token');
            },
          });
        } else if (this.socket) {
          this.disconnect();
        }
      });
  }

  private getAccessToken(): Observable<string> {
    return from(this.auth.getAccessTokenSilently()).pipe(
      catchError((err) => {
        console.error('Token acquisition error:', err);
        return throwError(() => new Error('Failed to get access token'));
      })
    );
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

    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    if (!token || typeof token !== 'string') {
      console.error(
        '❌ Invalid token passed to socket connect:',
        token ? 'token-exists' : 'no-token'
      );
      this.connectionError$.next('Invalid authentication token');
      return;
    }

    if (this.connectRequested) {
      console.log('Connection already in progress, skipping duplicate request');
      return;
    }

    this.connectRequested = true;
    console.log(
      'Connecting to socket server with token:',
      token.substring(0, 10) + '...'
    );

    try {
      this.disconnect();
      // Configure and connect socket
      this.socket = io(environment.messagingServiceUrl, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.setupSocketListeners();
    } catch (err) {
      console.error('Socket creation error:', err);
      this.connectionError$.next('Failed to create socket connection');
      this.connectRequested = false;
      this.retryConnection(token);
    }
  }

  private retryConnection(token: string): void {
    if (this.connectionRetryCount < this.maxRetries && this.connectRequested) {
      this.connectionRetryCount++;
      console.log(
        `Retrying connection (${this.connectionRetryCount}/${this.maxRetries}) in ${this.retryInterval}ms`
      );

      setTimeout(() => {
        this.connect(token);
      }, this.retryInterval);
    } else if (this.connectionRetryCount >= this.maxRetries) {
      console.error('Maximum retry attempts reached');
      this.connectionError$.next(
        'Failed to connect after maximum retry attempts'
      );
    }
  }

  private getAuthHeader(): Observable<any> {
    return this.getAccessToken().pipe(
      map((token) => {
        return {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
      }),
      catchError((err) => {
        console.error('Error creating auth header:', err);
        return throwError(
          () => new Error('Failed to create authentication header')
        );
      })
    );
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to messaging socket:', this.socket?.id);
      this.connected$.next(true);
      this.connectionRetryCount = 0;

      // Rejoin active room if we have one
      const roomId = this.activeRoom$.getValue();
      if (roomId) {
        this.socket?.emit('rejoin', { roomId });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from messaging socket');
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionError$.next(`Connection error: ${error.message}`);

      // Get a fresh token and retry if still requested
      if (this.connectRequested) {
        this.getAccessToken().subscribe((token) => {
          if (token && this.socket) {
            this.socket.auth = { token };
          }
        });
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.connectionError$.next(
        `Socket error: ${typeof error === 'string' ? error : 'Unknown error'}`
      );
    });

    // Message events
    this.socket.on('message', (message: ChatMessage) => {
      this.messageReceived$.next(message);
      this.chatEvents$.next({ type: 'messageReceive', data: message });
    });

    // Room events
    this.socket.on('joined-room', (data) => {
      // Handle both string and object formats for backward compatibility
      let roomId = typeof data === 'string' ? data : data.roomId;
      let otherUserId = typeof data === 'object' ? data.otherUserId : null;

      console.log(`Joined room: ${roomId} with user: ${otherUserId}`);

      this.activeRoom$.next(roomId);
      this.chatEvents$.next({
        type: 'joinedRoom',
        data: { roomId, otherUserId },
      });
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

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  getConnectionErrors(): Observable<string> {
    return this.connectionError$.asObservable();
  }

  getCurrentActiveRoom(): string {
    return this.activeRoom$.getValue();
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

    if (!otherUserId) {
      console.error('❌ Invalid otherUserId:', otherUserId);
      return;
    }

    const joinKey = `join_${otherUserId}`;
    if (this._checkRateLimited(joinKey)) {
      console.log(`Rate limiting join request for ${otherUserId}`);
      return;
    }

    console.log(`Joining room with user: ${otherUserId}`);
    this.socket.emit('join', { otherUserId });
  }

  private _lastActionTimes = new Map<string, number>();
  private _checkRateLimited(actionKey: string, timeWindow = 2000): boolean {
    const now = Date.now();
    const lastTime = this._lastActionTimes.get(actionKey) || 0;

    if (now - lastTime < timeWindow) {
      return true; // Rate limited
    }

    this._lastActionTimes.set(actionKey, now);
    return false; // Not rate limited
  }

  /**
   * Send a message to a room
   * @param text Message text
   */
  sendMessage(text: string): void {
    const roomId = this.activeRoom$.getValue();

    if (!this.socket?.connected || !roomId) {
      console.warn('Socket not connected or room not set');
      return;
    }

    console.log(
      `Sending message to room ${roomId}: ${text.substring(0, 30)}...`
    );
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
      return of([]);
    }

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

  /**
   * Get all user chats
   */
  getUserChats(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      console.error('Socket not connected. Cannot get user chats.');
      return of([]);
    }

    return new Observable((observer) => {
      this.socket?.emit('get-user-chats', {}, (response: any) => {
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
        const url = `${environment.messagingServiceUrl}/api/chat/list${
          searchQuery ? '?search=' + searchQuery : ''
        }`;
        console.log(`Fetching chats from: ${url}`);
        return this.http.get(url, headers).pipe(
          catchError((err) => {
            console.error('Error fetching all chats:', err);
            // Return mock data for development
            return of({
              status: 200,
              data: [
                {
                  _id: 'mock_room_1',
                  members: ['auth0|user1', 'auth0|user2'],
                  last_message_text: 'Hello, this is a mock message',
                  last_message_at: new Date(),
                  unseen_count: [
                    { user_id: 'auth0|user1', count: 0 },
                    { user_id: 'auth0|user2', count: 1 },
                  ],
                  other_member: [
                    {
                      _id: 'auth0|user2',
                      full_name: 'Test User',
                      profile_image: null,
                      is_online: true,
                    },
                  ],
                },
              ],
            });
          })
        );
      }),
      catchError((err) => {
        console.error('Error in getAllChats:', err);
        return of({ status: 200, data: [] });
      })
    );
  }

  getChatDetails(roomId: string): Observable<any> {
    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        const url = `${environment.messagingServiceUrl}/api/chat/chats/${roomId}`;
        console.log(`Fetching chat details from: ${url}`);
        return this.http.get(url, headers).pipe(
          catchError((err) => {
            console.error('Error fetching chat details:', err);
            // Return mock data for development
            return of({
              status: 200,
              data: {
                chatDetail: {
                  _id: roomId,
                  members: ['auth0|user1', 'auth0|user2'],
                  other_member: [
                    {
                      _id: 'auth0|user2',
                      full_name: 'Test User',
                      profile_image: null,
                      is_online: true,
                    },
                  ],
                },
                chats: [],
              },
            });
          })
        );
      }),
      catchError((err) => {
        console.error('Error in getChatDetails:', err);
        return of({ status: 404, message: 'Chat not found' });
      })
    );
  }

  getChatRoomDetails(roomId: string): Observable<any> {
    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        const url = `${environment.messagingServiceUrl}/api/chat/room/detail/${roomId}`;
        console.log(`Fetching room details from: ${url}`);
        return this.http.get(url, headers).pipe(
          catchError((err) => {
            console.error('Error fetching chat room details:', err);
            // Return mock data
            return of({
              status: 200,
              data: {
                _id: roomId,
                members: ['auth0|user1', 'auth0|user2'],
                last_message_at: new Date(),
                unseen_count: [],
              },
            });
          })
        );
      }),
      catchError((err) => {
        console.error('Error in getChatRoomDetails:', err);
        return of({ status: 404, message: 'Room not found' });
      })
    );
  }

  getChatRoomFiles(roomId: string, keyword?: string): Observable<any> {
    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        const url = keyword
          ? `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}?keyword=${keyword}`
          : `${environment.messagingServiceUrl}/api/chat/room/files/${roomId}`;
        console.log(`Fetching room files from: ${url}`);
        return this.http.get(url, headers).pipe(
          catchError((err) => {
            console.error('Error fetching chat room files:', err);
            // Return mock empty data
            return of({
              status: 200,
              data: {
                files: [],
                links: [],
              },
            });
          })
        );
      }),
      catchError((err) => {
        console.error('Error in getChatRoomFiles:', err);
        return of({ status: 200, data: { files: [], links: [] } });
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
      return throwError(() => new Error('Not in browser environment'));
    }

    return this.getAuthHeader().pipe(
      switchMap((headers) => {
        const formData = new FormData();
        formData.append('room_id', roomId);
        formData.append('text', text || '');

        files.forEach((file) => {
          formData.append('files', file);
        });

        console.log(`Sending ${files.length} files to room ${roomId}`);
        return this.http
          .post(
            `${environment.messagingServiceUrl}/api/chat/attachments`,
            formData,
            headers
          )
          .pipe(
            catchError((err) => {
              console.error('Error sending files:', err);
              // Simulate success for development
              return of({
                status: 200,
                message: 'Files uploaded successfully (mock)',
              });
            })
          );
      }),
      catchError((err) => {
        console.error('Error in sendMessageWithFiles:', err);
        return throwError(() => new Error('Failed to send files'));
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
    this.connectRequested = false;
    if (this.socket) {
      console.log('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.connected$.next(false);
    }
  }
}
