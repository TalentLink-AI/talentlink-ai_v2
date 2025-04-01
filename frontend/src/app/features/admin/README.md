# TalentLink Admin Portal

This directory contains the admin portal components and services for the TalentLink application.

## Overview

The admin portal provides administrative functionality for managing users, jobs, payments, and system settings. It's protected by role-based access control to ensure only authorized users can access it.

## Security Implementation

The admin portal is secured through several layers:

1. **Frontend Route Guards**: All admin routes are protected by `adminGuard` which checks if the current user has the admin role.

2. **Backend API Protection**: All admin API endpoints verify the user's role before processing requests.

3. **Separation of Concern**: Admin components are kept separate from user-facing components.

## Structure

```
src/app/features/admin/
├── components/            # Reusable admin UI components
│   ├── admin-header/      # Admin header with user info
│   └── admin-sidebar/     # Admin navigation sidebar
├── layout/                # Admin layout container
├── pages/                 # Admin pages
│   ├── dashboard/         # Dashboard page
│   ├── users/             # User management
│   ├── jobs/              # Job management
│   └── ...                # Other admin pages
├── services/              # Admin-specific services
├── admin.routes.ts        # Admin routing configuration
└── README.md              # This documentation
```

## User Roles

The system distinguishes between three user roles:

- **Talent**: Regular users looking for job opportunities
- **Client**: Users posting job opportunities
- **Admin**: System administrators with access to the admin portal

## How to Add New Admin Features

### 1. Create a New Admin Page

Create a new component in the `pages` directory:

```bash
ng generate component features/admin/pages/new-feature --standalone
```

### 2. Add the Route

Add the new route to `admin.routes.ts`:

```typescript
{
  path: 'new-feature',
  component: NewFeatureComponent
}
```

### 3. Add Navigation Item

Add a new item in the `AdminSidebarComponent`:

```typescript
navItems = [
  // ... existing items
  { label: "New Feature", route: "/admin/new-feature", icon: "feature-icon" },
];
```

### 4. Implement Backend APIs

Make sure to implement corresponding backend APIs with proper authorization checks.

## Backend Integration

The admin portal communicates with backend APIs through the `AdminService`. All API endpoints should be prefixed with `/api/admin/` to maintain clear separation from user-facing APIs.

## Best Practices

1. **Security First**: Always verify user permissions on both frontend and backend
2. **Error Handling**: Implement comprehensive error handling for admin operations
3. **Audit Logging**: Log all administrative actions for audit purposes
4. **Confirmation Dialogs**: Use confirmation dialogs for destructive operations
5. **Responsive Design**: Ensure admin interfaces work on all device sizes

## Common Issues and Solutions

### User Still Sees Admin Link Despite Not Being Admin

Check that you're correctly setting and checking the admin role in both:

- Auth0 user metadata
- Your application's user service

### 404 Errors on Admin API Endpoints

Ensure your backend has implemented all required admin API endpoints and that they follow the expected URL pattern.

## Testing Admin Features

When testing admin features, make sure to:

1. Test with both admin and non-admin accounts
2. Verify that direct URL access is properly blocked for non-admins
3. Test error scenarios and edge cases
4. Verify that all admin actions are correctly applied in the database

## Extending the Admin Portal

When adding major new sections to the admin portal, consider:

1. Creating a new module for the feature
2. Implementing dedicated services for the feature
3. Adding appropriate navigation and breadcrumbs
4. Documenting the feature in this README
