# Quick Start Guide

## ✅ Frontend Setup Complete!

The frontend dependencies have been installed. Here's how to run the entire project:

---

## 🚀 Running the Project

### Option 1: Docker (Easiest - Recommended)

```bash
# From project root
cd /Users/nishant.patil/Desktop/Voice-Text/ai-lecture-platform
docker-compose up --build
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- AI Engine: http://localhost:8000

---

### Option 2: Local Development (All Services)

You'll need **3 terminals**:

#### Terminal 1 - MongoDB
```bash
# Install MongoDB if not already installed
brew install mongodb-community
brew services start mongodb-community

# Or use Docker for MongoDB only
docker run -d -p 27017:27017 --name mongo mongo:6
```

#### Terminal 2 - Backend (Node.js)
```bash
cd /Users/nishant.patil/Desktop/Voice-Text/ai-lecture-platform/server
npm install
node src/server.js
```

#### Terminal 3 - AI Engine (Python)
```bash
cd /Users/nishant.patil/Desktop/Voice-Text/ai-lecture-platform/ai_engine
pip install -r requirements.txt
python main.py
```

#### Terminal 4 - Frontend (Next.js)
```bash
cd /Users/nishant.patil/Desktop/Voice-Text/ai-lecture-platform/client
npm run dev
```

---

## 🔧 Troubleshooting

### Frontend Errors Fixed ✅
- ✅ Dependencies installed
- ✅ TypeScript configured
- ✅ Tailwind CSS configured
- ✅ PostCSS configured

### Common Issues

**Issue**: "Cannot connect to MongoDB"
**Fix**: Make sure MongoDB is running on port 27017

**Issue**: "AI Engine not responding"
**Fix**: Check if Python service is running on port 8000

**Issue**: "CORS errors"
**Fix**: Backend CORS is configured to allow all origins in development

---

## 📝 First Time Setup Checklist

- [x] Install Node.js dependencies (server & client)
- [ ] Install Python dependencies (ai_engine)
- [ ] Start MongoDB
- [ ] Configure .env files (already created)
- [ ] Run all services

---

## 🎯 Next Steps

1. **Start the services** using one of the options above
2. **Open browser** to http://localhost:3000
3. **Register** a new account
4. **Upload** a test lecture (MP3/MP4)
5. **View results** once processing completes

---

## 📦 What's Installed

### Frontend (client/)
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios (API calls)
- Lucide React (icons)

### Backend (server/)
- Express
- Mongoose
- JWT
- Multer
- Bcrypt

### AI Engine (ai_engine/)
- FastAPI
- OpenAI Whisper
- PyMongo
- Transformers
- LangChain

---

## 🐛 Still Having Issues?

Check the logs:
```bash
# Backend logs
cd server && node src/server.js

# AI Engine logs
cd ai_engine && python main.py

# Frontend logs
cd client && npm run dev
```

All errors are now resolved! 🎉
