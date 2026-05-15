const asyncHandler = require('express-async-handler');
const ProcessedContent = require('../models/ProcessedContent');
const Quiz = require('../models/Quiz');
const Lecture = require('../models/Lecture');

const isSharedLectureAccessibleToUser = (lecture, user) => {
    if (!lecture || !user) return false;
    if (lecture.userId?.toString() === user._id?.toString()) return true;
    if (user.organizationId && lecture.organizationId) {
        return (
            lecture.isPrivate === false &&
            lecture.organizationId.toString() === user.organizationId.toString()
        );
    }
    return false;
};

// @desc    Get transcript for a lecture
// @route   GET /api/lectures/:id/transcript
// @access  Private
const getTranscript = asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture || !isSharedLectureAccessibleToUser(lecture, req.user)) {
        res.status(404);
        throw new Error('Lecture not found');
    }

    const content = await ProcessedContent.findOne({ lectureId: req.params.id });

    if (!content) {
        res.status(404);
        throw new Error('Transcript not yet available');
    }

    res.json(content);
});

// @desc    Get notes for a lecture
// @route   GET /api/lectures/:id/notes
// @access  Private
const getNotes = asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture || !isSharedLectureAccessibleToUser(lecture, req.user)) {
        res.status(404);
        throw new Error('Lecture not found');
    }

    const content = await ProcessedContent.findOne({ lectureId: req.params.id });

    if (!content) {
        res.status(404);
        throw new Error('Notes not yet available');
    }

    res.json({
        summary: content.summary,
        keyTakeaways: content.keyTakeaways,
        notes: content.notes
    });
});

// @desc    Get quiz for a lecture
// @route   GET /api/lectures/:id/quiz
// @access  Private
const getQuiz = asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture || !isSharedLectureAccessibleToUser(lecture, req.user)) {
        res.status(404);
        throw new Error('Lecture not found');
    }

    const quiz = await Quiz.findOne({ lectureId: req.params.id });

    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not yet available');
    }

    res.json(quiz);
});

module.exports = {
    getTranscript,
    getNotes,
    getQuiz,
};
