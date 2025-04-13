import { Component, OnInit } from '@angular/core';
import { SocketService } from '../../../services/socket.service';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  imports: [FormsModule, CommonModule, PickerModule],
})
export class ChatComponent implements OnInit {
  currentUserId = '';
  otherUserId = '';
  activeRoomId = '';
  messages: any[] = [];
  messageText = '';
  typingUser: string = '';
  typingTimeout: any;
  showEmojiPicker = false;
  emojiAccentColor = '#4f83f1';
  openSmily: boolean = false;

  constructor(
    private socketService: SocketService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.auth.getAccessTokenSilently().subscribe((token: string) => {
      this.socketService.connect(token);

      // listen for new messages
      this.socketService.onMessage().subscribe((msg) => {
        this.messages.push(msg);
      });

      // once backend confirms room joined
      this.socketService.onJoinRoom().subscribe((roomId) => {
        this.activeRoomId = roomId;
        this.socketService.markSeen(roomId);
        console.log(`✅ Joined room: ${roomId}`);
      });

      // Listen for typing events
      this.socketService.onTyping().subscribe((typingInfo) => {
        console.log(`⌨️ ${typingInfo.from} is ${typingInfo.status}`);
      });

      // Listen for seen events
      this.socketService.onSeen().subscribe((seenInfo) => {
        console.log(
          `👀 Messages seen by ${seenInfo.userId} in room ${seenInfo.roomId}`
        );
      });

      this.socketService.onTyping().subscribe((typingInfo) => {
        if (
          typingInfo.from !== this.currentUserId &&
          typingInfo.status === 'start'
        ) {
          this.typingUser = typingInfo.from;

          clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => {
            this.typingUser = '';
          }, 1500); // clear after 1.5s of no typing
        }

        if (
          typingInfo.status === 'end' &&
          typingInfo.from === this.typingUser
        ) {
          this.typingUser = '';
        }
      });

      // get user ID if needed
      this.auth.user$.subscribe((user) => {
        this.currentUserId = user?.sub || '';
      });
    });
  }

  joinRoom() {
    if (!this.otherUserId.trim()) return;
    this.socketService.joinRoom(this.otherUserId);
  }

  sendMessage() {
    if (!this.messageText.trim() || !this.activeRoomId) return;
    this.socketService.sendMessage(this.activeRoomId, this.messageText);
    this.messageText = '';
  }

  onInputChange() {
    if (!this.activeRoomId) return;
    this.socketService.sendTyping(this.activeRoomId, 'start');

    clearTimeout((window as any).typingTimeout);
    (window as any).typingTimeout = setTimeout(() => {
      this.socketService.sendTyping(this.activeRoomId, 'end');
    }, 1000); // stop typing after 1 second of inactivity
  }

  markSeen() {
    if (this.activeRoomId) {
      this.socketService.markSeen(this.activeRoomId);
    }
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  toggleEmoji(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const emoji = event.emoji.native;
    this.messageText += emoji;
  }
}
