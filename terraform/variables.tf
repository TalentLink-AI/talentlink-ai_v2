variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "The deployment environment (development, staging, production)"
  type        = string
  default     = "development"
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "talentlink"
}

# MongoDB Configuration
variable "use_documentdb" {
  description = "Whether to use Amazon DocumentDB instead of EC2 MongoDB"
  type        = bool
  default     = false
}

variable "mongodb_username" {
  description = "The username for MongoDB/DocumentDB"
  type        = string
  default     = "talentlink_admin"
  sensitive   = true
}

variable "mongodb_password" {
  description = "The password for MongoDB/DocumentDB"
  type        = string
  sensitive   = true
}

variable "mongodb_ami" {
  description = "The AMI ID for MongoDB EC2 instance"
  type        = string
  default     = "ami-0c55b159cbfafe1f0" # Amazon Linux 2 AMI (update with correct AMI for your region)
}

variable "mongodb_instance_type" {
  description = "The instance type for MongoDB EC2 instance"
  type        = string
  default     = "t3.medium"
}

variable "docdb_instance_count" {
  description = "The number of DocumentDB instances"
  type        = number
  default     = 1
}

variable "docdb_instance_class" {
  description = "The instance class for DocumentDB"
  type        = string
  default     = "db.t3.medium"
}

# API Gateway Configuration
variable "api_gateway_cpu" {
  description = "CPU units for the API Gateway task"
  type        = string
  default     = "256"
}

variable "api_gateway_memory" {
  description = "Memory for the API Gateway task"
  type        = string
  default     = "512"
}

variable "api_gateway_count" {
  description = "Number of API Gateway tasks"
  type        = number
  default     = 2
}

# User Service Configuration
variable "user_service_cpu" {
  description = "CPU units for the User Service task"
  type        = string
  default     = "256"
}

variable "user_service_memory" {
  description = "Memory for the User Service task"
  type        = string
  default     = "512"
}

variable "user_service_count" {
  description = "Number of User Service tasks"
  type        = number
  default     = 2
}

# Job Service Configuration
variable "job_service_cpu" {
  description = "CPU units for the Job Service task"
  type        = string
  default     = "256"
}

variable "job_service_memory" {
  description = "Memory for the Job Service task"
  type        = string
  default     = "512"
}

variable "job_service_count" {
  description = "Number of Job Service tasks"
  type        = number
  default     = 2
}

# Payment Service Configuration
variable "payment_service_cpu" {
  description = "CPU units for the Payment Service task"
  type        = string
  default     = "256"
}

variable "payment_service_memory" {
  description = "Memory for the Payment Service task"
  type        = string
  default     = "512"
}

variable "payment_service_count" {
  description = "Number of Payment Service tasks"
  type        = number
  default     = 2
}

# Messaging Service Configuration
variable "messaging_service_cpu" {
  description = "CPU units for the Messaging Service task"
  type        = string
  default     = "256"
}

variable "messaging_service_memory" {
  description = "Memory for the Messaging Service task"
  type        = string
  default     = "512"
}

variable "messaging_service_count" {
  description = "Number of Messaging Service tasks"
  type        = number
  default     = 2
}

# Content Service Configuration
variable "content_service_cpu" {
  description = "CPU units for the Content Service task"
  type        = string
  default     = "256"
}

variable "content_service_memory" {
  description = "Memory for the Content Service task"
  type        = string
  default     = "512"
}

variable "content_service_count" {
  description = "Number of Content Service tasks"
  type        = number
  default     = 2
}

# SSL Certificate
variable "certificate_arn" {
  description = "The ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

# EC2 Key Pair
variable "key_name" {
  description = "The name of the key pair for EC2 instances"
  type        = string
  default     = ""
}

# CloudWatch Logs
variable "log_retention_days" {
  description = "Number of days to retain logs in CloudWatch"
  type        = number
  default     = 30
}