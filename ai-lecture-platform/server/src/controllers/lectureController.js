const asyncHandler = require('express-async-handler');
const Lecture = require('../models/Lecture');
const path = require('path');
const fs = require('fs');
const triggerAIProcessing = require('../utils/aiService');

// @desc    Upload a new lecture video
// @route   POST /api/lectures/upload
// @access  Private
const uploadLecture = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const { title, isPrivate } = req.body;

    const lecture = await Lecture.create({
        userId: req.user._id,
        organizationId: req.user.organizationId,
        title: title || req.file.originalname,
        videoUrl: req.file.path,
        originalFileName: req.file.originalname,
        status: 'uploading',
        isPrivate: isPrivate === 'true' || isPrivate === true,
    });

    console.log('Lecture created in DB:', lecture._id);

    // Trigger AI processing asynchronously
    triggerAIProcessing(lecture._id, lecture.videoUrl);

    res.status(201).json(lecture);
});

// @desc    Get all lectures for a user
// @route   GET /api/lectures
// @access  Private
const getLectures = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('User not authorized');
    }
    console.log(`Fetching lectures for user: ${req.user._id}`);

    // Find lectures that are either:
    // 1. Owned by the user
    // 2. Not private AND belong to the user's organization
    const query = {
        $or: [
            { userId: req.user._id },
        ]
    };

    if (req.user.organizationId) {
        query.$or.push({
            organizationId: req.user.organizationId,
            isPrivate: false
        });
    }

    const lectures = await Lecture.find(query).sort({
        createdAt: -1,
    });
    console.log(`Found ${lectures.length} lectures`);
    res.json(lectures);
});

// @desc    Get lecture by ID
// @route   GET /api/lectures/:id
// @access  Private
const getLectureById = asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);

    if (lecture && lecture.userId.toString() === req.user._id.toString()) {
        res.json(lecture);
    } else {
        res.status(404);
        throw new Error('Lecture not found');
    }
});

// @desc    Delete lecture
// @route   DELETE /api/lectures/:id
// @access  Private
const deleteLecture = asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);

    if (lecture && lecture.userId.toString() === req.user._id.toString()) {
        // Delete file from filesystem
        if (fs.existsSync(lecture.videoUrl)) {
            fs.unlinkSync(lecture.videoUrl);
        }
        await lecture.deleteOne();
        res.json({ message: 'Lecture removed' });
    } else {
        res.status(404);
        throw new Error('Lecture not found');
    }
});

// @desc    Add study material to a lecture
// @route   POST /api/lectures/:id/materials
// @access  Private
const addStudyMaterial = asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture || lecture.userId.toString() !== req.user._id.toString()) {
        res.status(404);
        throw new Error('Lecture not found');
    }

    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const material = {
        name: req.body.name || req.file.originalname,
        url: req.file.path,
        fileType: path.extname(req.file.originalname).substring(1),
    };

    lecture.studyMaterials.push(material);
    await lecture.save();

    res.status(201).json(lecture);
});

module.exports = {
    uploadLecture,
    getLectures,
    getLectureById,
    deleteLecture,
    addStudyMaterial,
};
