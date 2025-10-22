# EduHub Video Service

A scalable video streaming microservice for EduHub Academy Learning Management System. This service handles video upload, storage, and delivery with Azure Blob Storage integration and CDN support.

## Features

- **Video Upload**: Upload pre-recorded lecture videos with multipart form handling
- **Azure Blob Storage**: Secure video storage with Azure Blob Storage
- **CDN Integration**: Optimized video delivery via Azure CDN
- **Secure Playback**: Generate time-limited SAS tokens for secure video access
- **Video Metadata**: Track video duration, size, format, and view counts
- **Redis Caching**: High-performance caching for frequently accessed video metadata
- **Authentication**: JWT-based authentication integrated with auth-service
- **Role-Based Access**: Teachers can upload/manage videos, students can view
- **Health Monitoring**: Built-in health checks for Kubernetes deployments
- **Horizontal Scaling**: Auto-scaling support with HPA

## Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis
- **Storage**: Azure Blob Storage
- **CDN**: Azure CDN
- **Container**: Docker
- **Orchestration**: Kubernetes
- **Video Processing**: FFmpeg for metadata extraction

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  NGINX Ingress  │
└──────┬──────────┘
       │
       ▼
┌─────────────────────────┐
│   Video Service (3+)    │
│  - Video Upload API     │
│  - Playback URL Gen     │
│  - Metadata Management  │
└──┬────────────────────┬─┘
   │                    │
   ▼                    ▼
┌──────────┐     ┌─────────────┐
│PostgreSQL│     │    Redis    │
└──────────┘     └─────────────┘
                       │
                       ▼
                ┌──────────────────┐
                │ Azure Blob + CDN │
                └──────────────────┘
```

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL 15.x
- Redis 7.x
- Azure Storage Account
- Docker (for containerization)
- Kubernetes cluster (for deployment)

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eduhub-video-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure Azure Storage**
   - Create an Azure Storage Account
   - Create a container named `videos`
   - Update `.env` with your storage credentials

5. **Start PostgreSQL and Redis** (using Docker)
   ```bash
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
   docker run -d -p 6379:6379 redis:7-alpine
   ```

6. **Run the application**
   ```bash
   # Development mode with hot reload
   npm run dev

   # Production build
   npm run build
   npm start
   ```

### Docker

```bash
# Build image
docker build -t eduhub/video-service:latest .

# Run with docker-compose
docker-compose up -d
```

### Kubernetes

```bash
# Create namespace
kubectl create namespace eduhub

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.example.yaml  # Update with real secrets first!
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3003` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `eduhub_videos` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_TTL` | Cache TTL in seconds | `3600` |
| `AZURE_STORAGE_ACCOUNT_NAME` | Azure storage account name | - |
| `AZURE_STORAGE_ACCOUNT_KEY` | Azure storage account key | - |
| `AZURE_STORAGE_CONTAINER_NAME` | Container name | `videos` |
| `AZURE_CDN_ENDPOINT` | CDN endpoint URL | - |
| `MAX_FILE_SIZE` | Max upload size in bytes | `524288000` (500MB) |
| `ALLOWED_VIDEO_FORMATS` | Allowed formats | `mp4,avi,mov,wmv,flv,mkv,webm` |
| `SAS_TOKEN_EXPIRY_HOURS` | SAS token expiry | `24` |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_ISSUER` | JWT issuer | `eduhub-auth-service` |

## API Endpoints

### Health & Monitoring

- `GET /api/v1/health` - Health check (all dependencies)
- `GET /api/v1/ready` - Readiness probe (database & Redis)
- `GET /api/v1/live` - Liveness probe

### Video Management

#### Upload Video
```http
POST /api/v1/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

title: "Introduction to Programming"
description: "First lecture in CS101"
courseId: "uuid"
video: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "video-uuid",
    "title": "Introduction to Programming",
    "courseId": "course-uuid",
    "duration": 3600,
    "fileSize": 104857600,
    "format": "mp4",
    "status": "ready"
  }
}
```

#### Get All Videos
```http
GET /api/v1/videos?courseId=<uuid>&page=1&limit=20
Authorization: Bearer <token>
```

#### Get Video by ID
```http
GET /api/v1/videos/:id
Authorization: Bearer <token>
```

#### Get Course Videos
```http
GET /api/v1/videos/course/:courseId
Authorization: Bearer <token>
```

#### Get Playback URL
```http
GET /api/v1/videos/:id/playback?expiryHours=24
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playbackUrl": "https://storage.blob.core.windows.net/videos/uuid.mp4?sas-token",
    "expiresIn": "24 hours"
  }
}
```

#### Update Video
```http
PUT /api/v1/videos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description"
}
```

#### Delete Video
```http
DELETE /api/v1/videos/:id?hard=false
Authorization: Bearer <token>
```

#### Get Video Statistics
```http
GET /api/v1/videos/stats/summary?courseId=<uuid>
Authorization: Bearer <token>
```

## Database Schema

### Videos Table
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id UUID NOT NULL,
  uploader_id UUID NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  blob_name VARCHAR(500) UNIQUE NOT NULL,
  file_size BIGINT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  format VARCHAR(50) NOT NULL,
  quality VARCHAR(10),
  thumbnail_url VARCHAR(1000),
  status VARCHAR(20) NOT NULL DEFAULT 'uploading',
  view_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_videos_course_id ON videos(course_id);
CREATE INDEX idx_videos_uploader_id ON videos(uploader_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_blob_name ON videos(blob_name);
```

## Authentication

The service uses JWT tokens issued by the `auth-service`. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Required Token Claims
- `id`: User ID
- `email`: User email
- `role`: User role (student, teacher, admin)
- `iss`: Token issuer (must be "eduhub-auth-service")

### Role-Based Access
- **Students**: Can view videos and get playback URLs
- **Teachers**: Can upload, update, and delete videos
- **Admins**: Full access to all operations

## Caching Strategy

The service uses Redis for caching with the following strategy:

- **Video metadata**: Cached for 1 hour (configurable)
- **Course videos list**: Cached for 1 hour
- **Cache invalidation**: On video create, update, or delete

Cache keys format:
- `video-service:video:<video-id>`
- `video-service:course-videos:<course-id>`

## Performance Considerations

### Upload Handling
- Max file size: 500MB (configurable)
- Multipart form data with streaming
- Temporary storage in `/app/uploads/temp`
- Automatic cleanup after upload

### Video Delivery
- CDN integration for edge caching
- SAS tokens for secure, time-limited access
- Separate playback URL endpoint to track views

### Scaling
- Stateless design for horizontal scaling
- HPA configured for 3-10 pods
- CPU target: 70%, Memory target: 80%
- Pod anti-affinity for high availability

## Monitoring & Logging

### Health Checks
- **Liveness**: Basic service availability
- **Readiness**: Database and Redis connectivity
- **Health**: Full dependency check (DB, Redis, Azure Blob)

### Logging
- Development: `morgan('dev')` - colored, concise logs
- Production: `morgan('combined')` - Apache combined format

### Metrics
The service exposes standard metrics for monitoring:
- Request count and latency
- Video upload success/failure rates
- Cache hit/miss ratios
- Storage operations

## Security

### Best Practices
- Non-root container user
- Helmet.js for security headers
- CORS configuration
- Input validation with express-validator
- SQL injection prevention (Sequelize ORM)
- Secure SAS token generation
- Environment variable secrets

### Network Security
- TLS termination at ingress
- Internal service communication over cluster network
- Rate limiting at ingress level

## Troubleshooting

### Video Upload Fails
1. Check Azure Storage credentials
2. Verify container exists and is accessible
3. Check file size limits
4. Ensure temp directory has write permissions

### Playback URL Not Working
1. Verify SAS token expiry settings
2. Check CDN configuration
3. Ensure video status is "ready"
4. Validate Azure Blob Storage permissions

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check connection string and credentials
3. Ensure database exists
4. Check network connectivity

### Redis Connection Issues
1. Verify Redis is running
2. Check Redis host and port
3. Validate authentication if enabled

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

### Database Migration
```bash
npm run migrate
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: <repository-issues-url>
- Email: support@eduhub.example.com
- Documentation: https://docs.eduhub.example.com