const axios = require('axios');
const Lecture = require('../models/Lecture');
const ProcessedContent = require('../models/ProcessedContent');

const askAI = async (req, res) => {
    try {
        const { question, transcript, lectureId } = req.body;

        if (!question || !lectureId) {
            return res.status(400).json({ message: 'Question and lectureId are required' });
        }

        // Enforce lecture access: owner OR shared org lecture OR superadmin
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        const canAccess =
            lecture.userId?.toString() === req.user?._id?.toString() ||
            (req.user?.organizationId &&
                lecture.isPrivate === false &&
                lecture.organizationId &&
                lecture.organizationId.toString() === req.user.organizationId.toString()) ||
            req.user?.role === 'superadmin';

        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized to access this lecture' });
        }

        // If client sent no/empty transcript, fall back to the stored fullText from MongoDB
        let transcriptToSend = transcript;
        if (!transcriptToSend || (typeof transcriptToSend === 'string' && !transcriptToSend.trim())) {
            const content = await ProcessedContent.findOne({ lectureId });
            if (!content || !content.fullText) {
                return res.status(400).json({
                    message: 'This lecture has not been transcribed yet. Please wait for processing to complete.',
                });
            }
            transcriptToSend = content.fullText;
        }

        // Forward request to AI engine
        const response = await axios.post('http://localhost:8000/ask-ai', {
            question,
            transcript: transcriptToSend,
            lectureId,
        });

        res.json(response.data);
    } catch (error) {
        console.error('AI Controller Error:', error.message);
        res.status(500).json({
            message: 'Failed to process AI request',
            error: error.message,
        });
    }
};

module.exports = { askAI };
