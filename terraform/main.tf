provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "${var.project_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment == "production" ? false : true
  one_nat_gateway_per_az = var.environment == "production" ? true : false

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group for API Gateway ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-alb-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_security_group" "ecs_services" {
  name        = "${var.project_name}-ecs-services-sg"
  description = "Security group for ECS services"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-ecs-services-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_security_group" "mongodb" {
  name        = "${var.project_name}-mongodb-sg"
  description = "Security group for MongoDB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_services.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-mongodb-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# S3 Bucket for Frontend
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.s3_cloudfront_policy.json
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "OAI for ${var.project_name} frontend"
}

data "aws_iam_policy_document" "s3_cloudfront_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.frontend.iam_arn]
    }
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# DocumentDB Cluster
resource "aws_docdb_cluster" "main" {
  count                  = var.use_documentdb ? 1 : 0
  cluster_identifier     = "${var.project_name}-docdb-${var.environment}"
  engine                 = "docdb"
  master_username        = var.mongodb_username
  master_password        = var.mongodb_password
  db_subnet_group_name   = aws_docdb_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.mongodb.id]
  skip_final_snapshot    = var.environment == "production" ? false : true

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_docdb_subnet_group" "main" {
  count      = var.use_documentdb ? 1 : 0
  name       = "${var.project_name}-docdb-subnet-group-${var.environment}"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_docdb_cluster_instance" "main" {
  count              = var.use_documentdb ? var.docdb_instance_count : 0
  identifier         = "${var.project_name}-docdb-instance-${count.index}-${var.environment}"
  cluster_identifier = aws_docdb_cluster.main[0].id
  instance_class     = var.docdb_instance_class

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# EC2 MongoDB (for development/staging)
resource "aws_instance" "mongodb" {
  count                       = var.use_documentdb ? 0 : 1
  ami                         = var.mongodb_ami
  instance_type               = var.mongodb_instance_type
  subnet_id                   = module.vpc.private_subnets[0]
  vpc_security_group_ids      = [aws_security_group.mongodb.id]
  associate_public_ip_address = false
  key_name                    = var.key_name

  root_block_device {
    volume_size           = 50
    volume_type           = "gp2"
    delete_on_termination = false
  }

  tags = {
    Name        = "${var.project_name}-mongodb-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Application Load Balancer for API Gateway
resource "aws_lb" "api" {
  name               = "${var.project_name}-api-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_lb_target_group" "api_gateway" {
  name        = "${var.project_name}-api-gateway-tg-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    interval            = 30
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.api.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }
}

# ECR Repositories
resource "aws_ecr_repository" "api_gateway" {
  name                 = "${var.project_name}/api-gateway"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ecr_repository" "user_service" {
  name                 = "${var.project_name}/user-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ecr_repository" "job_service" {
  name                 = "${var.project_name}/job-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ecr_repository" "payment_service" {
  name                 = "${var.project_name}/payment-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ecr_repository" "messaging_service" {
  name                 = "${var.project_name}/messaging-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ecr_repository" "content_service" {
  name                 = "${var.project_name}/content-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECS IAM Roles and Policies
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-task-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# API Gateway ECS Service and Task Definition
resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "${var.project_name}-api-gateway-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_gateway_cpu
  memory                   = var.api_gateway_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "api-gateway"
      image     = "${aws_ecr_repository.api_gateway.repository_url}:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3000" },
        { name = "USER_SERVICE_URL", value = "http://user-service.${var.project_name}.internal:3001" },
        { name = "JOB_SERVICE_URL", value = "http://job-service.${var.project_name}.internal:3002" },
        { name = "PAYMENT_SERVICE_URL", value = "http://payment-service.${var.project_name}.internal:3003" },
        { name = "MESSAGING_SERVICE_URL", value = "http://messaging-service.${var.project_name}.internal:3004" },
        { name = "CONTENT_SERVICE_URL", value = "http://content-service.${var.project_name}.internal:3005" },
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-api-gateway-${var.environment}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ecs_service" "api_gateway" {
  name                               = "${var.project_name}-api-gateway-service-${var.environment}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.api_gateway.arn
  desired_count                      = var.api_gateway_count
  launch_type                        = "FARGATE"
  scheduling_strategy                = "REPLICA"
  health_check_grace_period_seconds  = 60
  
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_services.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_listener.https
  ]

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Create CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/ecs/${var.project_name}-api-gateway-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Additional microservices would be defined similarly

# Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "cloudfront_distribution_domain" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "api_load_balancer_dns" {
  description = "The DNS name of the API load balancer"
  value       = aws_lb.api.dns_name
}

output "mongodb_connection_string" {
  description = "MongoDB connection string"
  value       = var.use_documentdb ? "mongodb://${var.mongodb_username}:${var.mongodb_password}@${aws_docdb_cluster.main[0].endpoint}:27017/?retryWrites=false" : "mongodb://${aws_instance.mongodb[0].private_ip}:27017"
  sensitive   = true
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    api_gateway      = aws_ecr_repository.api_gateway.repository_url
    user_service     = aws_ecr_repository.user_service.repository_url
    job_service      = aws_ecr_repository.job_service.repository_url
    payment_service  = aws_ecr_repository.payment_service.repository_url
    messaging_service = aws_ecr_repository.messaging_service.repository_url
    content_service  = aws_ecr_repository.content_service.repository_url
  }
}