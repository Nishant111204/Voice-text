const axios = require('axios');

const askAI = async (req, res) => {
    try {
        const { question, transcript, lectureId } = req.body;

        if (!question || !transcript) {
            return res.status(400).json({
                message: 'Question and transcript are required'
            });
        }

        // Forward request to AI engine
        const response = await axios.post('http://localhost:8000/ask-ai', {
            question,
            transcript,
            lectureId
        });

        res.json(response.data);
    } catch (error) {
        console.error('AI Controller Error:', error.message);
        res.status(500).json({
            message: 'Failed to process AI request',
            error: error.message
        });
    }
};

module.exports = {
    askAI
};
