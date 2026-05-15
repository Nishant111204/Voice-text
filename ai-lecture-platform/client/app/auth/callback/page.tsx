"use client"

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Presentation } from 'lucide-react';

function CallbackHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const token   = searchParams.get('token');
        const isNew   = searchParams.get('new') === '1';
        const name    = searchParams.get('name') || '';
        const email   = searchParams.get('email') || '';
        const role    = searchParams.get('role') || 'student';
        const id      = searchParams.get('id') || '';
        const orgId   = searchParams.get('orgId') || undefined;
        const err     = searchParams.get('error');

        if (err) {
            setError('Google sign-in failed. Please try again.');
            return;
        }

        if (!token) {
            setError('No token received. Please try again.');
            return;
        }

        // Store the token immediately
        localStorage.setItem('token', token);

        if (isNew) {
            // Brand-new Google user → ask them to pick a role
            // Pass along the token so select-role can call /api/auth/set-role
            router.replace('/auth/select-role');
        } else {
            // Returning user — log them in normally
            login(token, {
                _id: id,
                name,
                email,
                role,
                organizationId: orgId,
            });
        }
    }, [searchParams, login, router]);

    if (error) return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center px-4">
            <div className="bg-white rounded-[32px] border border-red-100 p-10 max-w-sm w-full text-center shadow-xl">
                <p className="text-red-500 font-black uppercase tracking-widest text-sm mb-4">{error}</p>
                <button
                    onClick={() => router.replace('/login')}
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                    Back to Login
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center gap-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
                <Presentation size={26} className="text-white" />
            </div>
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Signing you in…</p>
            </div>
        </div>
    );
}

export default function CallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <CallbackHandler />
        </Suspense>
    );
}
