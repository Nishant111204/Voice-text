"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
    ArrowLeft, FileText, BookOpen, HelpCircle, Bot, Send,
    Lock, Globe, Clock, Trash2, Download, Paperclip, AlertTriangle
} from 'lucide-react';

export default function LecturePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [lecture, setLecture] = useState<any>(null);
    const [content, setContent] = useState<any>(null);
    const [quiz, setQuiz] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('transcript');
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [isAskingAI, setIsAskingAI] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [lectureRes, contentRes, quizRes] = await Promise.all([
                api.get(`/lectures/${params.id}`),
                api.get(`/lectures/${params.id}/transcript`).catch(() => null),
                api.get(`/lectures/${params.id}/quiz`).catch(() => null),
            ]);
            setLecture(lectureRes.data);
            setContent(contentRes?.data || null);
            setQuiz(quizRes?.data || null);
            return lectureRes.data.status;
        } catch {
            return null;
        }
    }, [params.id]);

    // Initial fetch + polling while processing
    useEffect(() => {
        fetchAll().then(status => {
            if (status === 'processing' || status === 'uploading') {
                pollingRef.current = setInterval(async () => {
                    const s = await fetchAll();
                    if (s === 'completed' || s === 'failed') {
                        clearInterval(pollingRef.current!);
                        pollingRef.current = null;
                    }
                }, 5000);
            }
        });
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [fetchAll]);

    const handleAskAI = async () => {
        if (!aiQuestion.trim()) return;
        setIsAskingAI(true);
        setAiAnswer('');
        try {
            const transcriptPayload = content?.fullText ? content.fullText.slice(0, 8000) : '';
            const response = await api.post('/lectures/ask-ai', {
                lectureId: params.id,
                question: aiQuestion,
                transcript: transcriptPayload,
            });
            setAiAnswer(response.data.answer);
        } catch (error: any) {
            if (error.response?.status === 400) {
                setAiAnswer('This lecture has not been transcribed yet. Please wait for processing to complete.');
            } else {
                setAiAnswer('Sorry, I encountered an error. Please try again.');
            }
        } finally {
            setIsAskingAI(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/lectures/${params.id}`);
            router.push('/dashboard');
        } catch {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const goBack = () => {
        if (!user) { router.push('/dashboard'); return; }
        if (user.role === 'teacher') { router.push('/teacher/dashboard'); return; }
        if (user.role === 'admin' || user.role === 'superadmin') { router.push('/org/dashboard'); return; }
        router.push('/student/dashboard');
    };

    if (!lecture) return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const isProcessing = lecture.status === 'processing' || lecture.status === 'uploading';
    const isFailed = lecture.status === 'failed';
    const isOwner = user?._id === lecture.userId;
    const hasContent = !!content && !!content.fullText?.trim();
    const hasSegments = hasContent && content.transcript?.length > 0;
    const hasMaterials = lecture.studyMaterials?.length > 0;

    const tabs = [
        { id: 'transcript', label: 'Transcript', icon: <FileText size={14} /> },
        { id: 'notes', label: 'Smart Notes', icon: <BookOpen size={14} /> },
        { id: 'quiz', label: 'Quiz', icon: <HelpCircle size={14} /> },
        { id: 'materials', label: `Materials${hasMaterials ? ` (${lecture.studyMaterials.length})` : ''}`, icon: <Paperclip size={14} /> },
        { id: 'ask-ai', label: 'Ask AI', icon: <Bot size={14} /> },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={goBack}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                            lecture.status === 'completed' ? 'bg-green-100 text-green-700' :
                            isFailed ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600 animate-pulse'
                        }`}>
                            {isProcessing && <Clock size={10} />}
                            {lecture.status}
                        </span>
                        {lecture.isPrivate
                            ? <span className="flex items-center gap-1 text-[10px] font-black text-gray-400"><Lock size={11} />Private</span>
                            : <span className="flex items-center gap-1 text-[10px] font-black text-blue-500"><Globe size={11} />Shared</span>
                        }
                        {isOwner && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                title="Delete lecture"
                            >
                                <Trash2 size={17} />
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Delete confirm modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] p-10 max-w-sm w-full mx-4 shadow-2xl">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight text-center mb-2">Delete Lecture?</h3>
                        <p className="text-gray-500 font-medium text-sm text-center mb-8">
                            This will permanently delete <strong>"{lecture.title}"</strong>, its transcript, notes, and quiz. This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-60">
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-6 py-10">
                {/* Title */}
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2 leading-tight">{lecture.title}</h1>
                    <p className="text-sm text-gray-400 font-bold">
                        {new Date(lecture.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Processing banner */}
                {isProcessing && (
                    <div className="mb-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                        <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin flex-shrink-0"></div>
                        <div>
                            <p className="font-black text-blue-700 text-sm uppercase tracking-widest">AI Processing</p>
                            <p className="text-blue-600 font-medium text-sm mt-0.5">Transcribing and analysing your lecture. This page will update automatically.</p>
                        </div>
                    </div>
                )}

                {/* Failed banner */}
                {isFailed && (
                    <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
                        <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-black text-red-700 text-sm uppercase tracking-widest">Processing Failed</p>
                            <p className="text-red-600 font-medium text-sm mt-0.5">The AI could not process this file. Please try re-uploading.</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit mb-10">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {/* ── TRANSCRIPT ── */}
                {activeTab === 'transcript' && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Transcript</h2>
                        {!hasContent ? (
                            <EmptyState processing={isProcessing} failed={isFailed} msg="No transcript available yet." />
                        ) : hasSegments ? (
                            <div className="space-y-4">
                                {content.transcript.map((seg: any, i: number) => (
                                    <div key={i} className="flex gap-5 group">
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest pt-1 w-14 flex-shrink-0 group-hover:text-blue-400 transition-colors">
                                            {formatTime(seg.start)}
                                        </span>
                                        <p className="flex-1 text-gray-700 font-medium leading-relaxed">{seg.text}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {content.fullText.split('\n').filter((p: string) => p.trim()).map((para: string, i: number) => (
                                    <p key={i} className="text-gray-700 font-medium leading-relaxed">{para}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── SMART NOTES ── */}
                {activeTab === 'notes' && (
                    <div className="space-y-6">
                        {!hasContent ? (
                            <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                                <EmptyState processing={isProcessing} failed={isFailed} msg="Smart notes will appear after processing completes." />
                            </div>
                        ) : (
                            <>
                                <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-4">Summary</h2>
                                    <p className="text-gray-700 font-medium leading-relaxed">{content.summary || 'No summary generated.'}</p>
                                </div>
                                {content.keyTakeaways?.length > 0 && (
                                    <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-5">Key Takeaways</h2>
                                        <div className="space-y-3">
                                            {content.keyTakeaways.map((item: string, i: number) => (
                                                <div key={i} className="flex items-start gap-4">
                                                    <div className="w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i + 1}</div>
                                                    <p className="text-gray-700 font-medium leading-relaxed flex-1">{item}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {content.notes && (
                                    <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-5">Detailed Notes</h2>
                                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">{content.notes}</pre>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── QUIZ ── */}
                {activeTab === 'quiz' && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Quiz</h2>
                            {Object.keys(quizAnswers).length > 0 && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-gray-500">
                                        Score: <span className="text-blue-600">
                                            {quiz?.questions?.filter((_: any, i: number) => quizAnswers[i] === quiz.questions[i].correctIndex).length}
                                            /{quiz?.questions?.length}
                                        </span>
                                    </span>
                                    <button onClick={() => setQuizAnswers({})} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                        {!quiz?.questions?.length ? (
                            <EmptyState processing={isProcessing} failed={isFailed} msg="Quiz questions will appear after processing completes." />
                        ) : (
                            <div className="space-y-8">
                                {quiz.questions.map((q: any, qi: number) => (
                                    <div key={qi} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                                        <p className="font-black text-gray-900 mb-4 leading-relaxed">
                                            <span className="text-blue-600 mr-2">{qi + 1}.</span>{q.question}
                                        </p>
                                        <div className="space-y-2 mb-3">
                                            {q.options?.map((opt: string, oi: number) => {
                                                const showResult = quizAnswers[qi] !== undefined;
                                                const isSelected = quizAnswers[qi] === oi;
                                                const isCorrect = oi === q.correctIndex;
                                                return (
                                                    <button
                                                        key={oi}
                                                        onClick={() => !showResult && setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                                                        disabled={showResult}
                                                        className={`w-full text-left px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                                                            !showResult ? 'border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer' :
                                                            isCorrect ? 'border-green-400 bg-green-50 text-green-700' :
                                                            isSelected ? 'border-red-300 bg-red-50 text-red-600' :
                                                            'border-gray-100 text-gray-400 cursor-default'
                                                        }`}
                                                    >
                                                        <span className="mr-3 text-[10px] font-black uppercase text-gray-400">{String.fromCharCode(65 + oi)}.</span>
                                                        {opt}
                                                        {showResult && isCorrect && <span className="float-right text-green-600">✓</span>}
                                                        {showResult && isSelected && !isCorrect && <span className="float-right text-red-500">✗</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {quizAnswers[qi] !== undefined && q.explanation && (
                                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-sm font-medium text-blue-700">
                                                💡 {q.explanation}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STUDY MATERIALS ── */}
                {activeTab === 'materials' && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Study Materials</h2>
                        {!hasMaterials ? (
                            <div className="py-16 text-center">
                                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Paperclip size={26} className="text-gray-400" />
                                </div>
                                <p className="font-bold text-gray-400 uppercase tracking-tight text-sm">No materials attached yet.</p>
                                <p className="text-xs text-gray-300 font-medium mt-2">
                                    {isOwner ? 'Upload PDFs or slides from your dashboard.' : 'The teacher hasn\'t attached any materials yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {lecture.studyMaterials.map((mat: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 flex-shrink-0 group-hover:border-blue-200 transition-all">
                                            <span className="text-[10px] font-black text-gray-500 uppercase">{mat.fileType || 'FILE'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-800 truncate text-sm">{mat.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{mat.fileType?.toUpperCase() || 'Document'}</p>
                                        </div>
                                        {mat.url && (
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${mat.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex-shrink-0"
                                            >
                                                <Download size={15} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ASK AI ── */}
                {activeTab === 'ask-ai' && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                <Bot size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Ask AI</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Groq · Llama 3.1</p>
                            </div>
                        </div>
                        {isProcessing && (
                            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-sm font-bold text-yellow-700">
                                The lecture is still processing. Ask AI will be available once transcription completes.
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Your Question</label>
                                <textarea
                                    value={aiQuestion}
                                    onChange={e => setAiQuestion(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }}
                                    placeholder="What are the main topics? Explain the concept at 5:30. Summarise key points…"
                                    rows={4}
                                    disabled={isAskingAI || isProcessing}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-700 outline-none resize-none text-sm disabled:opacity-60"
                                />
                            </div>
                            <button
                                onClick={handleAskAI}
                                disabled={!aiQuestion.trim() || isAskingAI || isProcessing}
                                className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-200"
                            >
                                {isAskingAI
                                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Thinking…</>
                                    : <><Send size={14} />Ask AI</>
                                }
                            </button>
                            {aiAnswer && (
                                <div className="mt-6 p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <div className="flex items-start gap-4">
                                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Bot size={18} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">AI Response</p>
                                            <div className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap text-sm">{aiAnswer}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyState({ processing, failed, msg }: { processing: boolean; failed: boolean; msg: string }) {
    return (
        <div className="py-16 text-center">
            {processing ? (
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={24} className="text-gray-400" />
                </div>
            )}
            <p className="font-bold text-gray-400 uppercase tracking-tight text-sm">{msg}</p>
        </div>
    );
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}
