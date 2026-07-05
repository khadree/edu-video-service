import { Router, Response } from 'express';
import videoController from '../controllers/videoController';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { upload, handleUploadErrors } from '../middleware/upload';

const router = Router();

// Upload video (teachers only)
router.post(
  '/upload',
  authenticate,
  authorize('teacher', 'admin'),
  upload.single('video'),
  handleUploadErrors,
  (req: AuthRequest, res: Response) => videoController.uploadVideo(req, res)
);

// Get all videos (with filters)
router.get('/', authenticate, (req: AuthRequest, res: Response) =>
  videoController.getVideos(req, res)
);

// Get video by ID
router.get('/:id', authenticate, (req: AuthRequest, res: Response) =>
  videoController.getVideoById(req, res)
);

// Get videos by course ID
router.get('/course/:courseId', authenticate, (req: AuthRequest, res: Response) =>
  videoController.getCourseVideos(req, res)
);

// Get playback URL
router.get('/:id/playback', authenticate, (req: AuthRequest, res: Response) =>
  videoController.getPlaybackUrl(req, res)
);

// Update video (teachers/admins only)
router.put(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  (req: AuthRequest, res: Response) => videoController.updateVideo(req, res)
);

// Delete video (teachers/admins only)
router.delete(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  (req: AuthRequest, res: Response) => videoController.deleteVideo(req, res)
);

// Get video statistics
router.get('/stats/summary', authenticate, (req: AuthRequest, res: Response) =>
  videoController.getVideoStats(req, res)
);

export default router;