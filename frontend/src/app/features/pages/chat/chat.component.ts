// src/app/features/pages/chat/chat.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { SocketService } from '../../../services/socket.service';
import { AuthService, User } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../../../services/user.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';

interface Contact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  lastSeen: Date;
}

interface ChatMessage {
  from: string;
  text: string;
  createdAt: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, CommonModule, PickerModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  currentUserId: string = '';
  currentUserName: string = '';
  activeRoomId: string = '';
  messages: ChatMessage[] = [];
  messageText: string = '';
  typingUser: string = '';
  typingTimeout: any;
  showEmojiPicker: boolean = false;
  contacts: Contact[] = [];
  filteredContacts: Contact[] = [];
  selectedContact: Contact | null = null;
  isDarkMode: boolean = false;
  isLoading: boolean = true;
  searchQuery: string = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private socketService: SocketService,
    private auth: AuthService,
    private userService: UserService,
    private themeService: ThemeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.subscriptions.push(
      this.themeService.isDarkMode$.subscribe((isDark) => {
        this.isDarkMode = isDark;
      })
    );

    // Get user info
    this.subscriptions.push(
      this.auth.user$.subscribe((user) => {
        if (user) {
          this.currentUserId = user.sub || '';
          this.currentUserName = this.getUserDisplayName(user);

          // Load contacts once we have the user info
          this.loadContacts();
        }
      })
    );

    // Check for contact parameter in the URL
    this.route.queryParams.subscribe((params) => {
      const contactId = params['contact'];
      if (contactId) {
        this.loadContactAndStartChat(contactId);
      }
    });

    // Get token and connect to socket
    this.subscriptions.push(
      this.auth.getAccessTokenSilently().subscribe((token: string) => {
        this.socketService.connect(token);

        // Listen for socket connection status
        this.subscriptions.push(
          this.socketService.isConnected().subscribe((connected) => {
            if (connected) {
              console.log('Socket connected and ready for messaging');
            }
          })
        );

        // Listen for messages
        this.subscriptions.push(
          this.socketService.onMessage().subscribe((msg: ChatMessage) => {
            this.messages.push(msg);
            this.scrollToBottom();

            // If this message is from the other person, mark as seen
            if (msg.from !== this.currentUserId && this.activeRoomId) {
              this.socketService.markSeen(this.activeRoomId);
            }
          })
        );

        // Listen for room join events
        this.subscriptions.push(
          this.socketService.onJoinRoom().subscribe((roomId: string) => {
            this.activeRoomId = roomId;
            this.socketService.markSeen(roomId);

            // Load chat history
            this.socketService
              .getChatHistory(roomId)
              .subscribe((history: ChatMessage[]) => {
                this.messages = history || [];
                this.scrollToBottom();
              });
          })
        );

        // Listen for typing events
        this.subscriptions.push(
          this.socketService
            .onTyping()
            .subscribe((typingInfo: { from: string; status: string }) => {
              if (
                typingInfo.from !== this.currentUserId &&
                typingInfo.status === 'start'
              ) {
                this.typingUser = this.getContactName(typingInfo.from);

                clearTimeout(this.typingTimeout);
                this.typingTimeout = setTimeout(() => {
                  this.typingUser = '';
                }, 1500);
              }

              if (
                typingInfo.status === 'end' &&
                (this.getContactId(this.typingUser) === typingInfo.from ||
                  typingInfo.from === this.currentUserId)
              ) {
                this.typingUser = '';
              }
            })
        );

        // Listen for seen events
        this.subscriptions.push(
          this.socketService.onSeen().subscribe((data: { userId: string }) => {
            console.log('Message seen by user:', data.userId);
          })
        );
      })
    );
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    clearTimeout(this.typingTimeout);

    // Disconnect socket
    this.socketService.disconnect();
  }

  /**
   * Get user display name from Auth0 user object
   */
  private getUserDisplayName(user: User): string {
    return (
      user.name ||
      `${user.given_name || ''} ${user.family_name || ''}`.trim() ||
      (user.email as string) ||
      ''
    );
  }

  /**
   * Load user contacts
   */
  loadContacts(): void {
    this.isLoading = true;

    this.userService.getAllUsersChat().subscribe({
      next: (response) => {
        if (response && response.users) {
          // Filter out the current user and map to a simpler format
          this.contacts = response.users
            .filter((user: any) => user.auth0Id !== this.currentUserId)
            .map((user: any) => ({
              id: user.auth0Id,
              name:
                `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                user.email,
              avatar:
                user.profilePicture ||
                this.getInitialsAvatar(user.firstName, user.lastName),
              role: user.role,
              lastSeen: new Date(),
            }));

          this.filteredContacts = [...this.contacts];
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading contacts:', error);
        // Create some sample contacts for the demo
        this.contacts = [
          {
            id: 'auth0|sample1',
            name: 'John Doe',
            avatar: this.getInitialsAvatar('John', 'Doe'),
            role: 'talent',
            lastSeen: new Date(),
          },
          {
            id: 'auth0|sample2',
            name: 'Jane Smith',
            avatar: this.getInitialsAvatar('Jane', 'Smith'),
            role: 'client',
            lastSeen: new Date(),
          },
          {
            id: 'auth0|sample3',
            name: 'Alex Johnson',
            avatar: this.getInitialsAvatar('Alex', 'Johnson'),
            role: 'talent',
            lastSeen: new Date(),
          },
          {
            id: 'auth0|sample4',
            name: 'Taylor Swift',
            avatar: this.getInitialsAvatar('Taylor', 'Swift'),
            role: 'client',
            lastSeen: new Date(),
          },
        ];

        this.filteredContacts = [...this.contacts];
        this.isLoading = false;
      },
    });
  }

  /**
   * Filter contacts by search query
   */
  filterContacts(query: string): void {
    this.searchQuery = query;

    if (!query.trim()) {
      this.filteredContacts = [...this.contacts];
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredContacts = this.contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(lowerQuery) ||
        contact.role.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Select a contact to chat with
   */
  selectContact(contact: Contact): void {
    this.selectedContact = contact;
    this.messages = []; // Clear messages while loading
    this.socketService.joinRoom(contact.id);
  }

  /**
   * Send a message in the active chat
   */
  sendMessage(): void {
    if (!this.messageText.trim() || !this.activeRoomId) return;

    this.socketService.sendMessage(this.activeRoomId, this.messageText);

    // Optional: Add message to local display immediately for better UX
    this.messages.push({
      from: this.currentUserId,
      text: this.messageText,
      createdAt: new Date(),
    });

    this.messageText = '';
    this.scrollToBottom();
  }

  /**
   * Handle typing events
   */
  onInputChange(): void {
    if (!this.activeRoomId) return;

    // Send typing status
    this.socketService.sendTyping(this.activeRoomId, 'start');

    // Clear previous timeout
    clearTimeout(this.typingTimeout);

    // Set a new timeout
    this.typingTimeout = setTimeout(() => {
      this.socketService.sendTyping(this.activeRoomId, 'end');
    }, 1000);
  }

  /**
   * Toggle emoji picker
   */
  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  /**
   * Add an emoji to the message input
   */
  addEmoji(event: any): void {
    const emoji = event.emoji.native;
    this.messageText += emoji;
    this.showEmojiPicker = false;
    // Focus the input after adding emoji
    const inputElement = document.querySelector(
      '.composer-input input'
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  }

  /**
   * Get contact name from user ID
   */
  getContactName(userId: string): string {
    const contact = this.contacts.find((c) => c.id === userId);
    return contact ? contact.name : 'Unknown User';
  }

  /**
   * Get contact ID from name
   */
  getContactId(name: string): string | null {
    const contact = this.contacts.find((c) => c.name === name);
    return contact ? contact.id : null;
  }

  /**
   * Generate avatar from initials
   */
  getInitialsAvatar(
    firstName: string | undefined,
    lastName: string | undefined
  ): string {
    const firstInitial = firstName ? firstName.charAt(0) : '';
    const lastInitial = lastName ? lastName.charAt(0) : '';
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();
    return initials || '?';
  }

  /**
   * Check if a message is from the current user
   */
  isMyMessage(message: ChatMessage): boolean {
    return message.from === this.currentUserId;
  }

  /**
   * Format timestamp for messages
   */
  formatTime(date: Date | string | undefined): string {
    if (!date) return '';
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Scroll to the bottom of the message container
   */
  scrollToBottom(): void {
    if (this.messageContainer) {
      setTimeout(() => {
        const element = this.messageContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 0);
    }
  }

  loadContactAndStartChat(contactId: string): void {
    // Wait for contacts to load
    const checkAndSelect = () => {
      if (this.isLoading) {
        // If contacts are still loading, wait and try again
        setTimeout(checkAndSelect, 100);
        return;
      }

      // Find the contact in our list
      const contact = this.contacts.find((c) => c.id === contactId);
      if (contact) {
        this.selectContact(contact);
      } else {
        // Contact not found in our list, create a temporary one
        const tempContact = {
          id: contactId,
          name: 'Job Client',
          avatar: this.getInitialsAvatar('J', 'C'),
          role: 'client',
          lastSeen: new Date(),
        };

        // Add to contacts and select
        this.contacts.push(tempContact);
        this.filteredContacts = [...this.contacts];
        this.selectContact(tempContact);
      }
    };

    checkAndSelect();
  }
}
