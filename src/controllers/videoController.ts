import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import videoService from '../services/videoService';
import azureBlobService from '../services/azureBlobService';
import { VideoStatus } from '../models/Video';
import path from 'path';
import fs from 'fs';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';

export class VideoController {
  async uploadVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No video file provided',
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { title, description, courseId } = req.body;

      if (!title || !courseId) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Title and courseId are required',
        });
      }

      // Get video metadata using ffprobe
      let duration = 0;
      try {
        const metadata = await ffprobe(req.file.path, { path: ffprobeStatic.path });
        duration = Math.floor(metadata.streams[0].duration || 0);
      } catch (error) {
        console.error('Error getting video metadata:', error);
      }

      // Upload to Azure Blob Storage
      const uploadResult = await azureBlobService.uploadVideo(
        req.file.path,
        req.file.originalname,
        req.file.mimetype
      );

      // Create video record in database
      const video = await videoService.create({
        title,
        description,
        courseId,
        uploaderId: req.user.id,
        fileName: req.file.originalname,
        fileUrl: uploadResult.url,
        blobName: uploadResult.blobName,
        fileSize: req.file.size,
        duration,
        format: path.extname(req.file.originalname).substring(1).toLowerCase(),
      });

      // Update status to READY after successful upload
      await videoService.updateVideoStatus(video.id, VideoStatus.READY);

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      return res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          id: video.id,
          title: video.title,
          description: video.description,
          courseId: video.courseId,
          uploaderId: video.uploaderId,
          duration: video.duration,
          fileSize: video.fileSize,
          format: video.format,
          status: VideoStatus.READY,
          createdAt: video.createdAt,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);

      // Clean up file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to upload video',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getVideoById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const video = await videoService.findById(id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: video,
      });
    } catch (error) {
      console.error('Get video error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve video',
      });
    }
  }

  async getVideos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        courseId,
        uploaderId,
        status,
        searchQuery,
        page = 1,
        limit = 20,
      } = req.query;

      const filters: any = {};
      if (courseId) filters.courseId = courseId as string;
      if (uploaderId) filters.uploaderId = uploaderId as string;
      if (status) filters.status = status as VideoStatus;
      if (searchQuery) filters.searchQuery = searchQuery as string;

      const result = await videoService.findAll(
        filters,
        parseInt(page as string, 10),
        parseInt(limit as string, 10)
      );

      return res.status(200).json({
        success: true,
        data: result.videos,
        pagination: {
          page: result.page,
          limit: parseInt(limit as string, 10),
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('Get videos error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve videos',
      });
    }
  }

  async getCourseVideos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { courseId } = req.params;

      const videos = await videoService.findByCourseId(courseId);

      return res.status(200).json({
        success: true,
        data: videos,
        count: videos.length,
      });
    } catch (error) {
      console.error('Get course videos error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve course videos',
      });
    }
  }

  async getPlaybackUrl(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { expiryHours } = req.query;

      const url = await videoService.generatePlaybackUrl(
        id,
        expiryHours ? parseInt(expiryHours as string, 10) : undefined
      );

      if (!url) {
        return res.status(404).json({
          success: false,
          message: 'Video not found or not ready for playback',
        });
      }

      // Increment view count
      await videoService.incrementViewCount(id);

      return res.status(200).json({
        success: true,
        data: {
          playbackUrl: url,
          expiresIn: expiryHours ? `${expiryHours} hours` : '24 hours',
        },
      });
    } catch (error) {
      console.error('Get playback URL error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate playback URL',
      });
    }
  }

  async updateVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { title, description, status } = req.body;

      if (!title && !description && !status) {
        return res.status(400).json({
          success: false,
          message: 'At least one field (title, description, or status) is required',
        });
      }

      const updateData: any = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status) updateData.status = status;

      const video = await videoService.update(id, updateData);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Video updated successfully',
        data: video,
      });
    } catch (error) {
      console.error('Update video error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update video',
      });
    }
  }

  async deleteVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { hard } = req.query;

      const success = await videoService.delete(id, hard === 'true');

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Video not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: hard === 'true' ? 'Video permanently deleted' : 'Video deleted successfully',
      });
    } catch (error) {
      console.error('Delete video error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete video',
      });
    }
  }

  async getVideoStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { courseId } = req.query;

      const stats = await videoService.getVideoStats(
        courseId ? (courseId as string) : undefined
      );

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get video stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve video statistics',
      });
    }
  }
}

export default new VideoController();
