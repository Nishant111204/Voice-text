"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { BookOpen, School, Presentation, ChevronRight } from 'lucide-react';

export default function SelectRolePage() {
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSelectRole = async (role: 'student' | 'teacher') => {
        setLoading(true);
        setError('');
        try {
            // Token is already in localStorage from the callback page
            const { data } = await api.post('/auth/set-role', { role });
            // Re-login with the fresh token that reflects the chosen role
            login(data.token, data);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to set role. Please try again.');
            setLoading(false);
        }
    };

    const roles = [
        {
            id: 'student' as const,
            icon: <BookOpen size={28} />,
            label: 'Student',
            desc: 'I want to access lectures, take quizzes, and study.',
            bg: 'bg-green-50',
            color: 'text-green-500',
            hover: 'hover:border-green-400 hover:shadow-green-50',
        },
        {
            id: 'teacher' as const,
            icon: <School size={28} />,
            label: 'Teacher',
            desc: 'I want to upload lectures and share content with students.',
            bg: 'bg-blue-50',
            color: 'text-blue-600',
            hover: 'hover:border-blue-400 hover:shadow-blue-50',
        },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
                        <Presentation size={26} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">One last step</h1>
                    <p className="mt-3 text-sm font-bold text-gray-400 uppercase tracking-widest">
                        How will you use EchoBrain?
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600 text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {roles.map(r => (
                        <button
                            key={r.id}
                            onClick={() => handleSelectRole(r.id)}
                            disabled={loading}
                            className={`w-full flex items-center gap-5 p-7 bg-white border-2 border-gray-100 rounded-[28px] hover:shadow-xl transition-all duration-300 text-left group disabled:opacity-50 disabled:cursor-not-allowed ${r.hover}`}
                        >
                            <div className={`w-16 h-16 ${r.bg} rounded-2xl flex items-center justify-center ${r.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                {r.icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">{r.label}</p>
                                <p className="text-sm text-gray-500 font-medium">{r.desc}</p>
                            </div>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                            ) : (
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>

                <p className="mt-8 text-center text-xs font-bold text-gray-400">
                    You can always update your role from your profile later.
                </p>
            </div>
        </div>
    );
}
