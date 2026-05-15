"use client"
import Link from 'next/link';
import { BookOpen, School, Building2, Presentation, Zap, Brain, FileText } from 'lucide-react';

export default function Home() {
    return (
        <main className="min-h-screen bg-[#FDFDFF] font-sans">
            {/* Nav */}
            <nav className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <Presentation size={22} className="text-white" />
                    </div>
                    <span className="text-xl font-black text-gray-900 tracking-tighter uppercase">EchoBrain</span>
                </div>
                <Link href="/login" className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-blue-600 transition-colors">
                    Sign In →
                </Link>
            </nav>

            {/* Hero */}
            <section className="max-w-5xl mx-auto px-8 pt-24 pb-16 text-center">
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full mb-8">
                    <Zap size={14} className="text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-widest text-blue-600">AI-Powered Learning Platform</span>
                </div>
                <h1 className="text-7xl font-black text-gray-900 tracking-tighter leading-[0.9] mb-6">
                    Turn Lectures<br />
                    <span className="text-blue-600">Into Insights</span>
                </h1>
                <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
                    Transcribe lectures, generate smart notes, auto-create quizzes, and track learning progress — all powered by AI.
                </p>
            </section>

            {/* Role Cards */}
            <section className="max-w-5xl mx-auto px-8 pb-24">
                <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 mb-10">Choose your role to get started</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Student */}
                    <div className="group bg-white border-2 border-gray-100 rounded-[40px] p-10 hover:border-green-400 hover:shadow-2xl hover:shadow-green-50 transition-all duration-500 flex flex-col">
                        <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-green-500 transition-all duration-500">
                            <BookOpen size={30} className="text-green-500 group-hover:text-white transition-colors duration-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-3">Student</h2>
                        <p className="text-gray-500 font-medium mb-8 flex-1">
                            Access shared lectures, generate your own notes, take AI quizzes, and track your progress.
                        </p>
                        <div className="space-y-2 mb-8">
                            {['Smart notes from lectures', 'Auto-generated quizzes', 'Personal lecture vault'].map(f => (
                                <div key={f} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                    <span className="text-xs font-bold text-gray-500">{f}</span>
                                </div>
                            ))}
                        </div>
                        <Link
                            href="/register?role=student"
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-center hover:bg-green-500 transition-colors duration-300"
                        >
                            Join as Student
                        </Link>
                    </div>

                    {/* Teacher */}
                    <div className="group bg-blue-600 border-2 border-blue-600 rounded-[40px] p-10 hover:shadow-2xl hover:shadow-blue-200 transition-all duration-500 flex flex-col relative overflow-hidden">
                        <div className="absolute top-6 right-6 bg-white/20 px-3 py-1 rounded-full">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Popular</span>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mb-8">
                            <School size={30} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Teacher</h2>
                        <p className="text-white/80 font-medium mb-8 flex-1">
                            Upload and record lectures, share with your organization, and monitor student engagement.
                        </p>
                        <div className="space-y-2 mb-8">
                            {['Live lecture recording', 'Share with organization', 'Upload audio & video'].map(f => (
                                <div key={f} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
                                    <span className="text-xs font-bold text-white/80">{f}</span>
                                </div>
                            ))}
                        </div>
                        <Link
                            href="/register?role=teacher"
                            className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-center hover:bg-blue-50 transition-colors duration-300"
                        >
                            Join as Teacher
                        </Link>
                    </div>

                    {/* Organization */}
                    <div className="group bg-white border-2 border-gray-100 rounded-[40px] p-10 hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-50 transition-all duration-500 flex flex-col">
                        <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-purple-500 transition-all duration-500">
                            <Building2 size={30} className="text-purple-500 group-hover:text-white transition-colors duration-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-3">Organization</h2>
                        <p className="text-gray-500 font-medium mb-8 flex-1">
                            Create your institution's account, onboard teachers & students, and manage shared content.
                        </p>
                        <div className="space-y-2 mb-8">
                            {['Member management', 'Shared lecture library', 'Organization analytics'].map(f => (
                                <div key={f} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                    <span className="text-xs font-bold text-gray-500">{f}</span>
                                </div>
                            ))}
                        </div>
                        <Link
                            href="/register?role=admin"
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-center hover:bg-purple-500 transition-colors duration-300"
                        >
                            Create Organization
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features strip */}
            <section className="border-t border-gray-100 bg-gray-50 py-16">
                <div className="max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                        { icon: <Zap size={22} className="text-blue-600" />, title: 'Instant Transcription', desc: 'Whisper AI converts speech to text with 95%+ accuracy in real-time.' },
                        { icon: <Brain size={22} className="text-blue-600" />, title: 'Smart Summaries', desc: 'Groq LLM generates structured notes, key takeaways, and study guides.' },
                        { icon: <FileText size={22} className="text-blue-600" />, title: 'Auto Quizzes', desc: 'AI creates relevant MCQs with explanations from any lecture content.' },
                    ].map(({ icon, title, desc }) => (
                        <div key={title} className="flex flex-col gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">{icon}</div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{title}</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-8 text-center border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">EchoBrain · AI Lecture Platform · Final Year Project</p>
            </footer>
        </main>
    );
}
