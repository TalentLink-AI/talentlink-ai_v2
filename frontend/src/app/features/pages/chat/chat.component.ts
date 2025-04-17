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
  NgZone,
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
  scrollOnNextRender: boolean = false;

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
  isSearching: boolean = false;

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
    private ngZone: NgZone,
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
          if (otherUserId) {
            this.ngZone.run(() => {
              this.loadChatDetails(roomId, otherUserId);
            });
          }
        }
      });

    this.chatService
      .getAllEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.handleChatEvent(event);
      });

    this.chatService
      .getMessageEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        this.handleNewMessage(message);
      });
  }

  ngAfterViewChecked(): void {
    if (this.scrollOnNextRender) {
      this.scrollToBottom();
      this.scrollOnNextRender = false;
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.typingTimeout);
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  checkScreenSize(): void {
    // Mobile/responsive adjustments if needed
  }

  /**
   * Load user details
   */
  loadUserDetails(): void {
    this.userService
      .getCurrentUser()
      .pipe(take(1))
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
   * Load chat list and active chat details
   */
  loadChats(): void {
    this.isLoading = true;
    this.getAllChats();

    if (this.activeChat) {
      const otherUserId = this.extractOtherUserId(this.activeChat);
      if (otherUserId) {
        this.loadChatDetails(this.activeChat, otherUserId);
      }
    }
  }

  /**
   * Extract other user ID from room ID
   */
  extractOtherUserId(roomId: string): string {
    if (!roomId) return '';

    // First try direct extraction
    const parts = roomId.split('_');
    if (parts.length < 3) {
      return '';
    }

    const normalizedCurrentUserId = this.currentUserId.replace(/[|]/g, '_');
    const otherId = parts.find(
      (id) => id && id !== 'room' && !id.includes(normalizedCurrentUserId)
    );

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
            return total + (chat.unseen_count || 0);
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

  /**
   * Load chat details
   */
  loadChatDetails(
    roomId: string,
    otherUserId: string,
    joinRoom: boolean = true
  ): void {
    this.activeChat = roomId;

    // Only join the room if requested (to avoid circular joins)
    if (joinRoom) {
      this.chatService.joinRoom(otherUserId);
    }

    this.getChatDetails(roomId);
    this.getChatRoomDetails(roomId);
    this.getChatRoomFiles(roomId);
  }

  /**
   * Handle chat events
   */
  handleChatEvent(event: any): void {
    switch (event.type) {
      case 'messageReceive':
        if (this.activeChat === event.data.room_id) {
          this.scrollOnNextRender = true;
        }
        break;

      case 'typing':
        // Handle typing indicators (could add UI for this)
        break;

      case 'seen':
        // Update seen status
        this.getAllChats();
        break;

      case 'joinedRoom':
        if (this.activeChat !== event.data.roomId) {
          this.activeChat = event.data.roomId;
        }
        break;

      case 'historyLoaded':
        if (!this.chatDetails) this.chatDetails = {};
        this.chatDetails.chats = event.data || [];
        this.scrollOnNextRender = true;
        break;
    }

    this.cdr.detectChanges();
  }

  /**
   * Handle new message received
   */
  handleNewMessage(message: any): void {
    console.log('Message received:', message);

    if (this.chatDetails && this.activeChat === message.room_id) {
      // Log current messages
      console.log(
        'Current chat messages:',
        this.chatDetails.chats?.length || 0
      );

      // Add message to chat if not already present
      const exists = this.chatDetails.chats?.some(
        (msg: any) => msg._id === message._id
      );

      console.log('Message exists?', exists);

      if (!exists && this.chatDetails.chats) {
        console.log('Adding message to chat');
        this.chatDetails.chats.push(message);
        this.scrollOnNextRender = true;

        // Force change detection
        this.cdr.detectChanges();

        // Mark as seen
        setTimeout(() => {
          this.chatService.markSeen(this.activeChat);
        }, 300);
      }
    } else {
      console.log(
        'Message is for a different room or no chat details available'
      );
    }

    // Refresh chat list to update last message
    this.getAllChats();
  }

  /**
   * Get chat details
   */
  getChatDetails(roomId: string): void {
    if (!roomId) return;

    this.chatService.getChatDetails(roomId).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatDetails = res.data;

          // Mark messages as seen
          setTimeout(() => {
            this.chatService.markSeen(roomId);
          }, 300);

          this.scrollOnNextRender = true;
        }
      },
      error: (err) => {
        console.error('Error loading chat details:', err);
        this.chatDetails = null;
      },
    });
  }

  /**
   * Get chat room details
   */
  getChatRoomDetails(roomId: string): void {
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
   * Get chat room files
   */
  getChatRoomFiles(roomId: string): void {
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

    this.isSearching = true;

    this.userService.getUsersForChat(this.userSearchQuery).subscribe({
      next: (res: any) => {
        this.searchedUsers = res.users || [];
        this.isSearching = false;
      },
      error: (err) => {
        console.error('Error searching users:', err);
        this.searchedUsers = [];
        this.isSearching = false;
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

    // Clear current chat to indicate we're loading
    this.chatDetails = null;
    this.isLoading = true;

    // Call joinRoom to create/find the room
    this.chatService.joinRoom(userId);

    // Clear search results
    this.searchedUsers = [];
    this.userSearchQuery = '';
  }

  /**
   * Send a message
   */
  sendMessage(): void {
    if (!this.activeChat) return;

    const text = this.messageTxt.value?.trim() || '';
    if (!text && this.fileList.length === 0) return;

    this.chatService
      .isConnected()
      .pipe(take(1))
      .subscribe((connected) => {
        if (!connected) {
          console.warn('❌ Cannot send: socket not connected');
          return;
        }

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
