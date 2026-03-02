const axios = require('axios');
const path = require('path');

const triggerAIProcessing = async (lectureId, filePath) => {
    try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

        // Don't await this if we want it to be async (fire and forget from client perspective)
        // But here we might want to log the start
        console.log(`Triggering AI processing for lecture ${lectureId}`);

        await axios.post(`${aiServiceUrl}/process`, {
            lectureId: lectureId,
            filePath: path.resolve(filePath), // Ensure absolute path
        });

    } catch (error) {
        console.error(`Error triggering AI service: ${error.message}`);
        // We might want to update the lecture status to 'failed' here if the trigger fails immediately
    }
};

module.exports = triggerAIProcessing;
