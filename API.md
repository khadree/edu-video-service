# Video Service API Documentation

Base URL: `http://localhost:3003/api/v1` (Development)

## Table of Contents
1. [Authentication](#authentication)
2. [Health Endpoints](#health-endpoints)
3. [Video Endpoints](#video-endpoints)
4. [Error Handling](#error-handling)

## Authentication

All video endpoints (except health checks) require JWT authentication.

Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Token Claims
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "teacher|student|admin",
  "iss": "eduhub-auth-service"
}
```

## Health Endpoints

### Health Check
**GET** `/health`

Checks the health of all service dependencies.

**Response:** `200 OK`
```json
{
  "status": "UP",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "video-service",
  "uptime": 3600,
  "checks": {
    "database": "UP",
    "redis": "UP",
    "azureBlob": "UP"
  }
}
```

### Readiness Probe
**GET** `/ready`

Kubernetes readiness probe.

**Response:** `200 OK`
```json
{
  "ready": true,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Liveness Probe
**GET** `/live`

Kubernetes liveness probe.

**Response:** `200 OK`
```json
{
  "alive": true,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Video Endpoints

### Upload Video
**POST** `/videos/upload`

Upload a new video lecture.

**Authorization:** Required (Teacher/Admin)

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Video title (max 255 chars) |
| description | string | No | Video description |
| courseId | UUID | Yes | Course ID |
| video | file | Yes | Video file (max 500MB) |

**Supported Formats:** mp4, avi, mov, wmv, flv, mkv, webm

**Example using cURL:**
```bash
curl -X POST http://localhost:3003/api/v1/videos/upload \
  -H "Authorization: Bearer <token>" \
  -F "title=Introduction to Programming" \
  -F "description=First lecture" \
  -F "courseId=123e4567-e89b-12d3-a456-426614174000" \
  -F "video=@/path/to/video.mp4"
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "video-uuid",
    "title": "Introduction to Programming",
    "description": "First lecture",
    "courseId": "course-uuid",
    "uploaderId": "user-uuid",
    "duration": 3600,
    "fileSize": 104857600,
    "format": "mp4",
    "status": "ready",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid file format
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `413 Payload Too Large` - File size exceeds limit
- `500 Internal Server Error` - Upload failed

---

### Get All Videos
**GET** `/videos`

Retrieve a paginated list of videos with optional filters.

**Authorization:** Required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | No | Filter by course |
| uploaderId | UUID | No | Filter by uploader |
| status | string | No | Filter by status (uploading, processing, ready, failed, deleted) |
| searchQuery | string | No | Search in title and description |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |

**Example:**
```bash
curl -X GET "http://localhost:3003/api/v1/videos?courseId=course-uuid&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "video-uuid",
      "title": "Introduction to Programming",
      "description": "First lecture",
      "courseId": "course-uuid",
      "uploaderId": "user-uuid",
      "fileName": "lecture1.mp4",
      "fileSize": 104857600,
      "duration": 3600,
      "format": "mp4",
      "status": "ready",
      "viewCount": 42,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

### Get Video by ID
**GET** `/videos/:id`

Retrieve details of a specific video.

**Authorization:** Required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Video ID |

**Example:**
```bash
curl -X GET http://localhost:3003/api/v1/videos/video-uuid \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "video-uuid",
    "title": "Introduction to Programming",
    "description": "First lecture",
    "courseId": "course-uuid",
    "uploaderId": "user-uuid",
    "fileName": "lecture1.mp4",
    "fileUrl": "https://storage.blob.core.windows.net/videos/uuid.mp4",
    "blobName": "uuid.mp4",
    "fileSize": 104857600,
    "duration": 3600,
    "format": "mp4",
    "quality": "1080p",
    "thumbnailUrl": null,
    "status": "ready",
    "viewCount": 42,
    "metadata": {},
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Video not found

---

### Get Course Videos
**GET** `/videos/course/:courseId`

Retrieve all videos for a specific course.

**Authorization:** Required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| courseId | UUID | Course ID |

**Example:**
```bash
curl -X GET http://localhost:3003/api/v1/videos/course/course-uuid \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "video-uuid-1",
      "title": "Lecture 1",
      "duration": 3600,
      "format": "mp4",
      "status": "ready"
    },
    {
      "id": "video-uuid-2",
      "title": "Lecture 2",
      "duration": 3200,
      "format": "mp4",
      "status": "ready"
    }
  ],
  "count": 2
}
```

---

### Get Playback URL
**GET** `/videos/:id/playback`

Generate a secure, time-limited URL for video playback.

**Authorization:** Required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Video ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| expiryHours | number | No | Hours until URL expires (default: 24) |

**Example:**
```bash
curl -X GET "http://localhost:3003/api/v1/videos/video-uuid/playback?expiryHours=12" \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "playbackUrl": "https://cdn.example.com/videos/uuid.mp4?sv=2021-06-08&st=...",
    "expiresIn": "12 hours"
  }
}
```

**Notes:**
- This endpoint automatically increments the view count
- The returned URL is a SAS (Shared Access Signature) token URL valid for the specified duration
- If CDN is configured, the CDN URL is returned instead

**Error Responses:**
- `404 Not Found` - Video not found or not ready for playback

---

### Update Video
**PUT** `/videos/:id`

Update video metadata.

**Authorization:** Required (Teacher/Admin)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Video ID |

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "ready"
}
```

**All fields are optional, but at least one must be provided.**

**Example:**
```bash
curl -X PUT http://localhost:3003/api/v1/videos/video-uuid \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "New description"
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Video updated successfully",
  "data": {
    "id": "video-uuid",
    "title": "Updated Title",
    "description": "New description",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - No fields provided or invalid data
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Video not found

---

### Delete Video
**DELETE** `/videos/:id`

Delete a video (soft delete by default).

**Authorization:** Required (Teacher/Admin)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Video ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hard | boolean | No | Permanent deletion if true (default: false) |

**Example (Soft Delete):**
```bash
curl -X DELETE http://localhost:3003/api/v1/videos/video-uuid \
  -H "Authorization: Bearer <token>"
```

**Example (Hard Delete):**
```bash
curl -X DELETE "http://localhost:3003/api/v1/videos/video-uuid?hard=true" \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

**Notes:**
- Soft delete marks the video as deleted but keeps the record
- Hard delete permanently removes the video from database and Azure Blob Storage
- Both operations clear related cache entries

**Error Responses:**
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Video not found

---

### Get Video Statistics
**GET** `/videos/stats/summary`

Get aggregate statistics for videos.

**Authorization:** Required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | No | Filter statistics by course |

**Example:**
```bash
curl -X GET "http://localhost:3003/api/v1/videos/stats/summary?courseId=course-uuid" \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalVideos": 25,
    "totalSize": 5368709120,
    "totalDuration": 90000,
    "totalViews": 1250
  }
}
```

**Fields:**
- `totalVideos`: Total number of videos
- `totalSize`: Total storage size in bytes
- `totalDuration`: Total duration in seconds
- `totalViews`: Total view count across all videos

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or missing required fields |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 413 | Payload Too Large - File size exceeds limit |
| 500 | Internal Server Error - Server-side error |
| 503 | Service Unavailable - Service or dependencies down |

### Common Error Scenarios

#### Authentication Errors
```json
{
  "success": false,
  "message": "No token provided"
}
```

#### Validation Errors
```json
{
  "success": false,
  "message": "Title and courseId are required"
}
```

#### File Upload Errors
```json
{
  "success": false,
  "message": "File too large. Maximum size: 500MB"
}
```

#### Not Found Errors
```json
{
  "success": false,
  "message": "Video not found"
}
```

---

## Rate Limiting

Rate limiting is enforced at the NGINX Ingress level:
- Standard endpoints: 100 requests/minute
- Upload endpoint: 10 requests/minute

Exceeding rate limits returns `429 Too Many Requests`.

---

## Best Practices

1. **Always check response status codes** - Don't rely solely on the `success` field
2. **Handle errors gracefully** - Implement retry logic for transient failures
3. **Use appropriate token expiry** - For playback URLs, balance security with user experience
4. **Implement pagination** - For list endpoints, use reasonable page sizes
5. **Cache playback URLs** - Client-side caching can reduce API calls
6. **Monitor upload progress** - For large files, implement progress tracking
7. **Validate files client-side** - Check format and size before uploading

---

## Examples

### Complete Upload Flow (JavaScript)
```javascript
async function uploadVideo(token, videoFile, metadata) {
  const formData = new FormData();
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('courseId', metadata.courseId);
  formData.append('video', videoFile);

  try {
    const response = await fetch('http://localhost:3003/api/v1/videos/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      console.log('Upload successful:', result.data);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Fetch and Play Video (JavaScript)
```javascript
async function getVideoPlaybackUrl(token, videoId) {
  try {
    const response = await fetch(
      `http://localhost:3003/api/v1/videos/${videoId}/playback?expiryHours=24`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const result = await response.json();

    if (result.success) {
      const videoElement = document.getElementById('video-player');
      videoElement.src = result.data.playbackUrl;
      return result.data.playbackUrl;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Failed to get playback URL:', error);
    throw error;
  }
}
```

---

## Changelog

### v1.0.0 (2025-01-15)
- Initial API release
- Video upload with Azure Blob Storage
- Secure playback URL generation
- CRUD operations for videos
- Statistics endpoint
- Health monitoring endpoints
