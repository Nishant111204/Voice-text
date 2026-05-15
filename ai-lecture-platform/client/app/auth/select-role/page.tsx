"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { BookOpen, School, Building2, Presentation, ChevronRight } from 'lucide-react';

export default function SelectRolePage() {
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState<string | null>(null); // tracks which card is loading
    const [error, setError] = useState('');

    const handleSelectRole = async (role: 'student' | 'teacher') => {
        setLoading(role);
        setError('');
        try {
            const { data } = await api.post('/auth/set-role', { role });
            login(data.token, data);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to set role. Please try again.');
            setLoading(null);
        }
    };

    const handleCreateOrg = () => {
        // Token already in localStorage from callback page
        router.push('/auth/setup-org');
    };

    const cards = [
        {
            id: 'student' as const,
            icon: <BookOpen size={28} />,
            label: 'Student',
            desc: 'Access lectures, take quizzes, and track your progress.',
            bg: 'bg-green-50',
            color: 'text-green-500',
            hoverBorder: 'hover:border-green-400',
            hoverShadow: 'hover:shadow-green-50',
            action: () => handleSelectRole('student'),
        },
        {
            id: 'teacher' as const,
            icon: <School size={28} />,
            label: 'Teacher',
            desc: 'Upload and record lectures, share content with your organization.',
            bg: 'bg-blue-50',
            color: 'text-blue-600',
            hoverBorder: 'hover:border-blue-400',
            hoverShadow: 'hover:shadow-blue-50',
            action: () => handleSelectRole('teacher'),
        },
        {
            id: 'org' as const,
            icon: <Building2 size={28} />,
            label: 'Create Organization',
            desc: 'Set up your institution account and invite teachers and students.',
            bg: 'bg-purple-50',
            color: 'text-purple-500',
            hoverBorder: 'hover:border-purple-400',
            hoverShadow: 'hover:shadow-purple-50',
            action: handleCreateOrg,
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
                    <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">One Last Step</h1>
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
                    {cards.map(card => (
                        <button
                            key={card.id}
                            onClick={card.action}
                            disabled={!!loading}
                            className={`w-full flex items-center gap-5 p-7 bg-white border-2 border-gray-100 rounded-[28px] hover:shadow-xl transition-all duration-300 text-left group disabled:opacity-60 disabled:cursor-not-allowed ${card.hoverBorder} ${card.hoverShadow}`}
                        >
                            <div className={`w-16 h-16 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                {card.icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">{card.label}</p>
                                <p className="text-sm text-gray-500 font-medium">{card.desc}</p>
                            </div>
                            {loading === card.id ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                            ) : (
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>

                <p className="mt-8 text-center text-xs font-bold text-gray-400">
                    You can update your profile and join an organization later.
                </p>
            </div>
        </div>
    );
}
