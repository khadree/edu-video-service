import Video, { VideoStatus } from '../models/Video';
import azureBlobService from './azureBlobService';
import cacheService from './cacheService';
import { Op } from 'sequelize';

export interface CreateVideoDto {
  title: string;
  description?: string;
  courseId: string;
  uploaderId: string;
  fileName: string;
  fileUrl: string;
  blobName: string;
  fileSize: number;
  duration: number;
  format: string;
}

export interface UpdateVideoDto {
  title?: string;
  description?: string;
  status?: VideoStatus;
}

export interface VideoFilters {
  courseId?: string;
  uploaderId?: string;
  status?: VideoStatus;
  searchQuery?: string;
}

class VideoService {
  private getCacheKey(id: string): string {
    return cacheService.generateKey('video', id);
  }

  private getCourseVideosKey(courseId: string): string {
    return cacheService.generateKey('course-videos', courseId);
  }

  async create(videoData: CreateVideoDto): Promise<Video> {
    const video = await Video.create(videoData);

    // Cache the created video
    await cacheService.set(this.getCacheKey(video.id), video.toJSON());

    // Invalidate course videos cache
    await cacheService.del(this.getCourseVideosKey(videoData.courseId));

    return video;
  }

  async findById(id: string, useCache: boolean = true): Promise<Video | null> {
    if (useCache) {
      const cached = await cacheService.get<Video>(this.getCacheKey(id));
      if (cached) {
        return Video.build(cached, { isNewRecord: false });
      }
    }

    const video = await Video.findByPk(id);

    if (video && useCache) {
      await cacheService.set(this.getCacheKey(id), video.toJSON());
    }

    return video;
  }

  async findAll(
    filters: VideoFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ videos: Video[]; total: number; page: number; totalPages: number }> {
    const where: any = {};

    if (filters.courseId) {
      where.courseId = filters.courseId;
    }

    if (filters.uploaderId) {
      where.uploaderId = filters.uploaderId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.searchQuery) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${filters.searchQuery}%` } },
        { description: { [Op.iLike]: `%${filters.searchQuery}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Video.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(count / limit);

    return {
      videos: rows,
      total: count,
      page,
      totalPages,
    };
  }

  async findByCourseId(courseId: string, useCache: boolean = true): Promise<Video[]> {
    if (useCache) {
      const cached = await cacheService.get<Video[]>(this.getCourseVideosKey(courseId));
      if (cached) {
        return cached.map(v => Video.build(v, { isNewRecord: false }));
      }
    }

    const videos = await Video.findAll({
      where: { courseId, status: VideoStatus.READY },
      order: [['createdAt', 'DESC']],
    });

    if (useCache) {
      await cacheService.set(this.getCourseVideosKey(courseId), videos.map(v => v.toJSON()));
    }

    return videos;
  }

  async update(id: string, updateData: UpdateVideoDto): Promise<Video | null> {
    const video = await Video.findByPk(id);

    if (!video) {
      return null;
    }

    await video.update(updateData);

    // Update cache
    await cacheService.set(this.getCacheKey(id), video.toJSON());

    // Invalidate course videos cache
    await cacheService.del(this.getCourseVideosKey(video.courseId));

    return video;
  }

  async delete(id: string, hardDelete: boolean = false): Promise<boolean> {
    const video = await Video.findByPk(id);

    if (!video) {
      return false;
    }

    // Delete from Azure Blob Storage
    try {
      await azureBlobService.deleteVideo(video.blobName);
    } catch (error) {
      console.error('Error deleting video from blob storage:', error);
    }

    if (hardDelete) {
      await video.destroy({ force: true });
    } else {
      await video.update({ status: VideoStatus.DELETED });
      await video.destroy(); // Soft delete
    }

    // Clear cache
    await cacheService.del(this.getCacheKey(id));
    await cacheService.del(this.getCourseVideosKey(video.courseId));

    return true;
  }

  async incrementViewCount(id: string): Promise<boolean> {
    const video = await Video.findByPk(id);

    if (!video) {
      return false;
    }

    await video.increment('viewCount');

    // Update cache with new view count
    const updated = await Video.findByPk(id);
    if (updated) {
      await cacheService.set(this.getCacheKey(id), updated.toJSON());
    }

    return true;
  }

  async generatePlaybackUrl(id: string, expiryHours?: number): Promise<string | null> {
    const video = await this.findById(id);

    if (!video || video.status !== VideoStatus.READY) {
      return null;
    }

    // Check if CDN is configured
    const cdnUrl = azureBlobService.getCDNUrl(video.blobName);
    if (cdnUrl !== video.fileUrl) {
      return cdnUrl; // Return CDN URL if available
    }

    // Generate SAS URL for secure access
    return azureBlobService.generateSASUrl(video.blobName, { expiryHours });
  }

  async updateVideoStatus(id: string, status: VideoStatus): Promise<Video | null> {
    return this.update(id, { status });
  }

  async getVideoStats(courseId?: string): Promise<{
    totalVideos: number;
    totalSize: number;
    totalDuration: number;
    totalViews: number;
  }> {
    const where: any = {};
    if (courseId) {
      where.courseId = courseId;
    }

    const videos = await Video.findAll({ where });

    return {
      totalVideos: videos.length,
      totalSize: videos.reduce((sum, v) => sum + Number(v.fileSize), 0),
      totalDuration: videos.reduce((sum, v) => sum + v.duration, 0),
      totalViews: videos.reduce((sum, v) => sum + v.viewCount, 0),
    };
  }
}

export default new VideoService();
