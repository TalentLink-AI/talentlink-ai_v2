# TalentLink - Talent Marketplace Platform

TalentLink is a comprehensive platform that connects talented professionals with companies looking for skilled workers. It features a microservices architecture with separate services for user management, job listings, messaging, payments, and content.

## Project Structure

The project is organized as follows:

```
talentlink/
├── frontend/               # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/       # Core functionality (guards, interceptors)
│   │   │   ├── features/   # Feature modules
│   │   │   │   ├── admin/  # Admin portal
│   │   │   │   ├── home/   # Homepage
│   │   │   │   ├── profile/# User profiles
│   │   │   │   └── ...     # Other features
│   │   │   ├── shared/     # Shared components
│   │   │   └── services/   # Application services
│   │   ├── styles/         # Global styles
│   │   └── ...
│   └── ...
├── backend/                # Backend services
│   ├── api-gateway/        # API Gateway
│   ├── user-service/       # User management service
│   ├── job-service/        # Job listing service
│   ├── payment-service/    # Payment processing service
│   └── ...                 # Other services
└── terraform/              # Infrastructure as code
```

## Features

- **User Management**: Authentication, profile management, and role-based access control
- **Job Marketplace**: Post, browse, and apply for jobs
- **Messaging**: In-platform communication
- **Payments**: Secure payment processing
- **Admin Portal**: Administrative tools and dashboards

## Technology Stack

- **Frontend**:

  - Angular 19+ with standalone components
  - Auth0 for authentication
  - SCSS for styling

- **Backend**:

  - Node.js with Express
  - MongoDB for database
  - Microservices architecture

- **DevOps**:
  - Docker for containerization
  - AWS for hosting
  - Terraform for infrastructure
  - GitHub Actions for CI/CD

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- MongoDB (or use the containerized version)

### Running Locally

1. Clone the repository

```bash
git clone https://github.com/your-org/talentlink.git
cd talentlink
```

2. Install dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development environment

```bash
docker-compose up
```

5. Access the application

- Frontend: http://localhost:4200
- API Gateway: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs

## Admin Portal

The admin portal is accessible at `/admin` and protected by role-based access control. Only users with the `admin` role can access it.

### Features

- **Dashboard**: Overview of key metrics
- **User Management**: View, edit, and manage user accounts
- **Job Management**: Monitor and moderate job listings
- **Payment Processing**: Track and manage payments
- **Content Moderation**: Review and moderate platform content
- **System Settings**: Configure platform settings

### Security

The admin portal implements multiple layers of security:

1. **Authentication**: Via Auth0
2. **Authorization**: Role-based access control
3. **Route Guards**: Frontend protection
4. **API Security**: Backend validation of admin privileges
5. **Audit Logging**: All admin actions are logged

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Frontend Guide](frontend/README.md)
- [Backend Guide](backend/README.md)
- [Admin Portal](frontend/src/app/features/admin/README.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
