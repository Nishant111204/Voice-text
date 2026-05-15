"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
    ArrowLeft, FileText, BookOpen, HelpCircle, Bot, Send,
    Lock, Globe, Clock, Trash2, Download, Paperclip,
    AlertTriangle, Copy, CheckCircle2, Share2, RefreshCw,
    Mic, BarChart2
} from 'lucide-react';

/* ─────────────────────────────────────────────────── helpers ── */
function wc(text: string) { return text.trim().split(/\s+/).filter(Boolean).length; }
function readTime(words: number) { return Math.max(1, Math.ceil(words / 200)); }
function fmt(s: number) { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function useCopy(text: string) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return { copied, copy };
}

/* ─────────────────────────────────────────────────── Processing stages ── */
const STAGES = [
    { key: 'uploading', label: 'Uploading file' },
    { key: 'transcribing', label: 'Transcribing audio' },
    { key: 'analysing', label: 'Generating notes' },
    { key: 'quiz', label: 'Creating quiz' },
];

function ProcessingTimeline({ status }: { status: string }) {
    const [tick, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 1800); return () => clearInterval(t); }, []);
    // Cycle through stages to simulate progress
    const active = Math.min(Math.floor(tick / 2) % STAGES.length, STAGES.length - 1);

    return (
        <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-[28px]">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin flex-shrink-0"></div>
                <p className="font-black text-blue-700 text-sm uppercase tracking-widest">AI is processing your lecture</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {STAGES.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-700 ${
                            i < active ? 'bg-green-100 text-green-600' :
                            i === active ? 'bg-blue-600 text-white animate-pulse' :
                            'bg-blue-100/50 text-blue-300'
                        }`}>
                            {i < active && <CheckCircle2 size={10} />}
                            {s.label}
                        </div>
                        {i < STAGES.length - 1 && <div className={`w-4 h-[2px] rounded-full ${i < active ? 'bg-green-300' : 'bg-blue-100'}`} />}
                    </div>
                ))}
            </div>
            <p className="text-[10px] font-bold text-blue-400 mt-4">This page will update automatically when processing is complete.</p>
        </div>
    );
}

/* ─────────────────────────────────────────────────── Quiz score card ── */
function QuizScoreCard({ score, total, onRetry }: { score: number; total: number; onRetry: () => void }) {
    const pct = Math.round((score / total) * 100);
    const grade = pct >= 80 ? { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
        : pct >= 60 ? { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
        : { label: 'Keep Practising', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };

    return (
        <div className={`mt-8 p-8 ${grade.bg} border-2 ${grade.border} rounded-[32px] text-center`}>
            <div className="w-24 h-24 mx-auto mb-4 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/50" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
                        strokeDasharray={`${2.64 * pct} 264`}
                        className={grade.color}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-black ${grade.color}`}>{pct}%</span>
                </div>
            </div>
            <h3 className={`text-2xl font-black uppercase tracking-tight ${grade.color} mb-1`}>{grade.label}!</h3>
            <p className="text-gray-600 font-bold mb-6">
                You scored <strong>{score}</strong> out of <strong>{total}</strong> questions correctly.
            </p>
            <div className="flex items-center justify-center gap-3">
                <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-blue-300 transition-all">
                    <RefreshCw size={14} /> Try Again
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────── Main page ── */
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
    const [togglingVisibility, setTogglingVisibility] = useState(false);
    const [visibilityMsg, setVisibilityMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [reprocessing, setReprocessing] = useState(false);
    const [reprocessMsg, setReprocessMsg] = useState('');

    const pollingRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollTickRef = useRef(0); // counts poll cycles to detect a stuck lecture

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
        } catch { return null; }
    }, [params.id]);

    useEffect(() => {
        fetchAll().then(status => {
            if (status === 'processing' || status === 'uploading') {
                pollTickRef.current = 0;
                pollingRef.current = setInterval(async () => {
                    pollTickRef.current += 1;
                    const s = await fetchAll();
                    // Stop when done
                    if (s === 'completed' || s === 'failed') {
                        clearInterval(pollingRef.current!);
                        pollingRef.current = null;
                    }
                    // If still processing after 3 minutes (36 × 5s), force-stop polling
                    // so the UI shows the "Reprocess" option instead of spinning forever
                    if (pollTickRef.current >= 36) {
                        clearInterval(pollingRef.current!);
                        pollingRef.current = null;
                        setLecture((prev: any) => prev ? { ...prev, status: 'failed' } : prev);
                    }
                }, 5000);
            }
        });
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [fetchAll]);

    const handleReprocess = async () => {
        if (!lecture) return;
        setReprocessing(true);
        setReprocessMsg('');
        try {
            await api.post(`/lectures/${params.id}/reprocess`);
            setReprocessMsg('Reprocessing started! AI is working on your lecture.');
            // Restart polling
            pollTickRef.current = 0;
            setLecture((prev: any) => prev ? { ...prev, status: 'processing' } : prev);
            pollingRef.current = setInterval(async () => {
                pollTickRef.current += 1;
                const s = await fetchAll();
                if (s === 'completed' || s === 'failed') {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                }
                if (pollTickRef.current >= 36) {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                }
            }, 5000);
        } catch (e: any) {
            setReprocessMsg(e.response?.data?.message || 'Could not start reprocessing. Make sure the AI engine is running.');
        } finally {
            setReprocessing(false);
        }
    };

    const handleAskAI = async () => {
        if (!aiQuestion.trim()) return;
        setIsAskingAI(true);
        setAiAnswer('');
        try {
            const { data } = await api.post('/lectures/ask-ai', {
                lectureId: params.id,
                question: aiQuestion,
                transcript: content?.fullText?.slice(0, 8000) || '',
            });
            setAiAnswer(data.answer);
        } catch (e: any) {
            setAiAnswer(e.response?.status === 400
                ? 'This lecture has not been transcribed yet.'
                : 'Sorry, something went wrong. Please try again.');
        } finally { setIsAskingAI(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try { await api.delete(`/lectures/${params.id}`); router.push('/dashboard'); }
        catch { setDeleting(false); setShowDeleteConfirm(false); }
    };

    const handleVisibilityToggle = async () => {
        if (!lecture) return;
        setTogglingVisibility(true);
        setVisibilityMsg('');
        try {
            const { data } = await api.patch(`/lectures/${params.id}/visibility`, { isPrivate: !lecture.isPrivate });
            setLecture(data);
            setVisibilityMsg(data.isPrivate ? 'Lecture is now Private.' : 'Lecture is now Shared with your organization!');
            setTimeout(() => setVisibilityMsg(''), 3000);
        } catch (e: any) {
            setVisibilityMsg(e.response?.data?.message || 'Could not change visibility.');
        } finally { setTogglingVisibility(false); }
    };

    const handleDownloadNotes = () => {
        if (!content) return;
        const txt = [
            `# ${lecture?.title || 'Lecture Notes'}`,
            `Generated by EchoBrain AI\n`,
            `## Summary\n${content.summary || ''}`,
            `\n## Key Takeaways\n${(content.keyTakeaways || []).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`,
            `\n## Detailed Notes\n${content.notes || ''}`,
        ].join('\n');
        const blob = new Blob([txt], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${lecture?.title || 'lecture'}-notes.md`;
        a.click();
    };

    const handleCopyTranscript = () => {
        if (!content?.fullText) return;
        navigator.clipboard.writeText(content.fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const goBack = () => {
        if (!user) { router.push('/dashboard'); return; }
        if (user.role === 'teacher') { router.push('/teacher/dashboard'); return; }
        if (['admin', 'superadmin'].includes(user.role)) { router.push('/org/dashboard'); return; }
        router.push('/student/dashboard');
    };

    if (!lecture) return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const isProcessing = ['processing', 'uploading'].includes(lecture.status);
    const isFailed = lecture.status === 'failed';
    const isOwner = user?._id === lecture.userId;
    const canShare = isOwner && ['teacher', 'admin', 'superadmin'].includes(user?.role || '') && !!user?.organizationId;
    const hasContent = !!content?.fullText?.trim();
    const transcriptText = hasContent ? content.fullText : '';
    const words = wc(transcriptText);
    const hasMaterials = lecture.studyMaterials?.length > 0;

    const quizTotal = quiz?.questions?.length || 0;
    const quizDone = quizTotal > 0 && Object.keys(quizAnswers).length === quizTotal;
    const quizScore = quizDone
        ? quiz.questions.filter((_: any, i: number) => quizAnswers[i] === quiz.questions[i].correctIndex).length
        : 0;

    const tabs = [
        { id: 'transcript', label: 'Transcript', icon: <FileText size={13} /> },
        { id: 'notes', label: 'Smart Notes', icon: <BookOpen size={13} /> },
        { id: 'quiz', label: `Quiz${quizDone ? ` ${quizScore}/${quizTotal}` : ''}`, icon: <HelpCircle size={13} /> },
        { id: 'materials', label: `Materials${hasMaterials ? ` (${lecture.studyMaterials.length})` : ''}`, icon: <Paperclip size={13} /> },
        { id: 'ask-ai', label: 'Ask AI', icon: <Bot size={13} /> },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <button onClick={goBack} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0">
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Visibility pill */}
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                            lecture.status === 'completed' ? 'bg-green-100 text-green-700' :
                            isFailed ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600 animate-pulse'
                        }`}>
                            {isProcessing && <Clock size={9} />}
                            {lecture.status}
                        </span>

                        {/* Share toggle — owner teacher only */}
                        {canShare && (
                            <button
                                onClick={handleVisibilityToggle}
                                disabled={togglingVisibility}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                                    lecture.isPrivate
                                        ? 'border-gray-100 text-gray-400 hover:border-blue-300 hover:text-blue-600'
                                        : 'border-green-400 bg-green-50 text-green-700'
                                }`}
                                title={lecture.isPrivate ? 'Make shared with org' : 'Make private'}
                            >
                                {togglingVisibility
                                    ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    : lecture.isPrivate ? <Lock size={12} /> : <Globe size={12} />
                                }
                                {lecture.isPrivate ? 'Private' : 'Shared'}
                                <Share2 size={10} className="opacity-50" />
                            </button>
                        )}

                        {!canShare && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-gray-400">
                                {lecture.isPrivate ? <Lock size={11} /> : <Globe size={11} className="text-blue-400" />}
                                {lecture.isPrivate ? 'Private' : 'Shared'}
                            </span>
                        )}

                        {isOwner && (
                            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-gray-300 hover:text-red-500 transition-colors" title="Delete">
                                <Trash2 size={17} />
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Visibility message toast */}
            {visibilityMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-top-4">
                    {visibilityMsg}
                </div>
            )}

            {/* Delete confirm modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] p-10 max-w-sm w-full mx-4 shadow-2xl">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight text-center mb-2">Delete Lecture?</h3>
                        <p className="text-gray-500 font-medium text-sm text-center mb-8">
                            "<strong>{lecture.title}</strong>" and all its AI-generated content will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-60">
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-6 py-10">
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight mb-2">{lecture.title}</h1>
                    <p className="text-sm text-gray-400 font-bold">
                        {new Date(lecture.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {hasContent && <span className="ml-3">{words.toLocaleString()} words · ~{readTime(words)} min read</span>}
                    </p>
                </div>

                {/* Processing timeline */}
                {isProcessing && <ProcessingTimeline status={lecture.status} />}

                {/* Reprocess status message */}
                {reprocessMsg && (
                    <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${reprocessMsg.includes('started') ? 'bg-blue-50 border border-blue-100' : 'bg-red-50 border border-red-100'}`}>
                        <RefreshCw size={16} className={reprocessMsg.includes('started') ? 'text-blue-600' : 'text-red-500'} />
                        <p className={`text-sm font-bold ${reprocessMsg.includes('started') ? 'text-blue-700' : 'text-red-600'}`}>{reprocessMsg}</p>
                    </div>
                )}

                {/* Failed banner */}
                {isFailed && (
                    <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-[28px]">
                        <div className="flex items-start gap-4">
                            <AlertTriangle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-black text-red-700 text-sm uppercase tracking-widest">Processing Failed</p>
                                <p className="text-red-600 font-medium text-sm mt-1">
                                    The AI engine couldn't complete processing — likely because it couldn't reach the database while MongoDB was unavailable.
                                </p>
                                {isOwner && (
                                    <button
                                        onClick={handleReprocess}
                                        disabled={reprocessing}
                                        className="mt-4 flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all"
                                    >
                                        {reprocessing
                                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Starting…</>
                                            : <><RefreshCw size={14} /> Reprocess Lecture</>
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-2xl w-fit mb-10">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {/* ── TRANSCRIPT ── */}
                {activeTab === 'transcript' && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Transcript</h2>
                            {hasContent && (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                                        <FileText size={11} /> {words.toLocaleString()} words · {readTime(words)} min
                                    </div>
                                    <button onClick={handleCopyTranscript}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-blue-300 hover:text-blue-600 transition-all">
                                        {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            )}
                        </div>
                        {!hasContent ? (
                            <EmptyState processing={isProcessing} msg="No transcript yet." />
                        ) : content.transcript?.length > 0 ? (
                            <div className="space-y-4">
                                {content.transcript.map((seg: any, i: number) => (
                                    <div key={i} className="flex gap-5 group">
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest pt-1 w-14 flex-shrink-0 group-hover:text-blue-400 transition-colors">
                                            {fmt(seg.start)}
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
                                <EmptyState processing={isProcessing} msg="Smart notes will appear after processing." />
                            </div>
                        ) : (
                            <>
                                {/* Download button */}
                                <div className="flex justify-end">
                                    <button onClick={handleDownloadNotes}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
                                        <Download size={14} /> Download Notes (.md)
                                    </button>
                                </div>

                                <div className="bg-white rounded-[32px] border border-gray-100 p-8">
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-4">Summary</h2>
                                    <p className="text-gray-700 font-medium leading-relaxed">{content.summary}</p>
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
                        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Quiz</h2>
                            {quizDone && (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl">
                                        <BarChart2 size={14} className="text-blue-600" />
                                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Score: {quizScore}/{quizTotal}</span>
                                    </div>
                                    <button onClick={() => setQuizAnswers({})}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200">
                                        <RefreshCw size={12} /> Retry
                                    </button>
                                </div>
                            )}
                        </div>

                        {!quiz?.questions?.length ? (
                            <EmptyState processing={isProcessing} msg="Quiz will appear after processing." />
                        ) : (
                            <>
                                {/* Score card — shown when all answered */}
                                {quizDone && (
                                    <QuizScoreCard score={quizScore} total={quizTotal} onRetry={() => setQuizAnswers({})} />
                                )}

                                {/* Questions */}
                                <div className={`space-y-8 ${quizDone ? 'mt-8' : ''}`}>
                                    {quiz.questions.map((q: any, qi: number) => (
                                        <div key={qi} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                                            <p className="font-black text-gray-900 mb-4 leading-relaxed">
                                                <span className="text-blue-600 mr-2">{qi + 1}.</span>{q.question}
                                            </p>
                                            <div className="space-y-2 mb-3">
                                                {q.options?.map((opt: string, oi: number) => {
                                                    const answered = quizAnswers[qi] !== undefined;
                                                    const isSelected = quizAnswers[qi] === oi;
                                                    const isCorrect = oi === q.correctIndex;
                                                    return (
                                                        <button key={oi}
                                                            onClick={() => !answered && setQuizAnswers(p => ({ ...p, [qi]: oi }))}
                                                            disabled={answered}
                                                            className={`w-full text-left px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                                                                !answered ? 'border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer' :
                                                                isCorrect ? 'border-green-400 bg-green-50 text-green-700' :
                                                                isSelected ? 'border-red-300 bg-red-50 text-red-600' :
                                                                'border-gray-100 text-gray-400 cursor-default'
                                                            }`}>
                                                            <span className="mr-3 text-[10px] font-black uppercase text-gray-400">{String.fromCharCode(65 + oi)}.</span>
                                                            {opt}
                                                            {answered && isCorrect && <span className="float-right text-green-600">✓</span>}
                                                            {answered && isSelected && !isCorrect && <span className="float-right text-red-500">✗</span>}
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
                            </>
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
                                    {isOwner ? 'Upload PDFs or slides from your dashboard.' : "The teacher hasn't attached any materials yet."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {lecture.studyMaterials.map((mat: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                                            <span className="text-[10px] font-black text-gray-500 uppercase">{mat.fileType || 'FILE'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-800 truncate text-sm">{mat.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{mat.fileType?.toUpperCase()}</p>
                                        </div>
                                        {mat.url && (
                                            <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${mat.url}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex-shrink-0">
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
                                Still processing — Ask AI will be available once transcription completes.
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Your Question</label>
                                <textarea value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }}
                                    placeholder="What are the main topics? Explain the concept at 5:30. Give me 3 exam questions…"
                                    rows={4} disabled={isAskingAI || isProcessing}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-700 outline-none resize-none text-sm disabled:opacity-60"
                                />
                            </div>
                            <button onClick={handleAskAI} disabled={!aiQuestion.trim() || isAskingAI || isProcessing}
                                className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-200">
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

function EmptyState({ processing, msg }: { processing: boolean; msg: string }) {
    return (
        <div className="py-16 text-center">
            {processing
                ? <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                : <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText size={24} className="text-gray-400" /></div>
            }
            <p className="font-bold text-gray-400 uppercase tracking-tight text-sm">{msg}</p>
        </div>
    );
}
