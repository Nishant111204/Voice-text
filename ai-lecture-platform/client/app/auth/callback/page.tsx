"use client"

import { useEffect, useState } from 'react';
import { Presentation, AlertTriangle } from 'lucide-react';

/**
 * Google OAuth callback handler.
 *
 * Why we avoid useSearchParams / router.push / useAuth here:
 *  - useSearchParams can return empty params on the first SSR render tick.
 *  - router.push() is unreliable right after a cross-origin redirect
 *    (localhost:5000 → localhost:3000) because Next.js router state is stale.
 *  - Putting `login` from useAuth in a dep array causes an infinite re-render
 *    loop (login → setUser → AuthProvider re-render → new login ref → effect
 *    re-fires).
 *
 * Solution: read window.location.search once on mount, store the token,
 * then use window.location.href (full page navigation) so AuthContext
 * re-initialises cleanly with the new token via its checkAuth() call.
 */
export default function CallbackPage() {
    const [status, setStatus] = useState<'loading' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Parse the raw query string — always accurate regardless of hydration state
        const params = new URLSearchParams(window.location.search);

        const err   = params.get('error');
        const token = params.get('token');
        const isNew = params.get('new') === '1';
        const role  = params.get('role') || 'student';

        if (err) {
            setErrorMsg('Google sign-in was cancelled or failed. Please try again.');
            setStatus('error');
            return;
        }

        if (!token) {
            setErrorMsg('No authentication token received from Google. Please try again.');
            setStatus('error');
            return;
        }

        // Persist the JWT — AuthContext will pick this up on the next page load
        localStorage.setItem('token', token);

        // Determine where to send the user
        let destination: string;

        if (isNew) {
            // First-time Google user — must choose Student / Teacher / Create Org
            destination = '/auth/select-role';
        } else {
            // Returning user — route directly to their role dashboard
            if (role === 'teacher') {
                destination = '/teacher/dashboard';
            } else if (role === 'admin' || role === 'superadmin') {
                destination = '/org/dashboard';
            } else {
                destination = '/student/dashboard';
            }
        }

        // Full page navigation: forces AuthContext checkAuth() to run with
        // the new token and set the user state from scratch.
        window.location.href = destination;

    }, []); // empty dep array — runs exactly once on mount

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#FDFDFF] font-sans flex items-center justify-center px-4">
                <div className="bg-white rounded-[32px] border border-red-100 p-10 max-w-sm w-full text-center shadow-xl">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <AlertTriangle size={28} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-3">
                        Sign-in Failed
                    </h2>
                    <p className="text-sm font-medium text-gray-500 mb-8">{errorMsg}</p>
                    <button
                        onClick={() => { window.location.href = '/login'; }}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans flex flex-col items-center justify-center gap-8">
            <div className="w-16 h-16 bg-blue-600 rounded-[20px] flex items-center justify-center shadow-xl shadow-blue-200">
                <Presentation size={30} className="text-white" />
            </div>
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-700">Signing you in</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">Setting up your account…</p>
                </div>
            </div>
        </div>
    );
}
