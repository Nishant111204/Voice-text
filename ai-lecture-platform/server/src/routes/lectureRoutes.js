const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory always exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const {
    uploadLecture,
    uploadLectureFromUrl,
    getLectures,
    getLectureById,
    deleteLecture,
    addStudyMaterial,
} = require('../controllers/lectureController');
const {
    getTranscript,
    getNotes,
    getQuiz,
} = require('../controllers/contentController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination(req, file, cb) {
        // Always use absolute path to avoid CWD-dependent failures
        cb(null, UPLOADS_DIR);
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /mp4|mov|avi|mkv|mp3|wav|pdf|ppt|pptx|doc|docx|webm/;
        const extname = filetypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        // Accept any audio/video or document mimetype broadly
        const mimetype = /audio|video|application\/pdf|application\/msword|application\/vnd|officedocument/.test(file.mimetype);

        if (extname || mimetype) {
            return cb(null, true);
        } else {
            // Must pass an Error object — bare strings cause err.message=undefined
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    },
});

router.route('/upload').post(protect, upload.single('file'), uploadLecture);
router.route('/upload-url').post(protect, uploadLectureFromUrl);
router.route('/').get(protect, getLectures);
router
    .route('/:id')
    .get(protect, getLectureById)
    .delete(protect, deleteLecture);

// Content routes
router.route('/:id/transcript').get(protect, getTranscript);
router.route('/:id/notes').get(protect, getNotes);
router.route('/:id/quiz').get(protect, getQuiz);
router.route('/:id/materials').post(protect, upload.single('file'), addStudyMaterial);

// Reprocess — re-trigger AI pipeline for a stuck / failed lecture
router.post('/:id/reprocess', protect, async (req, res) => {
    const Lecture = require('../models/Lecture');
    const triggerAIProcessing = require('../utils/aiService');

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
    if (lecture.userId.toString() !== req.user._id.toString())
        return res.status(403).json({ message: 'Only the owner can reprocess this lecture' });
    if (!['failed', 'processing', 'uploading'].includes(lecture.status))
        return res.status(400).json({ message: 'Lecture is already completed — no reprocessing needed' });

    // Clear any stale processed content from a previous partial run
    const ProcessedContent = require('../models/ProcessedContent');
    const Quiz = require('../models/Quiz');
    await ProcessedContent.deleteMany({ lectureId: req.params.id });
    await Quiz.deleteMany({ lectureId: req.params.id });

    // Reset status and re-trigger
    await Lecture.findByIdAndUpdate(req.params.id, { status: 'processing' });
    triggerAIProcessing(lecture._id, lecture.videoUrl);

    console.log(`Reprocessing triggered for lecture ${req.params.id}`);
    res.json({ message: 'Reprocessing started', lectureId: lecture._id });
});

// Visibility toggle — owner can flip private ↔ shared
router.patch('/:id/visibility', protect, async (req, res) => {
    const Lecture = require('../models/Lecture');
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
    if (lecture.userId.toString() !== req.user._id.toString())
        return res.status(403).json({ message: 'Only the owner can change visibility' });

    const { isPrivate } = req.body;
    if (typeof isPrivate !== 'boolean')
        return res.status(400).json({ message: 'isPrivate (boolean) is required' });

    // Sharing requires org membership and teacher/admin role
    if (!isPrivate) {
        if (!req.user.organizationId)
            return res.status(400).json({ message: 'You must be in an organization to share lectures' });
        if (!['teacher', 'admin', 'superadmin'].includes(req.user.role))
            return res.status(403).json({ message: 'Only teachers or admins can share lectures' });
    }

    lecture.isPrivate = isPrivate;
    if (!isPrivate) lecture.organizationId = req.user.organizationId;
    await lecture.save();
    res.json(lecture);
});

// AI Assistant route
router.post('/ask-ai', protect, require('../controllers/aiController').askAI);

module.exports = router;
