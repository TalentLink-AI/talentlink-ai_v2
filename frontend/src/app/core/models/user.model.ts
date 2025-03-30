export interface User {
  _id: string;
  auth0Id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: 'client' | 'talent' | 'admin';
  isActive: boolean;
  profileComplete: boolean;
  profilePicture?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
}
