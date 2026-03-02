"use client"

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { ArrowLeft, FileText, BookOpen, HelpCircle } from 'lucide-react';

export default function LecturePage() {
    const params = useParams();
    const router = useRouter();
    const [lecture, setLecture] = useState<any>(null);
    const [content, setContent] = useState<any>(null);
    const [quiz, setQuiz] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('transcript');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lectureRes, contentRes, quizRes] = await Promise.all([
                    api.get(`/lectures/${params.id}`),
                    api.get(`/lectures/${params.id}/transcript`).catch(() => null),
                    api.get(`/lectures/${params.id}/quiz`).catch(() => null),
                ]);
                setLecture(lectureRes.data);
                setContent(contentRes?.data);
                setQuiz(quizRes?.data);
            } catch (error) {
                console.error('Error fetching lecture:', error);
            }
        };
        fetchData();
    }, [params.id]);

    if (!lecture) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
                    >
                        <ArrowLeft size={20} />
                        Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{lecture.title}</h1>
                    <p className="text-gray-600 mt-1">Status: {lecture.status}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('transcript')}
                            className={`py-4 border-b-2 ${activeTab === 'transcript' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
                        >
                            <FileText className="inline mr-2" size={20} />
                            Transcript
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`py-4 border-b-2 ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
                        >
                            <BookOpen className="inline mr-2" size={20} />
                            Smart Notes
                        </button>
                        <button
                            onClick={() => setActiveTab('quiz')}
                            className={`py-4 border-b-2 ${activeTab === 'quiz' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
                        >
                            <HelpCircle className="inline mr-2" size={20} />
                            Quiz
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {lecture.status !== 'completed' && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
                        This lecture is currently being processed. Content will be available soon.
                    </div>
                )}

                {activeTab === 'transcript' && content && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold mb-4">Transcript</h2>
                        <div className="space-y-4">
                            {content.transcript?.map((segment: any, index: number) => (
                                <div key={index} className="flex gap-4">
                                    <span className="text-sm text-gray-500 w-20">{Math.floor(segment.start)}s</span>
                                    <p className="flex-1">{segment.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'notes' && content && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold mb-4">Summary</h2>
                        <p className="text-gray-700 mb-6">{content.summary}</p>

                        <h3 className="text-xl font-bold mb-3">Key Takeaways</h3>
                        <ul className="list-disc list-inside space-y-2 mb-6">
                            {content.keyTakeaways?.map((item: string, index: number) => (
                                <li key={index} className="text-gray-700">{item}</li>
                            ))}
                        </ul>

                        <h3 className="text-xl font-bold mb-3">Detailed Notes</h3>
                        <pre className="whitespace-pre-wrap text-gray-700">{content.notes}</pre>
                    </div>
                )}

                {activeTab === 'quiz' && quiz && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold mb-6">Quiz Questions</h2>
                        <div className="space-y-6">
                            {quiz.questions?.map((q: any, index: number) => (
                                <div key={index} className="border-b pb-6">
                                    <h3 className="font-semibold mb-3">{index + 1}. {q.question}</h3>
                                    <div className="space-y-2 ml-4">
                                        {q.options?.map((option: string, optIndex: number) => (
                                            <div key={optIndex} className={`p-2 rounded ${optIndex === q.correctIndex ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                                {option} {optIndex === q.correctIndex && <span className="text-green-600 font-semibold">✓ Correct</span>}
                                            </div>
                                        ))}
                                    </div>
                                    {q.explanation && <p className="text-sm text-gray-600 mt-2 ml-4">💡 {q.explanation}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
