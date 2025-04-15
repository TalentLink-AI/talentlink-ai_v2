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
  inject,
} from '@angular/core';
import { SocketService } from '../../../services/socket.service';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../../../services/user.service';
import { Subscription, Subject, debounceTime, combineLatest } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { environment } from '../../../../environments/environment';
import { takeUntil } from 'rxjs/operators';

interface Contact {
  _id: string;
  auth0Id: string;
  name: string;
  fullName: string;
  avatar?: string;
  profileImage?: string;
  email: string;
  role: string;
  isOnline: boolean;
  lastSeen?: Date;
  unseen_count?: number;
  typing?: boolean;
}

interface ChatMessage {
  _id?: string;
  from_id?: string;
  from?: string;
  text?: string;
  type?: string;
  chat_type?: string;
  room_id?: string;
  createdAt: Date;
  files?: Array<{
    file: string;
    type: string;
  }>;
  profile_image?: string;
  reactions?: any[];
}

interface ChatRoom {
  _id: string;
  name?: string;
  members: string[];
  last_message_text: string;
  last_message_at: Date;
  other_member: Array<{
    _id: string;
    full_name: string;
    profile_image?: string;
    is_online: boolean;
  }>;
  unseen_count: number;
}

interface ChatRoomFiles {
  files: Array<{
    _id: string;
    file: string;
    type: string;
    createdAt: Date;
  }>;
  links: Array<{
    _id: string;
    link: string;
    from_user: string;
    createdAt: Date;
  }>;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
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
  currentUserEmail: string = '';
  currentUserName: string = '';
  userProfilePic: string = '';
  userDetails: any;

  // Chat state
  activeChat: string = '';
  chatDetails: any;
  chatRoomDetails: any = { notepad: '' };
  chatRoomFilesDetails: ChatRoomFiles | null = null;
  chatList: ChatRoom[] = [];

  // UI state
  isLoading: boolean = true;
  isMobileView: boolean = false;
  isDarkMode: boolean = false;
  activeClass: string = '';

  // Message input
  messageTxt = new FormControl('');
  showEmojiPicker: boolean = false;
  typingTimeout: any;

  // File handling
  fileList: { name: string; file: File }[] = [];
  showFile: { name: string; ext: string }[] = [];

  // Media URLs
  imgBaseUrl = environment.apiUrl + '/api/media/';

  // Search
  searchQuery: string = '';
  searchResults: any[] = [];
  userSearchQuery: string = '';
  searchedUsers: any[] = [];

  // Destroy notifier
  private destroy$ = new Subject<void>();

  // Window reference
  private windowObj: Window;

  constructor(
    private socketService: SocketService,
    private auth: AuthService,
    private userService: UserService,
    private themeService: ThemeService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.windowObj = isPlatformBrowser(platformId) ? window : ({} as Window);

    // Check if URL has a specific chat to open
    if (this.router.getCurrentNavigation()?.extras?.state) {
      const state = this.router.getCurrentNavigation()?.extras?.state;
      if (state && typeof state === 'string') {
        this.activeChat = state;
      }
    }
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });

    // Check screen size for mobile view
    this.checkScreenSize();

    // Get user info from Auth0
    combineLatest([
      this.auth.user$,
      this.auth.getAccessTokenSilently({
        audience: 'https://api.talentlink.com',
        scope: 'openid profile email',
      } as any), // 👈 Cast to any to suppress type errors
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([user, token]) => {
        if (user && typeof token === 'string') {
          this.currentUserId = user.sub || '';
          this.currentUserName = user.name || '';
          this.currentUserEmail = user.email || '';
          this.userProfilePic = user.picture || '';

          this.loadUserDetails();
          this.socketService.connect(token);
        } else {
          console.error('❌ Failed to get Auth0 user or valid token:', {
            user,
            token,
          });
        }
      });

    // Initialize chat
    this.initializeChat();
    this.socketService
      .onJoinRoom()
      .pipe(takeUntil(this.destroy$))
      .subscribe((roomId: string) => {
        this.activeChat = roomId;
        this.getChatDetails(roomId);
        this.getChatRoom(roomId);
        this.getChatRoomFiles(roomId);
      });

    // Monitor typing input
    this.messageTxt.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((value) => {
        if (this.activeChat && value) {
          this.socketService.sendTyping(this.activeChat, 'start');

          // Clear previous timeout
          clearTimeout(this.typingTimeout);

          // Set new timeout
          this.typingTimeout = setTimeout(() => {
            this.socketService.sendTyping(this.activeChat, 'end');
          }, 1000);
        }
      });
  }

  /**
   * Load user details from the user service
   */
  loadUserDetails(): void {
    this.userService.getCurrentUser().subscribe({
      next: (data) => {
        if (data) {
          this.userDetails = data.user;
          this.socketService
            .getChatEvents()
            .pipe(takeUntil(this.destroy$))
            .subscribe(this.handleChatEvents.bind(this));
        }
      },
      error: (err) => {
        console.error('Error loading user details:', err);
      },
    });
  }

  /**
   * Initialize chat data
   */
  initializeChat(): void {
    // Load chat list
    this.getAllChats();

    // Load specific chat if available in URL
    if (this.activeChat) {
      this.getChatDetails(this.activeChat);
      this.getChatRoom(this.activeChat);
      this.getChatRoomFiles(this.activeChat);
    }
  }

  /**
   * Handle all chat events from socket
   */
  handleChatEvents(eventData: any): void {
    switch (eventData.type) {
      case 'typingStatus':
        this.handleTypingStatus(eventData.data);
        break;

      case 'IncomingMessage':
        this.handleIncomingMessage(eventData.data);
        break;

      case 'reactionStatus':
        this.handleReactionStatus(eventData.data);
        break;

      case 'seenEvent':
        this.handleSeenEvent(eventData.data);
        break;

      case 'IncomingTyping':
        this.handleIncomingTyping(eventData.data);
        break;

      case 'ChatCountReload':
      case 'NotificationCountReload':
        this.updateUnreadCount();
        break;
    }
  }

  /**
   * Handle typing status event
   */
  handleTypingStatus(data: any): void {
    if (data.from_id !== this.userDetails._id) {
      this.getAllChats();
      if (this.activeChat === data.room_id) {
        if (data.status === 'start') {
          this.chatDetails?.chats.push(data);
          this.scrollToBottom();
        }
      }
    }
  }

  /**
   * Handle incoming message event
   */
  handleIncomingMessage(data: any): void {
    if (data.reaction || data.seen) {
      if (data.seen && data.seen === true) {
        const index = this.chatList.findIndex((chat) => chat._id === data.room);
        if (index > -1) {
          this.chatList[index].unseen_count = 0;
        }
      } else {
        const index = this.chatDetails?.chats.findIndex(
          (msg: any) => msg._id === data._id
        );
        if (index && index > -1 && this.chatDetails?.chats[index]) {
          this.chatDetails.chats[index].reactions = data.reactions;
        }
      }
    } else {
      const index = this.chatList.findIndex((chat) => chat._id === data.room);

      if (index > -1 && data.latestMessage) {
        this.chatList[index] = data.latestMessage;
        this.chatList.sort((a, b) =>
          new Date(a.last_message_at) < new Date(b.last_message_at) ? 1 : -1
        );
      }

      if (this.activeChat === data.room) {
        if (data.type === 'file') {
          this.getChatRoomFiles(this.activeChat);
        }

        if (this.chatDetails && this.chatDetails.chats) {
          this.chatDetails.chats.push(data);
          this.scrollToBottom();

          // Mark as seen if we're in the chat
          setTimeout(() => {
            this.socketService.markSeen(this.activeChat);
          }, 0);
        }
      }

      // Update unread count
      this.updateUnreadCount();
    }
  }

  /**
   * Handle reaction status event
   */
  handleReactionStatus(data: any): void {
    this.getAllChats();
    if (this.activeChat === data.room_id) {
      this.getChatDetails(this.activeChat, true);
    }
  }

  /**
   * Handle seen event
   */
  handleSeenEvent(data: any): void {
    this.getAllChats();
    if (this.activeChat === data.room_id) {
      this.getChatDetails(this.activeChat, true);
    }

    // Update unread count
    setTimeout(() => {
      this.updateUnreadCount();
    }, 100);
  }

  /**
   * Handle incoming typing event
   */
  handleIncomingTyping(data: any): void {
    if (data.from_id !== this.userDetails?._id) {
      const index = this.chatList.findIndex((chat) => chat._id === data.room);

      if (index > -1 && data.latestMessage) {
        // Add typing property to ChatRoom interface if needed
        (this.chatList[index] as any).typing = data.latestMessage.typing;
      }

      if (
        this.activeChat === data.room &&
        this.chatDetails &&
        this.chatDetails.chats
      ) {
        if (data.status !== 'end') {
          this.chatDetails.chats.push(data);
          this.scrollToBottom();
        } else {
          const msgIndex = this.chatDetails.chats.findIndex(
            (msg: any) => msg._id === data._id
          );
          if (msgIndex > -1) {
            this.chatDetails.chats.splice(msgIndex, 1);
          }
        }
      }
    }
  }

  /**
   * Get total unread message count
   */
  updateUnreadCount(): void {
    const totalUnseen = this.chatList.reduce((total, chat) => {
      return total + (chat.unseen_count || 0);
    }, 0);

    // Emit the total count for other components (like header)
    // You would normally use an event service or similar here
  }

  /**
   * Get all chats
   */
  getAllChats(searchString?: string): void {
    this.isLoading = true;

    this.socketService.getAllChats(searchString).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatList = res.data;
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading chats:', err);
        this.chatList = [];
        this.isLoading = false;
      },
    });
  }

  /**
   * Get chat details
   */
  getChatDetails(id: string, noReload?: boolean): void {
    if (!id) return;

    this.activeChat = id;

    this.socketService.getChatDetails(id).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatDetails = res.data;

          if (!noReload) {
            // Mark messages as seen
            setTimeout(() => {
              this.socketService.markSeen(this.activeChat);

              // Update total unread count
              setTimeout(() => {
                this.updateUnreadCount();
              }, 100);
            }, 0);
          }

          // Scroll to bottom after content loads
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
   * Get chat room details
   */
  getChatRoom(id: string): void {
    this.socketService.getChatRoomDetails(id).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.chatRoomDetails = res.data;
        }
      },
      error: (err) => {
        console.error('Error loading chat room details:', err);
        this.chatRoomDetails = { notepad: '' };
      },
    });
  }

  /**
   * Get chat room files
   */
  getChatRoomFiles(id: string): void {
    this.socketService.getChatRoomFiles(id, this.searchQuery).subscribe({
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
   * Search messages by keyword
   */
  searchMessages(keyword: string): void {
    if (!this.activeChat || !keyword) return;

    this.socketService.searchMessages(this.activeChat, keyword).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.searchResults = res.data;
        }
      },
      error: (err) => {
        console.error('Error searching messages:', err);
        this.searchResults = [];
      },
    });
  }

  searchUsers(): void {
    if (!this.userSearchQuery.trim()) return;

    this.userService.getUsersForChat(this.userSearchQuery, 10).subscribe({
      next: (response) => {
        this.searchedUsers = response.users || [];
      },
      error: (err) => {
        console.error('Error searching users:', err);
        this.searchedUsers = [];
      },
    });
  }

  startChatWithUser(auth0Id: string): void {
    const sub = this.socketService.isConnected().subscribe((connected) => {
      if (connected) {
        this.socketService.joinRoom(auth0Id);

        const joinSub = this.socketService
          .onJoinRoom()
          .subscribe((roomId: string) => {
            this.activeChat = roomId;
            this.getChatDetails(roomId);
            this.getChatRoom(roomId);
            this.getChatRoomFiles(roomId);

            joinSub.unsubscribe();
          });

        sub.unsubscribe(); // cleanup
      }
    });
  }

  getInitials(firstName: string, lastName: string): string {
    return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
  }

  /**
   * Handle file input change
   */
  fileInputChange(event: any): void {
    this.fileChangeInit(event.target.files);
  }

  /**
   * Process files for upload
   */
  fileChangeInit(files: FileList): void {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = this.fileList.findIndex((f) => f.name === file.name);

      if (fileIndex === -1 && file.name?.includes('.')) {
        this.showFile.push({
          name: file.name,
          ext: file.name.split('.').pop() || '',
        });

        this.fileList.push({
          name: file.name,
          file: file,
        });
      } else {
        // File already exists
        console.warn('File already exists:', file.name);
        // You could show a toast/alert here
      }
    }
  }

  /**
   * Remove a file from the upload list
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

    // Close other drawers if open
    if (this.showEmojiPicker && this.activeClass) {
      this.activeClass = '';
    }
  }

  /**
   * Add emoji to message input
   */
  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      const currentValue = this.messageTxt.value || '';
      this.messageTxt.patchValue(currentValue + event.emoji.native);
    }
  }

  /**
   * Add space remover method with proper typing
   */
  addSpaceRemover(event: KeyboardEvent, target: EventTarget | null): void {
    const input = target as HTMLInputElement;
    if (!input || !input.value) return;

    if (event.code === 'Space' && input.value.length === 0) {
      input.value = input.value.trim();
      event.preventDefault();
    }
  }

  /**
   * Send a message
   */
  sendMessage(): void {
    // If we have text and no files, send directly
    if (
      this.messageTxt.value &&
      this.fileList &&
      this.fileList.length === 0 &&
      this.activeChat
    ) {
      const data = {
        room: this.activeChat,
        text: this.messageTxt.value,
      };

      this.socketService.sendMessage(this.activeChat, this.messageTxt.value);
      this.messageTxt.reset();
      this.showEmojiPicker = false;
    }
    // If we have files, send with files
    else if (this.fileList && this.fileList.length > 0 && this.activeChat) {
      const data = {
        room: this.activeChat,
        text: this.messageTxt.value || '',
      };

      // Create a new array to hold valid files
      const validFiles: File[] = [];

      // Safely iterate over fileList
      for (let i = 0; i < this.fileList.length; i++) {
        const item = this.fileList[i];
        // Only add file if it exists
        if (item && item.file) {
          validFiles.push(item.file);
        }
      }

      // Check if we have any valid files
      if (validFiles.length === 0) {
        console.error('No valid files to send');
        return;
      }

      const request = this.socketService.sendMessageWithFiles(data, validFiles);
      if (!request) {
        console.warn('Not running in browser — skipping file upload.');
        return;
      }

      request.subscribe({
        next: (res: any) => {
          console.log('Files sent successfully');
        },
        error: (err) => {
          console.error('Error sending files:', err);
        },
        complete: () => {
          this.messageTxt.reset();
          this.showEmojiPicker = false;
          this.showFile = [];
          this.fileList = [];
        },
      });
    }
  }

  /**
   * Handle paste event for images
   */
  onPaste(event: ClipboardEvent): void {
    if (!event.clipboardData) return;

    const items = event.clipboardData.items;
    let blob: File | null = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        blob = items[i].getAsFile();

        if (blob) {
          const fileIndex = this.fileList.findIndex(
            (f) => f.name === blob!.name
          );

          if (fileIndex === -1 && blob.name?.includes('.')) {
            this.showFile.push({
              name: blob.name,
              ext: blob.name.split('.').pop() || '',
            });

            this.fileList.push({
              name: blob.name,
              file: blob,
            });
          } else {
            // File already exists
            console.warn('File already exists:', blob.name);
          }
        }
      }
    }
  }

  /**
   * Toggle side drawer (files, links)
   */
  toggleSideDrawer(type: string): void {
    if (this.activeClass === type) {
      this.activeClass = '';
    } else {
      this.activeClass = type;

      // Close emoji picker if open
      if (this.showEmojiPicker) {
        this.showEmojiPicker = false;
      }
    }
  }

  /**
   * Check if URL is in the text
   */
  checkForUrl(text: string | undefined): string | boolean {
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
   * Download file from server
   */
  downloadFile(fileUrl: string, filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    fetch(fileUrl)
      .then((response) => response.blob())
      .then((blob) => {
        // Use window directly since TypeScript definition might be incomplete
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error('Error downloading file:', err);
      });
  }

  /**
   * Get contact name from chat room
   * Safely handles potentially undefined properties
   */
  getContactName(chat: ChatRoom | any): string {
    if (!chat) {
      return 'Unknown Contact';
    }

    // Check if other_member exists and has items
    if (!chat.other_member || chat.other_member.length === 0) {
      return chat.name || 'Unknown Contact';
    }

    // Return formatted name
    if (chat.name) {
      return `${chat.name} - ${chat.other_member[0].full_name}`;
    }

    return chat.other_member[0].full_name || 'Unknown Contact';
  }

  /**
   * Track screen size for responsive layout
   */
  @HostListener('window:resize')
  checkScreenSize(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isMobileView = window.innerWidth < 768;
  }

  /**
   * Scroll to bottom of message container
   */
  scrollToBottom(): void {
    if (!this.messageContainer || !isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }, 0);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Clear timeouts
    clearTimeout(this.typingTimeout);
  }
}
