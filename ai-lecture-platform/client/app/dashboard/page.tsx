"use client"

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
    Upload, BookOpen, LogOut, Mic, Square,
    FileText, Plus, Users, Shield, Globe,
    Lock, Search, TrendingUp, Presentation, Building2
} from 'lucide-react';
import Link from 'next/link';
import { io } from 'socket.io-client';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [lectures, setLectures] = useState([]);
    const [orgLectures, setOrgLectures] = useState([]);
    const [status, setStatus] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingText, setRecordingText] = useState('');
    const [interimText, setInterimText] = useState('');
    const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [isPrivate, setIsPrivate] = useState(true);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);

    const fetchLectures = async () => {
        try {
            const { data } = await api.get('/lectures');
            // Filter: 
            // My Lectures = owned by me
            // Discover = from organization (not including mine)
            setLectures(data.filter((l: any) => l.userId === user?._id));
            setOrgLectures(data.filter((l: any) => l.userId !== user?._id));
        } catch (error: any) {
            console.error('Error fetching lectures:', error);
            if (error.response?.status === 401) {
                setStatus('Session expired. Please log out and log in again.');
            } else {
                setStatus(error.response?.data?.message || 'Error connecting to server');
            }
        }
    };

    useEffect(() => {
        if (user) fetchLectures();

        // Initialize Web Speech API for real-time visual feedback
        if (typeof window !== 'undefined' && ('WebkitSpeechRecognition' in window || 'speechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript + ' ';
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                if (final) setRecordingText(prev => prev + final);
                setInterimText(interim);
            };
        }
    }, [user]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('isPrivate', String(isPrivate));

        setUploading(true);
        setStatus('Uploading...');
        try {
            await api.post('/lectures/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus('Upload successful! AI processing started.');
            fetchLectures();
        } catch (error: any) {
            console.error('Upload error:', error);
            setStatus(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async () => {
        setRecordingText('');
        setInterimText('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            if (recognitionRef.current) {
                recognitionRef.current.start();
            }

            const socketUri = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
            const socket = io(socketUri);
            socketRef.current = socket;

            socket.on('connect', () => {
                setIsRecording(true);
                socket.emit('start-recording', {
                    userId: user?._id,
                    organizationId: user?.organizationId,
                    title: `Recording - ${new Date().toLocaleTimeString()}`,
                    isPrivate
                });
                mediaRecorder.start(1000);
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socket.connected) {
                    socket.emit('audio-chunk', event.data);
                }
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (socket.connected) {
                    socket.emit('stop-recording');
                }
                socket.disconnect();
                if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch (e) { }
                }
                setIsRecording(false);
                setInterimText('');
                alert('Recording complete! Processing your insights.');
                fetchLectures();
            };

        } catch (error) {
            console.error('Recording error:', error);
            alert('Could not access microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleMaterialUpload = async (lectureId: string) => {
        if (!materialFile) return;

        const formData = new FormData();
        formData.append('file', materialFile);
        formData.append('name', materialFile.name);

        try {
            await api.post(`/lectures/${lectureId}/materials`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Material uploaded successfully!');
            setMaterialFile(null);
            setSelectedLecture(null);
            fetchLectures();
        } catch (error) {
            console.error('Material upload error:', error);
            alert('Failed to upload material.');
        }
    };

    const isStudent = user?.role === 'student';
    const isTeacher = user?.role === 'teacher';
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    return (
        <div className="min-h-screen bg-[#FDFDFF] pb-20 font-sans">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Presentation size={24} />
                        </div>
                        <span className="text-xl font-black text-gray-900 tracking-tighter uppercase">EchoBrain</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                            <div className={`w-2 h-2 rounded-full ${isTeacher ? 'bg-orange-400' : isStudent ? 'bg-green-400' : 'bg-purple-400'}`}></div>
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{user?.role}</span>
                            <div className="w-[1px] h-3 bg-gray-200"></div>
                            <span className="text-xs font-bold text-gray-700">{user?.name}</span>
                        </div>
                        <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <LogOut size={22} />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header Section */}
                <div className="mb-12">
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">
                        Welcome back, {user?.name.split(' ')[0]}!
                    </h1>
                    <p className="text-lg font-medium text-gray-400">
                        {isTeacher ? "Your classroom is ready for the next lecture." : "Ready to master your subjects today?"}
                    </p>
                </div>

                {/* Status Bar */}
                {status && (
                    <div className="mb-10 p-4 bg-blue-600 text-white rounded-2xl flex items-center justify-between shadow-xl shadow-blue-100 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3 font-bold uppercase tracking-widest text-[11px]">
                            <TrendingUp size={16} />
                            {status}
                        </div>
                        <button onClick={() => setStatus('')}>✕</button>
                    </div>
                )}

                {/* Main Action Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    {/* Record Panel */}
                    <div className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100 group">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Live Capture</h2>
                            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                <button
                                    onClick={() => setIsPrivate(true)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPrivate ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                                >
                                    <Lock size={12} className="inline mr-1" /> Private
                                </button>
                                <button
                                    onClick={() => setIsPrivate(false)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isPrivate ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                                    disabled={!user?.organizationId}
                                >
                                    <Globe size={12} className="inline mr-1" /> Shared
                                </button>
                            </div>
                        </div>

                        <div className={`relative border-2 border-dashed ${isRecording ? 'border-red-500 bg-red-50/20' : 'border-gray-100'} rounded-[32px] p-10 min-h-[300px] flex flex-col justify-center items-center transition-all duration-500`}>
                            {!isRecording ? (
                                <>
                                    <button
                                        onClick={startRecording}
                                        className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-red-200"
                                    >
                                        <Mic size={32} />
                                    </button>
                                    <p className="mt-6 text-sm font-black text-gray-400 uppercase tracking-widest">Tap to start lecture</p>
                                </>
                            ) : (
                                <div className="w-full text-center">
                                    <button
                                        onClick={stopRecording}
                                        className="mb-8 px-10 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-4 mx-auto hover:bg-black"
                                    >
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                        Finish & save
                                    </button>
                                    <div className="p-8 bg-white/80 rounded-3xl border border-red-50 text-left h-44 overflow-y-auto shadow-inner">
                                        <p className="text-xl font-bold text-gray-800 leading-snug">
                                            {recordingText}
                                            <span className="text-blue-600 animate-pulse">{interimText}</span>
                                            {!recordingText && !interimText && <span className="text-gray-200">Recording audio...</span>}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upload / Quick Actions Panel */}
                    <div className="bg-gray-900 rounded-[40px] p-10 text-white flex flex-col justify-between">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase mb-2">Import Media</h2>
                            <p className="text-gray-400 font-medium mb-10">Upload your existing lecture files</p>

                            <div className="relative group cursor-pointer border-2 border-dashed border-white/10 rounded-[32px] p-12 hover:border-blue-500 hover:bg-white/5 transition-all mb-8">
                                <input
                                    type="file"
                                    accept="video/*,audio/*"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="text-center">
                                    <Upload size={48} className="mx-auto text-gray-600 group-hover:text-blue-500 mb-4 transition-colors" />
                                    <p className="text-lg font-bold">Choose a file</p>
                                    <p className="text-xs text-gray-500 mt-1 uppercase font-black tracking-wider">MP4, MOV, WAV, MP3</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                <p className="text-3xl font-black mb-1">{lectures.length}</p>
                                <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Private Saved</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                <p className="text-3xl font-black mb-1">{orgLectures.length}</p>
                                <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Shared Insights</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Management Section (Only for Admins) */}
                {isAdmin && (
                    <div className="mb-16">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-8 flex items-center gap-3">
                            <Shield className="text-blue-600" /> Administrative Hub
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Link href="/admin/users" className="p-8 bg-blue-600 text-white rounded-[32px] hover:shadow-2xl hover:shadow-blue-200 transition-all flex flex-col justify-between">
                                <Users size={32} />
                                <p className="mt-8 text-xl font-black uppercase tracking-tight">User Management</p>
                            </Link>
                            {user?.role === 'superadmin' && (
                                <Link href="/admin/orgs" className="p-8 bg-gray-900 text-white rounded-[32px] border border-gray-800 transition-all flex flex-col justify-between">
                                    <Building2 size={32} />
                                    <p className="mt-8 text-xl font-black uppercase tracking-tight">Organization Master</p>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Records Grid */}
                <div>
                    <div className="flex items-end justify-between mb-10">
                        <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Vault</h2>
                        <div className="bg-gray-100 p-1 rounded-2xl flex gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-400 px-4 py-2 bg-white rounded-xl shadow-sm text-blue-600">Personal</span>
                            <span className="text-xs font-black uppercase tracking-widest text-gray-300 px-4 py-2">Organization</span>
                        </div>
                    </div>

                    {lectures.length + orgLectures.length === 0 ? (
                        <div className="py-24 bg-white rounded-[48px] border border-gray-100 text-center">
                            <Search size={64} className="mx-auto text-gray-100 mb-6" />
                            <p className="text-xl font-bold text-gray-400 uppercase tracking-tight">No records discovered</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {[...lectures, ...orgLectures].map((lecture: any) => (
                                <div key={lecture._id} className="bg-white rounded-[40px] shadow-sm border border-gray-50 overflow-hidden hover:shadow-xl transition-all duration-700 group flex flex-col">
                                    <Link href={`/lectures/${lecture._id}`} className="p-8 flex-1">
                                        <div className="flex items-start gap-5 mb-6">
                                            <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-12 duration-500">
                                                <Presentation size={28} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <h3 className="text-xl font-black text-gray-800 group-hover:text-blue-600 truncate uppercase tracking-tight mb-2">{lecture.title}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${lecture.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                                                        {lecture.status}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{new Date(lecture.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {lecture.isPrivate ? <Lock size={12} className="text-gray-400" /> : <Globe size={12} className="text-blue-400" />}
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {lecture.userId === user?._id ? 'My Record' : 'Shared with Org'}
                                            </span>
                                        </div>
                                    </Link>

                                    <div className="px-8 py-6 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-3">
                                                {(lecture.studyMaterials || []).map((_: any, i: number) => (
                                                    <div key={i} className="w-10 h-10 rounded-2xl border-4 border-white bg-blue-100 flex items-center justify-center text-[9px] font-black text-blue-600 shadow-sm">
                                                        DOC
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {lecture.userId === user?._id && (
                                            <button
                                                onClick={() => setSelectedLecture(lecture._id)}
                                                className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        )}
                                    </div>

                                    {selectedLecture === lecture._id && (
                                        <div className="p-8 bg-blue-600 text-white animate-in slide-in-from-bottom-6 transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest">Add Materials</p>
                                                <button onClick={() => setSelectedLecture(null)}>✕</button>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                                onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                                                className="text-xs w-full mb-4 file:bg-white file:text-blue-600 file:border-0 file:rounded-xl file:px-4 file:py-1.5 file:font-black"
                                            />
                                            <button
                                                onClick={() => handleMaterialUpload(lecture._id)}
                                                className="w-full py-3 bg-white text-blue-600 font-black rounded-xl text-xs uppercase tracking-widest"
                                            >
                                                Upload
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
