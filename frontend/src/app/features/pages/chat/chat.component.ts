// src/app/features/pages/chat/chat.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  HostListener,
  PLATFORM_ID,
  Inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, take } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';

import { ChatService } from '../../../services/chat.service';
import { UserService } from '../../../services/user.service';
import { ThemeService } from '../../../services/theme.service';
import { environment } from '../../../../environments/environment';

interface ChatFile {
  name: string;
  ext: string;
  file?: File;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PickerModule,
    RouterModule,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;

  // User information
  currentUserId: string = '';
  currentUserName: string = '';
  userProfilePic: string = '';
  userDetails: any;

  // Chat state
  activeChat: string = '';
  chatDetails: any = null;
  chatRoomDetails: any = null;
  chatRoomFilesDetails: any = null;
  chatList: any[] = [];

  // UI state
  isLoading: boolean = true;
  isDarkMode: boolean = false;
  activeClass: string = '';

  // Message input
  messageTxt = new FormControl('');
  showEmojiPicker: boolean = false;
  typingTimeout: any;

  // File handling
  fileList: { name: string; file: File }[] = [];
  showFile: ChatFile[] = [];

  // Search
  searchQuery: string = '';
  userSearchQuery: string = '';
  searchedUsers: any[] = [];

  // Media URLs
  imgBaseUrl = environment.apiUrl + '/api/media/';

  // Destroy notifier
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private auth: AuthService,
    private userService: UserService,
    private themeService: ThemeService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Check if URL has a specific chat to open
    const state = this.router.getCurrentNavigation()?.extras?.state;
    if (state && typeof state === 'object' && 'chatId' in state) {
      this.activeChat = state['chatId'] as string;
    }
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });

    // Check screen size
    this.checkScreenSize();

    // Get user info
    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.currentUserId = user.sub || '';
        this.currentUserName = user.name || '';
        this.userProfilePic = user.picture || '';

        this.loadUserDetails();
        this.loadChats();
      }
    });

    // Monitor typing input for sending typing status
    this.messageTxt.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((value) => {
        if (this.activeChat && value) {
          this.chatService.sendTyping(this.activeChat, 'start');

          clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => {
            this.chatService.sendTyping(this.activeChat, 'end');
          }, 1000);
        }
      });

    // Subscribe to chat service events
    this.chatService
      .getActiveRoom()
      .pipe(takeUntil(this.destroy$))
      .subscribe((roomId) => {
        if (roomId && roomId !== this.activeChat) {
          this.activeChat = roomId;

          const otherUserId = this.extractOtherUserId(roomId);
          this.loadChatDetails(roomId, otherUserId);
        }
      });

    this.chatService
      .getAllEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.handleChatEvent(event);

        if (event.type === 'historyLoaded') {
          if (!this.chatDetails) this.chatDetails = {};
          this.chatDetails.chats = event.data || [];
        }
      });

    this.chatService
      .getMessageEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        this.handleNewMessage(message);
      });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    clearTimeout(this.typingTimeout);
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  checkScreenSize(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Implement responsive behavior if needed
    }
  }

  /**
   * Load user details
   */
  loadUserDetails(): void {
    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data) {
            this.userDetails = data.user;
          }
        },
        error: (err) => {
          console.error('Error loading user details:', err);
        },
      });
  }

  /**
   * Updated method from ChatComponent to ensure consistent parameter counts
   */

  // For ngOnInit or loadChats
  loadChats(): void {
    this.isLoading = true;
    this.getAllChats();

    if (this.activeChat) {
      const otherUserId = this.extractOtherUserId(this.activeChat);
      if (otherUserId) {
        // Use the correct parameter count
        this.loadChatDetails(this.activeChat, otherUserId, false);
      }
    }
  }

  extractOtherUserId(roomId: string): string {
    if (!roomId) return '';

    const parts = roomId.split('_');
    if (parts.length < 3) return '';

    const normalizedCurrentUserId = this.currentUserId.replace(/[|]/g, '_');
    const otherId = parts.find(
      (id) => id && id !== 'room' && !id.includes(normalizedCurrentUserId)
    );

    if (!otherId) {
      console.warn(`Could not extract other user ID from roomId: ${roomId}`);
    }

    return otherId || '';
  }

  /**
   * Get all chats for the user
   */
  getAllChats(searchString?: string): void {
    this.chatService.getAllChats(searchString).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatList = res.data || [];

          // Calculate total unread count
          const totalUnread = this.chatList.reduce((total, chat) => {
            const userCount = (chat.unseen_count || []).find(
              (item: any) => item.user_id === this.currentUserId
            );
            return total + (userCount?.count || 0);
          }, 0);

          this.chatService.updateUnreadCount(totalUnread);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading chats:', err);
        this.chatList = [];
        this.isLoading = false;
      },
    });
  }

  loadChatDetails(
    roomId: string,
    otherUserId: string,
    noReload: boolean = false
  ): void {
    // Prevent loading if we're already on this chat and noReload is true
    if (noReload && this.activeChat === roomId && this.chatDetails) {
      console.log('Skip reloading chat details for current active chat');
      return;
    }

    this.activeChat = roomId;

    // Only join the room if we're not already in it
    if (!noReload) {
      this.chatService.joinRoom(otherUserId);
    }

    this.getChatDetails(roomId);
    this.getChatRoom(roomId);
    this.getChatRoomFiles(roomId);
  }

  /**
   * Handle chat events from service
   * Modified to prevent infinite loops and fix method signature issues
   */
  handleChatEvent(event: any): void {
    // Add loop prevention logging
    console.log('Chat event received:', event?.type);

    switch (event.type) {
      case 'messageReceive':
        if (this.activeChat === event.data.room_id) {
          this.scrollToBottom();
        }
        break;

      case 'typing':
        // Handle typing indicators
        break;

      case 'seen':
        // Update seen status
        this.getAllChats();
        break;

      case 'joinedRoom':
        // Critical: check if we're already in this room to prevent loops
        const newRoomId =
          typeof event.data === 'string' ? event.data : event.data.roomId;
        if (this.activeChat === newRoomId) {
          console.log(
            'Already in this room, ignoring join event to prevent loops'
          );
          return;
        }

        const otherUserId =
          typeof event.data === 'object' ? event.data.otherUserId : null;
        console.log(`Joined room: ${newRoomId} with user: ${otherUserId}`);

        // Set active chat
        this.activeChat = newRoomId;

        // Load chat details only once - fix method signature issue
        if (otherUserId) {
          // Use the correct parameter count (roomId, otherUserId, noReload)
          this.loadChatDetails(newRoomId, otherUserId, true);
        }
        break;
    }
  }

  /**
   * Handle new message received
   */
  handleNewMessage(message: any): void {
    if (this.chatDetails && this.activeChat === message.room_id) {
      // Add message to chat if not already present
      const exists = this.chatDetails.chats?.some(
        (msg: any) => msg._id === message._id
      );

      if (!exists && this.chatDetails.chats) {
        this.chatDetails.chats.push(message);
        this.scrollToBottom();

        // Mark as seen
        setTimeout(() => {
          this.chatService.markSeen(this.activeChat);
        }, 300);
      }
    }

    // Refresh chat list to update last message
    this.getAllChats();
  }

  /**
   * Get chat details with debouncing to prevent repeated calls
   */
  private lastApiCallMap = new Map<string, number>();
  private apiDebounceTime = 1000; // 1 second

  getChatDetails(roomId: string, noReload?: boolean): void {
    if (!roomId) return;

    // Check if we've made this call recently
    const now = Date.now();
    const lastCallTime = this.lastApiCallMap.get(`chat_${roomId}`) || 0;
    if (now - lastCallTime < this.apiDebounceTime) {
      console.log(
        `Skipping duplicate API call for chat details - room ${roomId}`
      );
      return;
    }

    // Record this call
    this.lastApiCallMap.set(`chat_${roomId}`, now);

    this.activeChat = roomId;

    this.chatService.getChatDetails(roomId).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatDetails = res.data;

          if (!noReload) {
            // Mark messages as seen once after loading
            setTimeout(() => {
              this.chatService.markSeen(roomId);
            }, 300);
          }

          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
        }
      },
      error: (err) => {
        console.error('Error loading chat details:', err);
        this.chatDetails = null;
      },
    });
  }

  /**
   * Get chat room details with debouncing
   */
  getChatRoom(roomId: string): void {
    // Check if we've made this call recently
    const now = Date.now();
    const lastCallTime = this.lastApiCallMap.get(`room_${roomId}`) || 0;
    if (now - lastCallTime < this.apiDebounceTime) {
      console.log(
        `Skipping duplicate API call for room details - room ${roomId}`
      );
      return;
    }

    // Record this call
    this.lastApiCallMap.set(`room_${roomId}`, now);

    this.chatService.getChatRoomDetails(roomId).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatRoomDetails = res.data;
        }
      },
      error: (err) => {
        console.error('Error loading chat room details:', err);
        this.chatRoomDetails = null;
      },
    });
  }

  /**
   * Get chat room files with debouncing
   */
  getChatRoomFiles(roomId: string): void {
    // Check if we've made this call recently
    const now = Date.now();
    const lastCallTime = this.lastApiCallMap.get(`files_${roomId}`) || 0;
    if (now - lastCallTime < this.apiDebounceTime) {
      console.log(
        `Skipping duplicate API call for room files - room ${roomId}`
      );
      return;
    }

    // Record this call
    this.lastApiCallMap.set(`files_${roomId}`, now);

    this.chatService.getChatRoomFiles(roomId, this.searchQuery).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatRoomFilesDetails = res.data;
        }
      },
      error: (err) => {
        console.error('Error loading chat room files:', err);
        this.chatRoomFilesDetails = null;
      },
    });
  }

  /**
   * Search for users to chat with
   */
  searchUsers(): void {
    if (!this.userSearchQuery.trim()) return;

    console.log(`Searching for users with query: ${this.userSearchQuery}`);
    this.userService.getUsersForChat(this.userSearchQuery).subscribe({
      next: (res: any) => {
        console.log('Search results:', res);
        this.searchedUsers = res.users || [];
      },
      error: (err) => {
        console.error('Error searching users:', err);
        this.searchedUsers = [];
      },
    });
  }

  /**
   * Start a chat with a user
   */
  startChatWithUser(userId: string): void {
    if (!userId) {
      console.error('Cannot start chat with empty user ID');
      return;
    }

    console.log(`Starting chat with user: ${userId}`);

    // Clear current chat to indicate we're loading
    this.chatDetails = null;
    this.isLoading = true;

    // Only call joinRoom once
    this.chatService.joinRoom(userId);
  }

  /**
   * Send a message
   */
  sendMessage(): void {
    if (!this.activeChat) {
      console.warn('❌ Cannot send: activeChat not set');
      return;
    }

    const text = this.messageTxt.value?.trim() || '';
    if (!text && this.fileList.length === 0) {
      console.warn('❌ Cannot send: no text or files');
      return;
    }

    this.chatService
      .isConnected()
      .pipe(take(1))
      .subscribe((connected) => {
        if (!connected) {
          console.warn('❌ Cannot send: socket not connected');
          return;
        }

        // Proceed if connected
        if (this.fileList.length > 0) {
          const files = this.fileList.map((item) => item.file);

          this.chatService
            .sendMessageWithFiles(this.activeChat, text, files)
            .subscribe({
              next: () => this.resetMessageInput(),
              error: (err) => {
                console.error('Error sending message with files:', err);
              },
            });
        } else {
          this.chatService.sendMessage(text);
          this.resetMessageInput();
        }
      });
  }

  /**
   * Reset message input after sending
   */
  resetMessageInput(): void {
    this.messageTxt.reset();
    this.showEmojiPicker = false;
    this.showFile = [];
    this.fileList = [];
  }

  /**
   * Handle file input change
   */
  fileInputChange(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = this.fileList.findIndex((f) => f.name === file.name);

      if (fileIndex === -1) {
        const fileExt = file.name.split('.').pop() || '';

        this.showFile.push({
          name: file.name,
          ext: fileExt,
        });

        this.fileList.push({
          name: file.name,
          file: file,
        });
      }
    }
  }

  /**
   * Remove a file from upload list
   */
  removeFile(index: number): void {
    this.showFile.splice(index, 1);
    this.fileList.splice(index, 1);
  }

  /**
   * Toggle emoji picker
   */
  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;

    if (this.showEmojiPicker && this.activeClass) {
      this.activeClass = '';
    }
  }

  /**
   * Add emoji to message
   */
  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      const message = this.messageTxt.value || '';
      this.messageTxt.setValue(message + event.emoji.native);
    }
  }

  /**
   * Prevent empty spaces at start of message
   */
  addSpaceRemover(event: KeyboardEvent, target: EventTarget | null): void {
    const input = target as HTMLInputElement;
    if (!input) return;

    if (event.code === 'Space' && input.value.length === 0) {
      event.preventDefault();
    }
  }

  /**
   * Handle paste event for images
   */
  onPaste(event: ClipboardEvent): void {
    if (!event.clipboardData) return;

    const items = event.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        const blob = items[i].getAsFile();

        if (blob) {
          const now = new Date();
          const fileName = `pasted_image_${now.getTime()}.png`;

          this.showFile.push({
            name: fileName,
            ext: 'png',
          });

          this.fileList.push({
            name: fileName,
            file: new File([blob], fileName, { type: blob.type }),
          });
        }
      }
    }
  }

  /**
   * Toggle side drawer (files, links)
   */
  toggleSideDrawer(type: string): void {
    this.activeClass = this.activeClass === type ? '' : type;

    if (this.activeClass && this.showEmojiPicker) {
      this.showEmojiPicker = false;
    }
  }

  /**
   * Download file
   */
  downloadFile(fileUrl: string, filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename.includes('@')
      ? filename.substring(filename.indexOf('@') + 1)
      : filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Check if text contains URL
   */
  checkForUrl(text: string | undefined): string | false {
    if (!text) return false;

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    if (urlRegex.test(text)) {
      return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank">${url}</a>`;
      });
    }

    return false;
  }

  /**
   * Get contact name
   */
  getContactName(chat: any): string {
    if (!chat) return 'Unknown Contact';

    // Try to get name from other_member
    if (chat.other_member && chat.other_member.length > 0) {
      return chat.other_member[0].full_name || 'Unknown Contact';
    }

    // Fallback to room name
    return chat.name || 'Unknown Contact';
  }

  /**
   * Get user initials for avatar
   */
  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) return '?';

    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';

    return first + last;
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom(): void {
    if (!this.messageContainer || !isPlatformBrowser(this.platformId)) return;

    try {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}
