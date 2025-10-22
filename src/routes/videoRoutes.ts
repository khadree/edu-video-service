import { Router } from 'express';
import videoController from '../controllers/videoController';
import { authenticate, authorize } from '../middleware/auth';
import { upload, handleUploadErrors } from '../middleware/upload';

const router = Router();

// Upload video (teachers only)
router.post(
  '/upload',
  authenticate,
  authorize('teacher', 'admin'),
  upload.single('video'),
  handleUploadErrors,
  (req, res) => videoController.uploadVideo(req, res)
);

// Get all videos (with filters)
router.get('/', authenticate, (req, res) => videoController.getVideos(req, res));

// Get video by ID
router.get('/:id', authenticate, (req, res) => videoController.getVideoById(req, res));

// Get videos by course ID
router.get('/course/:courseId', authenticate, (req, res) =>
  videoController.getCourseVideos(req, res)
);

// Get playback URL
router.get('/:id/playback', authenticate, (req, res) =>
  videoController.getPlaybackUrl(req, res)
);

// Update video (teachers/admins only)
router.put(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  (req, res) => videoController.updateVideo(req, res)
);

// Delete video (teachers/admins only)
router.delete(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  (req, res) => videoController.deleteVideo(req, res)
);

// Get video statistics
router.get('/stats/summary', authenticate, (req, res) =>
  videoController.getVideoStats(req, res)
);

export default router;
