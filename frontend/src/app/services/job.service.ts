// src/app/services/job.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserService } from './user.service';

export interface Job {
  id: string;
  clientId: string;
  title: string;
  description: string;
  budget: number;
  status: 'draft' | 'published' | 'assigned' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  applicants?: string[];
}

export interface JobApplication {
  jobId: string;
  talentId: string;
  coverLetter?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class JobService {
  // For this MVP, we'll use in-memory storage instead of real API calls
  private jobs = new BehaviorSubject<Job[]>([]);
  private applications = new BehaviorSubject<JobApplication[]>([]);

  constructor(private http: HttpClient, private userService: UserService) {
    // Initialize with some dummy data
    this.loadMockData();
  }

  private loadMockData(): void {
    // Create a few sample jobs
    const mockJobs: Job[] = [
      {
        id: 'job-1',
        clientId: 'client-123',
        title: 'Website Development',
        description: 'Build a responsive website for a small business',
        budget: 1500,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        applicants: [],
      },
      {
        id: 'job-2',
        clientId: 'client-123',
        title: 'Logo Design',
        description: 'Create a modern logo for tech startup',
        budget: 500,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        applicants: [],
      },
    ];

    this.jobs.next(mockJobs);
  }

  // Get all jobs
  getJobs(): Observable<Job[]> {
    // Return the current value and future updates
    return this.jobs.asObservable();
  }

  // Get a specific job by ID
  getJobById(id: string): Observable<Job | undefined> {
    console.log('Looking for job with ID:', id);
    console.log('Available jobs:', this.jobs.value);
    return of(this.jobs.value.find((job) => job.id === id));
  }

  // Get jobs created by a specific client
  getJobsByClient(clientId: string): Observable<Job[]> {
    const clientJobs = this.jobs.value.filter(
      (job) => job.clientId === clientId
    );
    console.log(`Jobs for client ${clientId}:`, clientJobs);
    return of(clientJobs);
  }

  // Get jobs that a talent can apply to (not assigned yet)
  getAvailableJobs(): Observable<Job[]> {
    const availableJobs = this.jobs.value.filter(
      (job) => job.status === 'published'
    );
    console.log('Available jobs for talents:', availableJobs);
    return of(availableJobs);
  }

  // Create a new job
  createJob(job: Partial<Job>): Observable<Job> {
    // Create a simpler job ID for testing (e.g., "job-1", "job-2")
    const currentJobCount = this.jobs.value.length;
    const jobId = `job-${currentJobCount + 1}`;

    const newJob: Job = {
      id: jobId,
      clientId: job.clientId || 'client-123',
      title: job.title || 'Untitled Job',
      description: job.description || 'No description provided',
      budget: job.budget || 0,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
      applicants: [],
    };

    // Store the new job in the current jobs array
    const currentJobs = this.jobs.value;

    // Check if we already have a job with this ID to avoid duplicates
    const existingJobIndex = currentJobs.findIndex((j) => j.id === newJob.id);
    if (existingJobIndex >= 0) {
      currentJobs[existingJobIndex] = newJob;
    } else {
      currentJobs.push(newJob);
    }

    // Update the BehaviorSubject with the new array
    this.jobs.next([...currentJobs]);

    // Log for debugging
    console.log('Jobs after creation:', this.jobs.value);

    return of(newJob);
  }

  // Update a job
  updateJob(id: string, updates: Partial<Job>): Observable<Job | undefined> {
    const currentJobs = this.jobs.value;
    const jobIndex = currentJobs.findIndex((job) => job.id === id);

    if (jobIndex === -1) {
      return of(undefined);
    }

    const updatedJob = {
      ...currentJobs[jobIndex],
      ...updates,
      updatedAt: new Date(),
    };

    currentJobs[jobIndex] = updatedJob;
    this.jobs.next([...currentJobs]);

    return of(updatedJob);
  }

  // Apply to a job
  applyToJob(
    jobId: string,
    talentId: string,
    coverLetter?: string
  ): Observable<JobApplication> {
    // Add talent to job's applicants list
    const currentJobs = this.jobs.value;
    const jobIndex = currentJobs.findIndex((job) => job.id === jobId);

    if (jobIndex !== -1) {
      const job = currentJobs[jobIndex];
      job.applicants = job.applicants || [];

      if (!job.applicants.includes(talentId)) {
        job.applicants.push(talentId);
        currentJobs[jobIndex] = job;
        this.jobs.next([...currentJobs]);
      }
    }

    // Create application
    const application: JobApplication = {
      jobId,
      talentId,
      coverLetter,
      status: 'pending',
      createdAt: new Date(),
    };

    const currentApplications = this.applications.value;
    this.applications.next([...currentApplications, application]);

    return of(application);
  }

  // Accept a job application (client accepts a talent's application)
  acceptApplication(
    jobId: string,
    talentId: string
  ): Observable<Job | undefined> {
    // Update job status to assigned
    const currentJobs = this.jobs.value;
    const jobIndex = currentJobs.findIndex((job) => job.id === jobId);

    if (jobIndex === -1) {
      return of(undefined);
    }

    const updatedJob = {
      ...currentJobs[jobIndex],
      status: 'assigned' as const,
      assignedTo: talentId,
      updatedAt: new Date(),
    };

    currentJobs[jobIndex] = updatedJob;
    this.jobs.next([...currentJobs]);

    // Update application status
    const currentApplications = this.applications.value;
    const updatedApplications = currentApplications.map((app) => {
      if (app.jobId === jobId) {
        if (app.talentId === talentId) {
          return { ...app, status: 'accepted' as const };
        } else {
          return { ...app, status: 'rejected' as const };
        }
      }
      return app;
    });

    this.applications.next(updatedApplications);

    return of(updatedJob);
  }

  // Get job applications for a specific job
  getApplicationsForJob(jobId: string): Observable<JobApplication[]> {
    return of(this.applications.value.filter((app) => app.jobId === jobId));
  }

  // Get job applications by a talent
  getApplicationsByTalent(talentId: string): Observable<JobApplication[]> {
    return of(
      this.applications.value.filter((app) => app.talentId === talentId)
    );
  }

  // Get assigned jobs for a talent
  getAssignedJobs(talentId: string): Observable<Job[]> {
    return of(this.jobs.value.filter((job) => job.assignedTo === talentId));
  }

  // Complete a job
  completeJob(jobId: string): Observable<Job | undefined> {
    return this.updateJob(jobId, { status: 'completed' });
  }
}
