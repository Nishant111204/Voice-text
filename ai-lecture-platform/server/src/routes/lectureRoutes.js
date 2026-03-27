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

// AI Assistant route
router.post('/ask-ai', protect, require('../controllers/aiController').askAI);

module.exports = router;
