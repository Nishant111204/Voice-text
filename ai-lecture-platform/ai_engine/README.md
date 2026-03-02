# AI Lecture Platform Engine

A FastAPI-based AI lecture processing platform that transcribes audio lectures and generates intelligent summaries, notes, and quizzes using Groq AI.

## Features

- 🎤 **Audio Transcription**: Uses OpenAI Whisper for high-quality speech-to-text
- 🤖 **AI-Powered Analysis**: Leverages Groq's Llama 3.1 model for intelligent content processing
- 📝 **Smart Notes Generation**: Automatically generates comprehensive lecture notes
- 📋 **Quiz Creation**: Creates relevant multiple-choice questions from lecture content
- 🔄 **Background Processing**: Asynchronous processing for large audio files
- 📡 **WebSocket Support**: Real-time transcription streaming
- 🗄️ **MongoDB Integration**: Scalable data storage for lectures and processed content

## Tech Stack

- **Backend**: FastAPI, Uvicorn
- **AI/ML**: Groq API (Llama 3.1), OpenAI Whisper
- **Database**: MongoDB
- **Audio Processing**: OpenAI Whisper
- **Python**: 3.12+

## Prerequisites

- Python 3.12+
- MongoDB database
- Groq API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-lecture-platform/ai_engine
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and database URI
   ```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?appName=ClusterName

# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here
```

### Getting API Keys

1. **Groq API Key**: Sign up at [Groq Console](https://console.groq.com) and get your API key
2. **MongoDB**: Set up a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)

## Usage

### Starting the Server

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Start the server
python main.py
```

The server will start on `http://localhost:8000`

### API Endpoints

#### `POST /process`
Process a lecture audio file asynchronously.

**Request Body:**
```json
{
  "lectureId": "string",
  "filePath": "string"
}
```

#### `POST /regenerate-quiz`
Regenerate quiz questions for an existing lecture.

**Request Body:**
```json
{
  "lectureId": "string"
}
```

#### `WebSocket /ws/transcribe/{lecture_id}`
Real-time transcription streaming for live audio processing.

#### `GET /`
Health check endpoint.

## Project Structure

```
ai_engine/
├── app/
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   │   ├── nlp.py       # AI processing (Groq integration)
│   │   ├── transcription.py  # Audio transcription
│   │   └── orchestrator.py  # Process coordination
│   └── utils/            # Utility functions
├── main.py               # FastAPI application
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## How It Works

1. **Upload**: Audio file is uploaded to the system
2. **Transcription**: Whisper converts speech to text
3. **Processing**: Groq AI analyzes the transcript and generates:
   - Comprehensive summary
   - Key takeaways
   - Detailed study notes
   - Quiz questions
4. **Storage**: All results are stored in MongoDB
5. **API**: Results are accessible via REST endpoints

## Development

### Running Tests

```bash
# Add test commands when tests are implemented
pytest
```

### Code Style

This project follows PEP 8 Python style guidelines.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Troubleshooting

### Common Issues

1. **Virtual Environment Issues**
   - Ensure you're using Python 3.12+
   - Make sure the virtual environment is activated

2. **API Key Errors**
   - Verify your Groq API key is correct
   - Check that the .env file is properly configured

3. **MongoDB Connection Issues**
   - Verify your MongoDB URI is correct
   - Check network connectivity to MongoDB

4. **Audio Processing Issues**
   - Ensure audio files are in supported formats (mp3, wav, etc.)
   - Check file permissions and paths

### Getting Help

- Check the logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure all dependencies are installed properly

## API Documentation

Once the server is running, visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

## Performance Notes

- Large audio files are processed asynchronously
- WebSocket streaming is available for real-time transcription
- MongoDB indexing is optimized for lecture queries
- Groq API calls include rate limiting and error handling
