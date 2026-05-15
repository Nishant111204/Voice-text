require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const fs = require('fs');
const path = require('path');
const Lecture = require('./models/Lecture');
const triggerAIProcessing = require('./utils/aiService');
const User = require('./models/User');

const recordings = new Map();

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('start-recording', async (data) => {
        const { userId, organizationId, title, isPrivate } = data;
        const isPrivateBool = isPrivate === true;

        const user = await User.findById(userId);
        if (!user) {
            socket.emit('recording-error', { message: 'User not found' });
            return;
        }

        // Shared (organization) lectures must not be created by students
        if (!isPrivateBool && !['teacher', 'admin', 'superadmin'].includes(user.role)) {
            socket.emit('recording-error', { message: 'Only teachers/admins can upload shared lectures' });
            return;
        }

        // For shared lectures, ensure organizationId belongs to the user
        const resolvedOrganizationId = !isPrivateBool ? user.organizationId : undefined;
        if (!isPrivateBool && !resolvedOrganizationId) {
            socket.emit('recording-error', { message: 'Organization is required for shared lectures' });
            return;
        }

        const fileName = `recording-${Date.now()}.webm`;
        const filePath = path.join(__dirname, '../uploads', fileName);

        // Create lecture record
        const lecture = await Lecture.create({
            userId,
            organizationId: resolvedOrganizationId,
            title: title || 'Live Recording',
            videoUrl: filePath,
            status: 'uploading',
            isPrivate: isPrivateBool,
        });

        recordings.set(socket.id, {
            filePath,
            lectureId: lecture._id,
            stream: fs.createWriteStream(filePath)
        });

        console.log('Recording started for lecture:', lecture._id);
    });

    socket.on('audio-chunk', (chunk) => {
        const session = recordings.get(socket.id);
        if (session && session.stream) {
            session.stream.write(chunk);
        }
    });

    const stopSession = (socketId) => {
        const session = recordings.get(socketId);
        if (session) {
            session.stream.end();
            console.log('Recording stopped for lecture:', session.lectureId);

            // Update status and trigger processing
            Lecture.findByIdAndUpdate(session.lectureId, { status: 'processing' }).then(() => {
                triggerAIProcessing(session.lectureId, session.filePath);
            });

            recordings.delete(socketId);
        }
    };

    socket.on('stop-recording', () => stopSession(socket.id));
    socket.on('disconnect', () => stopSession(socket.id));
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
