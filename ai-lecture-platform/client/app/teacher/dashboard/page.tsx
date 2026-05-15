"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import {
    School, LogOut, Presentation, Lock, Globe, Upload,
    Mic, Plus, Search, ChevronRight, FileText,
    Building2, TrendingUp, Clock, CheckCircle, Link2, User,
    Bell, BarChart2
} from 'lucide-react';

export default function TeacherDashboard() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    const [allLectures, setAllLectures] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'personal' | 'org'>('personal');

    // Shared upload/record state (tracks which section's action was triggered)
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSection, setRecordingSection] = useState<'personal' | 'org'>('personal');
    const [recordingText, setRecordingText] = useState('');
    const [interimText, setInterimText] = useState('');
    const [showUrlPanel, setShowUrlPanel] = useState<'personal' | 'org' | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [urlTitle, setUrlTitle] = useState('');
    const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [joinOrgCode, setJoinOrgCode] = useState('');
    const [joinOrgName, setJoinOrgName] = useState('');
    const [joinStatus, setJoinStatus] = useState('');
    const [joinError, setJoinError] = useState('');

    // Search / filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing'>('all');

    // Notifications
    const [justCompleted, setJustCompleted] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevStatusRef = useRef<Record<string, string>>({});

    useEffect(() => {
        if (!loading && !user) { router.replace('/login'); return; }
        if (!loading && user && user.role !== 'teacher') { router.replace('/dashboard'); }
    }, [user, loading, router]);

    const fetchLectures = useCallback(async () => {
        try {
            const { data } = await api.get('/lectures');
            const myAll = data.filter((l: any) => l.userId === user?._id);

            // Detect completion — fire notification
            myAll.forEach((l: any) => {
                const prev = prevStatusRef.current[l._id];
                if (prev && prev !== 'completed' && l.status === 'completed') {
                    setJustCompleted(l.title);
                    setTimeout(() => setJustCompleted(null), 6000);
                }
                prevStatusRef.current[l._id] = l.status;
            });

            setAllLectures(data);

            // Auto-poll while any owned lecture is processing
            const anyProcessing = myAll.some((l: any) => ['processing', 'uploading'].includes(l.status));
            if (anyProcessing && !pollingRef.current) {
                pollingRef.current = setInterval(() => fetchLectures(), 8000);
            } else if (!anyProcessing && pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        } catch { /* silent */ }
    }, [user]);

    useEffect(() => {
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchLectures();
        if (typeof window !== 'undefined') {
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SR) {
                recognitionRef.current = new SR();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';
                recognitionRef.current.onresult = (event: any) => {
                    let interim = '';
                    let final = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
                        else interim += event.results[i][0].transcript;
                    }
                    if (final) setRecordingText(prev => prev + final);
                    setInterimText(interim);
                };
            }
        }
    }, [user]);

    // Derived lists
    const myPrivateLectures = allLectures.filter(l => l.userId === user?._id && l.isPrivate === true);
    const myOrgLectures = allLectures.filter(l => l.userId === user?._id && l.isPrivate === false);
    const othersOrgLectures = allLectures.filter(l => l.userId !== user?._id && l.isPrivate === false);
    const allOrgLectures = [...myOrgLectures, ...othersOrgLectures];

    const handleFileUpload = async (isPrivate: boolean, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('isPrivate', String(isPrivate));
        setUploading(true);
        setStatus(isPrivate ? 'Uploading to personal vault...' : 'Uploading to organization...');
        try {
            await api.post('/lectures/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setStatus('Upload complete! AI processing started.');
            fetchLectures();
        } catch (err: any) {
            setStatus(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleUrlUpload = async (isPrivate: boolean) => {
        if (!urlInput.trim()) return;
        setUploading(true);
        setStatus('Processing URL...');
        try {
            await api.post('/lectures/upload-url', {
                videoUrl: urlInput.trim(),
                title: urlTitle.trim() || 'Untitled Lecture',
                isPrivate,
            });
            setStatus('URL processing started!');
            setUrlInput('');
            setUrlTitle('');
            setShowUrlPanel(null);
            fetchLectures();
        } catch (err: any) {
            setStatus(err.response?.data?.message || 'URL upload failed');
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async (section: 'personal' | 'org') => {
        setRecordingText('');
        setInterimText('');
        setRecordingSection(section);
        const isPrivate = section === 'personal';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            if (recognitionRef.current) recognitionRef.current.start();

            const socketUri = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
            const socket = io(socketUri);
            socketRef.current = socket;

            socket.on('connect', () => {
                setIsRecording(true);
                socket.emit('start-recording', {
                    userId: user?._id,
                    organizationId: isPrivate ? undefined : user?.organizationId,
                    title: `${section === 'org' ? '[Org] ' : ''}Recording – ${new Date().toLocaleTimeString()}`,
                    isPrivate,
                });
                mediaRecorder.start(1000);
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socket.connected) socket.emit('audio-chunk', event.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                if (socket.connected) socket.emit('stop-recording');
                socket.disconnect();
                try { recognitionRef.current?.stop(); } catch { }
                setIsRecording(false);
                setInterimText('');
                setStatus('Recording saved! AI is processing your lecture.');
                fetchLectures();
            };
        } catch {
            alert('Could not access microphone.');
        }
    };

    const stopRecording = () => mediaRecorderRef.current?.stop();

    const handleMaterialUpload = async (lectureId: string) => {
        if (!materialFile) return;
        const formData = new FormData();
        formData.append('file', materialFile);
        formData.append('name', materialFile.name);
        try {
            await api.post(`/lectures/${lectureId}/materials`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setStatus('Material uploaded!');
            setMaterialFile(null);
            setSelectedLecture(null);
            fetchLectures();
        } catch {
            setStatus('Failed to upload material.');
        }
    };

    const handleJoinOrg = async () => {
        setJoinStatus('');
        setJoinError('');
        if (!joinOrgCode.trim() || !joinOrgName.trim()) {
            setJoinError('Both organization code and name are required.');
            return;
        }
        setJoinStatus('Joining...');
        try {
            const { data } = await api.post('/auth/join-organization', {
                organizationCode: joinOrgCode.trim().toUpperCase(),
                organizationName: joinOrgName.trim(),
            });
            localStorage.setItem('token', data.token);
            setJoinStatus(`Joined ${data.organizationName}! Refreshing…`);
            setTimeout(() => window.location.reload(), 1000);
        } catch (e: any) {
            setJoinStatus('');
            setJoinError(e?.response?.data?.message || 'Could not join. Check both fields.');
        }
    };

    if (loading || !user) return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const hasOrg = !!user.organizationId;

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans pb-20">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Presentation size={22} className="text-white" />
                        </div>
                        <span className="text-xl font-black text-gray-900 tracking-tighter uppercase">EchoBrain</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {hasOrg && (
                            <div className="hidden md:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <Building2 size={12} className="text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-500">{user.organizationName}</span>
                            </div>
                        )}
                        <div className="hidden md:flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
                            <School size={14} className="text-orange-500" />
                            <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest">Teacher</span>
                            <div className="w-[1px] h-3 bg-orange-200"></div>
                            <span className="text-xs font-bold text-gray-700">{user.name}</span>
                        </div>
                        <Link href="/profile" className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Profile">
                            <User size={20} />
                        </Link>
                        <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">
                        Welcome, {user.name.split(' ')[0]}!
                    </h1>
                    <p className="text-lg font-medium text-gray-400">
                        {hasOrg ? `Teaching at ${user.organizationName}` : 'Personal teacher account — join an org to share lectures'}
                    </p>
                </div>

                {/* "Just completed" notification */}
                {justCompleted && (
                    <div className="mb-6 p-4 bg-green-600 text-white rounded-2xl flex items-center gap-3 shadow-xl shadow-green-100 animate-in slide-in-from-top-4">
                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Bell size={16} />
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-sm uppercase tracking-widest">AI Processing Complete!</p>
                            <p className="text-white/80 font-medium text-xs mt-0.5">"{justCompleted}" — transcript, notes, and quiz are ready.</p>
                        </div>
                        <button onClick={() => setJustCompleted(null)} className="text-white/60 hover:text-white text-lg leading-none">✕</button>
                    </div>
                )}

                {/* Stats row */}
                {(() => {
                    const processingNow = myPrivateLectures.filter(l => ['processing','uploading'].includes(l.status)).length
                        + myOrgLectures.filter(l => ['processing','uploading'].includes(l.status)).length;
                    const completedAll = allLectures.filter(l => l.userId === user?._id && l.status === 'completed').length;
                    return (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: 'Private', value: myPrivateLectures.length, icon: <Lock size={16} />, color: 'bg-blue-50 text-blue-600' },
                                    { label: 'Shared', value: myOrgLectures.length, icon: <Globe size={16} />, color: 'bg-green-50 text-green-600' },
                                    { label: 'Completed', value: completedAll, icon: <CheckCircle size={16} />, color: 'bg-purple-50 text-purple-600' },
                                    { label: 'Processing', value: processingNow, icon: <Clock size={16} />, color: 'bg-orange-50 text-orange-600', pulse: processingNow > 0 },
                                ].map(({ label, value, icon, color, pulse }) => (
                                    <div key={label} className="bg-white border border-gray-100 rounded-[28px] p-5 flex flex-col gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} ${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
                                        <p className="text-3xl font-black text-gray-900">{value}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                                    </div>
                                ))}
                            </div>
                            {processingNow > 0 && (
                                <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3">
                                    <div className="w-6 h-6 border-[3px] border-orange-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0"></div>
                                    <p className="text-sm font-bold text-orange-700">
                                        {processingNow} lecture{processingNow > 1 ? 's are' : ' is'} being processed. This page auto-refreshes.
                                    </p>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* Status bar */}
                {status && (
                    <div className="mb-8 p-4 bg-blue-600 text-white rounded-2xl flex items-center justify-between shadow-xl shadow-blue-100">
                        <div className="flex items-center gap-3 font-bold text-[11px] uppercase tracking-widest">
                            <TrendingUp size={16} />{status}
                        </div>
                        <button onClick={() => setStatus('')} className="text-white/70 hover:text-white">✕</button>
                    </div>
                )}

                {/* Section Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit mb-10">
                    <button
                        onClick={() => setActiveSection('personal')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSection === 'personal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Lock size={13} /> Personal
                        <span className="ml-1 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[9px]">{myPrivateLectures.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveSection('org')}
                        disabled={!hasOrg}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSection === 'org' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Globe size={13} /> Organization
                        <span className="ml-1 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[9px]">{allOrgLectures.length}</span>
                    </button>
                </div>

                {/* ── PERSONAL SECTION ── */}
                {activeSection === 'personal' && (
                    <div>
                        <div className="mb-8 flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                            <Lock size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-bold text-blue-700">
                                Your Personal vault is <strong>100% private</strong>. These lectures are never visible to your organization, students, or admins.
                            </p>
                        </div>

                        {/* Record + Upload for Personal */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                            {/* Record */}
                            <div className="bg-white rounded-[40px] border border-gray-100 p-10">
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Live Record</h2>
                                <p className="text-sm text-gray-400 font-medium mb-8">Record privately — saved only to your account.</p>
                                <div className={`border-2 border-dashed ${isRecording && recordingSection === 'personal' ? 'border-red-400 bg-red-50/20' : 'border-gray-100'} rounded-[32px] p-10 flex flex-col justify-center items-center transition-all duration-500 min-h-[220px]`}>
                                    {!(isRecording && recordingSection === 'personal') ? (
                                        <>
                                            <button
                                                onClick={() => startRecording('personal')}
                                                disabled={isRecording}
                                                className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <Mic size={32} />
                                            </button>
                                            <p className="mt-5 text-xs font-black text-gray-400 uppercase tracking-widest">Tap to start</p>
                                        </>
                                    ) : (
                                        <div className="w-full text-center">
                                            <button
                                                onClick={stopRecording}
                                                className="mb-5 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-4 mx-auto"
                                            >
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                                Finish & Save
                                            </button>
                                            <div className="p-6 bg-white/80 rounded-3xl border border-red-50 text-left h-32 overflow-y-auto shadow-inner">
                                                <p className="text-sm font-bold text-gray-800 leading-snug">
                                                    {recordingText}
                                                    <span className="text-blue-600 animate-pulse">{interimText}</span>
                                                    {!recordingText && !interimText && <span className="text-gray-300">Recording audio...</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upload */}
                            <div className="bg-gray-900 text-white rounded-[40px] p-10 flex flex-col">
                                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Import File</h2>
                                <p className="text-gray-400 font-medium mb-8">Upload any audio/video — stays private to your account.</p>

                                <div className="relative group cursor-pointer border-2 border-dashed border-white/10 rounded-[28px] p-8 hover:border-blue-500 hover:bg-white/5 transition-all mb-5">
                                    <input type="file" accept="video/*,audio/*" onChange={e => handleFileUpload(true, e)} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <div className="text-center">
                                        <Upload size={36} className="mx-auto text-gray-600 group-hover:text-blue-500 mb-3 transition-colors" />
                                        <p className="font-bold text-sm">Drop a file or click to browse</p>
                                        <p className="text-xs text-gray-500 mt-1 uppercase font-black tracking-wider">MP4 · WAV · MP3 · MOV</p>
                                    </div>
                                </div>

                                <button onClick={() => setShowUrlPanel(showUrlPanel === 'personal' ? null : 'personal')} className="w-full py-3 bg-white/10 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all mb-4 flex items-center justify-center gap-2">
                                    <Link2 size={13} />{showUrlPanel === 'personal' ? 'Hide URL Panel' : 'Import from URL'}
                                </button>

                                {showUrlPanel === 'personal' && (
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
                                        <input type="text" placeholder="YouTube or direct video URL" value={urlInput} onChange={e => setUrlInput(e.target.value)} disabled={uploading} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                        <input type="text" placeholder="Title (optional)" value={urlTitle} onChange={e => setUrlTitle(e.target.value)} disabled={uploading} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                        <button onClick={() => handleUrlUpload(true)} disabled={uploading || !urlInput.trim()} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50">
                                            {uploading ? 'Processing...' : 'Start Processing'}
                                        </button>
                                    </div>
                                )}

                                <div className="mt-auto pt-6 grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                        <p className="text-3xl font-black">{myPrivateLectures.length}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Private</p>
                                    </div>
                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                        <p className="text-3xl font-black">{myPrivateLectures.filter(l => l.status === 'completed').length}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Processed</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search + filter */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">My Private Vault</h2>
                            <div className="flex-1 flex items-center gap-3 sm:justify-end flex-wrap">
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search lectures…"
                                        className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 w-52"
                                    />
                                </div>
                                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
                                    {(['all', 'completed', 'processing'] as const).map(f => (
                                        <button key={f} onClick={() => setStatusFilter(f)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <LectureGrid
                            lectures={myPrivateLectures.filter(l =>
                                l.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                                (statusFilter === 'all' || l.status === statusFilter)
                            )}
                            userId={user._id}
                            onMaterialClick={setSelectedLecture}
                            selectedLecture={selectedLecture}
                            materialFile={materialFile}
                            setMaterialFile={setMaterialFile}
                            onMaterialUpload={handleMaterialUpload}
                            emptyMsg={searchQuery || statusFilter !== 'all' ? 'No lectures match your search.' : 'No private lectures yet. Record or upload above.'}
                        />
                    </div>
                )}

                {/* ── ORGANIZATION SECTION ── */}
                {activeSection === 'org' && (
                    <div>
                        {!hasOrg ? (
                            <div className="bg-orange-50 border-2 border-orange-100 rounded-[40px] p-10 max-w-2xl mx-auto">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                                        <Building2 size={32} className="text-orange-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Join an Organization</h2>
                                        <p className="text-gray-500 font-medium text-sm mt-1">Enter both the code and name to verify and join.</p>
                                    </div>
                                </div>

                                {joinError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600">{joinError}</div>
                                )}
                                {joinStatus && (
                                    <div className="mb-4 p-3 bg-orange-100 rounded-2xl text-sm font-bold text-orange-700">{joinStatus}</div>
                                )}

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Organization Code <span className="text-gray-400 normal-case font-bold tracking-normal">(e.g. ORG-AB12CD)</span></label>
                                        <input
                                            value={joinOrgCode}
                                            onChange={e => setJoinOrgCode(e.target.value.toUpperCase())}
                                            placeholder="ORG-XXXXXX"
                                            maxLength={10}
                                            className="w-full px-4 py-3 bg-white border border-orange-100 text-gray-700 placeholder-gray-400 rounded-2xl font-black outline-none focus:ring-2 focus:ring-orange-300 tracking-widest uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Organization Name</label>
                                        <input
                                            value={joinOrgName}
                                            onChange={e => setJoinOrgName(e.target.value)}
                                            placeholder="My University / School"
                                            className="w-full px-4 py-3 bg-white border border-orange-100 text-gray-700 placeholder-gray-400 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-300"
                                        />
                                    </div>
                                    <button
                                        onClick={handleJoinOrg}
                                        disabled={!joinOrgCode.trim() || !joinOrgName.trim()}
                                        className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-orange-600 transition-all"
                                    >
                                        Join Organization
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8 flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl">
                                    <Globe size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-bold text-green-700">
                                        Lectures shared here are visible to <strong>all members of {user.organizationName}</strong>. Personal lectures are never shown here.
                                    </p>
                                </div>

                                {/* Org record + upload */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                    {/* Record (org) */}
                                    <div className="bg-white rounded-[40px] border-2 border-green-100 p-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Live Lecture</h2>
                                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Globe size={10} />Shared</span>
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium mb-8">Record a live lecture — shared with all org members.</p>
                                        <div className={`border-2 border-dashed ${isRecording && recordingSection === 'org' ? 'border-red-400 bg-red-50/20' : 'border-green-100'} rounded-[32px] p-10 flex flex-col justify-center items-center transition-all duration-500 min-h-[220px]`}>
                                            {!(isRecording && recordingSection === 'org') ? (
                                                <>
                                                    <button
                                                        onClick={() => startRecording('org')}
                                                        disabled={isRecording}
                                                        className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-green-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Mic size={32} />
                                                    </button>
                                                    <p className="mt-5 text-xs font-black text-gray-400 uppercase tracking-widest">Tap to broadcast</p>
                                                </>
                                            ) : (
                                                <div className="w-full text-center">
                                                    <button onClick={stopRecording} className="mb-5 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-4 mx-auto">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                                        Finish & Share
                                                    </button>
                                                    <div className="p-6 bg-white/80 rounded-3xl border border-red-50 text-left h-32 overflow-y-auto shadow-inner">
                                                        <p className="text-sm font-bold text-gray-800 leading-snug">
                                                            {recordingText}
                                                            <span className="text-green-600 animate-pulse">{interimText}</span>
                                                            {!recordingText && !interimText && <span className="text-gray-300">Recording audio...</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Upload (org) */}
                                    <div className="bg-gray-900 text-white rounded-[40px] p-10 flex flex-col">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-2xl font-black uppercase tracking-tight">Share File</h2>
                                            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Globe size={10} />Org</span>
                                        </div>
                                        <p className="text-gray-400 font-medium mb-8">Upload a lecture to share with all org members.</p>

                                        <div className="relative group cursor-pointer border-2 border-dashed border-white/10 rounded-[28px] p-8 hover:border-green-500 hover:bg-white/5 transition-all mb-5">
                                            <input type="file" accept="video/*,audio/*" onChange={e => handleFileUpload(false, e)} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className="text-center">
                                                <Upload size={36} className="mx-auto text-gray-600 group-hover:text-green-500 mb-3 transition-colors" />
                                                <p className="font-bold text-sm">Drop a file or click to browse</p>
                                                <p className="text-xs text-gray-500 mt-1 uppercase font-black tracking-wider">MP4 · WAV · MP3 · MOV</p>
                                            </div>
                                        </div>

                                        <button onClick={() => setShowUrlPanel(showUrlPanel === 'org' ? null : 'org')} className="w-full py-3 bg-white/10 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all mb-4 flex items-center justify-center gap-2">
                                            <Link2 size={13} />{showUrlPanel === 'org' ? 'Hide URL Panel' : 'Share from URL'}
                                        </button>

                                        {showUrlPanel === 'org' && (
                                            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
                                                <input type="text" placeholder="YouTube or direct video URL" value={urlInput} onChange={e => setUrlInput(e.target.value)} disabled={uploading} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                                                <input type="text" placeholder="Title (optional)" value={urlTitle} onChange={e => setUrlTitle(e.target.value)} disabled={uploading} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                                                <button onClick={() => handleUrlUpload(false)} disabled={uploading || !urlInput.trim()} className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 disabled:opacity-50">
                                                    {uploading ? 'Processing...' : 'Share to Organization'}
                                                </button>
                                            </div>
                                        )}

                                        <div className="mt-auto pt-6 grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                <p className="text-3xl font-black">{myOrgLectures.length}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">My Shared</p>
                                            </div>
                                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                <p className="text-3xl font-black">{othersOrgLectures.length}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Others</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Organization Lectures</h2>
                                    <div className="flex-1 flex items-center gap-3 sm:justify-end flex-wrap">
                                        <div className="relative">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                placeholder="Search…"
                                                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 w-48"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
                                            {(['all', 'completed', 'processing'] as const).map(f => (
                                                <button key={f} onClick={() => setStatusFilter(f)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <LectureGrid
                                    lectures={allOrgLectures.filter(l =>
                                        l.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                                        (statusFilter === 'all' || l.status === statusFilter)
                                    )}
                                    userId={user._id}
                                    onMaterialClick={setSelectedLecture}
                                    selectedLecture={selectedLecture}
                                    materialFile={materialFile}
                                    setMaterialFile={setMaterialFile}
                                    onMaterialUpload={handleMaterialUpload}
                                    emptyMsg={searchQuery || statusFilter !== 'all' ? 'No lectures match your search.' : 'No shared lectures yet. Record or upload above to share with your org.'}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function LectureGrid({
    lectures, userId, emptyMsg, onMaterialClick, selectedLecture, materialFile, setMaterialFile, onMaterialUpload
}: {
    lectures: any[];
    userId: string;
    emptyMsg: string;
    onMaterialClick?: (id: string | null) => void;
    selectedLecture?: string | null;
    materialFile?: File | null;
    setMaterialFile?: (f: File | null) => void;
    onMaterialUpload?: (id: string) => void;
}) {
    if (lectures.length === 0) return (
        <div className="py-20 bg-white rounded-[48px] border border-gray-100 text-center">
            <Search size={52} className="mx-auto text-gray-100 mb-5" />
            <p className="text-base font-bold text-gray-400 uppercase tracking-tight">{emptyMsg}</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lectures.map((lecture: any) => (
                <div key={lecture._id} className="bg-white rounded-[32px] border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-blue-50 transition-all duration-500 group flex flex-col">
                    <Link href={`/lectures/${lecture._id}`} className="p-7 flex-1">
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 flex-shrink-0">
                                <Presentation size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight line-clamp-2">{lecture.title}</h3>
                                <p className="text-[10px] font-bold text-gray-400 mt-1">{new Date(lecture.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${lecture.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                                    {lecture.status}
                                </span>
                                {lecture.isPrivate ? <Lock size={11} className="text-gray-300" /> : <Globe size={11} className="text-green-400" />}
                            </div>
                            <div className="flex items-center gap-1 text-gray-300">
                                {lecture.studyMaterials?.length > 0 && <FileText size={12} />}
                                <ChevronRight size={14} className="group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </div>
                    </Link>

                    {/* Material upload (only for own lectures) */}
                    {lecture.userId === userId && onMaterialClick && (
                        <div className="px-7 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {(lecture.studyMaterials || []).length} Material{(lecture.studyMaterials || []).length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={() => onMaterialClick(selectedLecture === lecture._id ? null : lecture._id)}
                                className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    )}

                    {selectedLecture === lecture._id && setMaterialFile && onMaterialUpload && (
                        <div className="p-6 bg-blue-600 text-white">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest">Add Study Material</p>
                                <button onClick={() => onMaterialClick?.(null)}>✕</button>
                            </div>
                            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => setMaterialFile(e.target.files?.[0] || null)} className="text-xs w-full mb-4 file:bg-white file:text-blue-600 file:border-0 file:rounded-xl file:px-4 file:py-1.5 file:font-black" />
                            <button onClick={() => onMaterialUpload(lecture._id)} disabled={!materialFile} className="w-full py-3 bg-white text-blue-600 font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-50">
                                Upload
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
