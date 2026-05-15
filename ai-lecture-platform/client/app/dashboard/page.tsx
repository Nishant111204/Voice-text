"use client"

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) { router.replace('/login'); return; }
        if (user.role === 'teacher') { router.replace('/teacher/dashboard'); return; }
        if (user.role === 'admin' || user.role === 'superadmin') { router.replace('/org/dashboard'); return; }
        router.replace('/student/dashboard');
    }, [user, loading, router]);

    return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Redirecting...</p>
            </div>
        </div>
    );
}
