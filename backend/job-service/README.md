# Job Service

This microservice handles job creation, application, and management for the TalentLink platform. It provides APIs for both clients and talents to interact with the job marketplace.

## Overview

The Job Service is integrated with your microservices architecture, handling:

- Job posting and management
- Job applications
- Job status transitions (published → assigned → completed)
- Integration with payment service for milestone payments

## Setup Guide

### Prerequisites

- Node.js 18+
- MongoDB
- Connection to the payment service for milestone actions

### Environment Variables

```
# Server configuration
PORT=3003
NODE_ENV=development
LOG_LEVEL=info
MONGODB_URI=mongodb://mongodb:27017/talentlink

# Application configuration
API_PREFIX=/api
CORS_ORIGINS=http://localhost:3000,http://localhost:4200
```

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Docker Setup

```bash
# Build the Docker image
docker build -t job-service .

# Run with Docker
docker run -p 3003:3003 --env-file .env job-service

# Run with Docker Compose
docker-compose up -d
```

## API Endpoints

### Jobs

- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:id` - Get job details
- `GET /api/jobs/client/:clientId` - Get jobs posted by a client
- `GET /api/jobs/available` - Get available jobs for talents
- `POST /api/jobs` - Create a new job
- `PUT /api/jobs/:id` - Update a job
- `PATCH /api/jobs/:id/status` - Update job status
- `DELETE /api/jobs/:id` - Delete a job (only draft or cancelled jobs)

### Applications

- `GET /api/applications` - List all applications
- `GET /api/applications/:id` - Get application details
- `GET /api/applications/job/:jobId` - Get applications for a job
- `GET /api/applications/talent/:talentId` - Get applications by a talent
- `POST /api/applications` - Create a job application
- `PATCH /api/applications/:id/accept` - Accept an application
- `PATCH /api/applications/:id/reject` - Reject an application

## Models

### Job

```javascript
{
  title: String,          // Job title
  description: String,    // Job description
  budget: Number,         // Job budget
  status: String,         // 'draft', 'published', 'assigned', 'completed', 'cancelled'
  clientId: String,       // ID of the client who posted the job
  assignedTo: String,     // ID of the talent assigned to the job (if status is 'assigned' or 'completed')
  applications: [String], // IDs of applications for this job
  createdAt: Date,
  updatedAt: Date
}
```

### Application

```javascript
{
  jobId: String,          // ID of the job being applied to
  talentId: String,       // ID of the talent applying
  coverLetter: String,    // Cover letter/message
  status: String,         // 'pending', 'accepted', 'rejected'
  createdAt: Date
}
```

## Integration with Other Services

- **User Service**: Validates user IDs and roles
- **Payment Service**: Creates and manages milestone payments for jobs

## Security

All endpoints are protected with JWT authentication through the API Gateway.
