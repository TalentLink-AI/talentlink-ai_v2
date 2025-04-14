// src/app/services/socket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: Socket;
  private connected$ = new BehaviorSubject<boolean>(false);
  private activeRoom$ = new BehaviorSubject<string>('');
  private currentContactId: string = '';

  constructor() {}

  /**
   * Connect to the messaging socket server
   * @param token The Auth0 token for authentication
   */
  connect(token: string) {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
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
    return new Observable((observer) => {
      this.socket.on('joined-room', (roomId: string) => {
        this.activeRoom$.next(roomId);
        observer.next(roomId);
      });
    });
  }

  /**
   * Send a message to a room
   * @param roomId The room ID
   * @param text The message text
   */
  sendMessage(roomId: string, text: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected. Cannot send message.');
      return;
    }

    this.socket.emit('message', { roomId, text });
  }

  /**
   * Observable for message events
   */
  onMessage(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('message', (msg) => {
        observer.next(msg);
      });
    });
  }

  /**
   * Send typing status
   * @param roomId The room ID
   * @param status Typing status ('start' or 'end')
   */
  sendTyping(roomId: string, status: 'start' | 'end') {
    if (!this.socket || !this.socket.connected) {
      return;
    }
    this.socket.emit('typing', { roomId, status });
  }

  /**
   * Observable for typing events
   */
  onTyping(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('typing', (payload) => {
        observer.next(payload);
      });
    });
  }

  /**
   * Mark messages as seen
   * @param roomId The room ID
   */
  markSeen(roomId: string) {
    if (!this.socket || !this.socket.connected) {
      return;
    }
    this.socket.emit('seen', { roomId });
  }

  /**
   * Observable for seen events
   */
  onSeen(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('seen', (data) => observer.next(data));
    });
  }

  /**
   * Get chat history for a room
   * @param roomId The room ID
   */
  getChatHistory(roomId: string): Observable<any> {
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
   * Disconnect from the socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected$.next(false);
      this.activeRoom$.next('');
    }
  }
}
