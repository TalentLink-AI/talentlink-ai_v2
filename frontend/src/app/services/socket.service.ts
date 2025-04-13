// src/app/services/socket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: Socket;

  constructor() {}

  connect(token: string) {
    this.socket = io(environment.messagingServiceUrl, {
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    this.socket.on('connect', () => {
      console.log('🟢 Connected to messaging socket:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Disconnected from messaging socket');
    });
  }

  joinRoom(otherUserId: string) {
    this.socket.emit('join', { otherUserId });
  }

  onJoinRoom(): Observable<string> {
    return new Observable((observer) => {
      this.socket.on('joined-room', (roomId) => {
        observer.next(roomId);
      });
    });
  }

  sendMessage(roomId: string, text: string) {
    this.socket.emit('message', { roomId, text });
  }

  onMessage(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('message', (msg) => {
        observer.next(msg);
      });
    });
  }

  sendTyping(roomId: string, status: 'start' | 'end') {
    this.socket.emit('typing', { roomId, status });
  }

  onTyping(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('typing', (payload) => {
        observer.next(payload);
      });
    });
  }

  markSeen(roomId: string) {
    this.socket.emit('seen', { roomId });
  }

  onSeen(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('seen', (data) => observer.next(data));
    });
  }
}
