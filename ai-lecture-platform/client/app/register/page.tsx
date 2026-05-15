"use client"

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import Link from 'next/link';
import { BookOpen, School, Building2, Presentation, ChevronRight, ArrowLeft } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const GoogleIcon = () => (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

type Role = 'student' | 'teacher' | 'admin';
function RegisterForm() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<'pick-role' | 'fill-form'>('pick-role');
    const [role, setRole] = useState<Role>('student');

    // Common fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Org join (student / teacher) — both required
    const [orgCode, setOrgCode] = useState('');
    const [orgName, setOrgName] = useState('');

    // Admin-only
    const [newOrgName, setNewOrgName] = useState('');
    const [orgType, setOrgType] = useState('college');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();

    useEffect(() => {
        const r = searchParams.get('role') as Role | null;
        if (r && ['student', 'teacher', 'admin'].includes(r)) {
            setRole(r);
            setStep('fill-form');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let response;

            if (role === 'admin') {
                response = await api.post('/auth/register-organization', {
                    adminName: name,
                    email,
                    password,
                    organizationName: newOrgName,
                    organizationType: orgType,
                });
            } else {
                // Both code AND name required to join an org; both empty = personal account
                const wantsOrg = orgCode.trim() || orgName.trim();
                if (wantsOrg && (!orgCode.trim() || !orgName.trim())) {
                    throw new Error('Please fill both the organization code and name, or leave both blank for a personal account.');
                }
                const orgPayload: Record<string, string> = wantsOrg
                    ? { organizationCode: orgCode.trim().toUpperCase(), organizationName: orgName.trim() }
                    : {};

                response = await api.post('/auth/register', {
                    name,
                    email,
                    password,
                    role,
                    ...orgPayload,
                });
            }

            login(response.data.token, response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const roleConfig = {
        student: {
            icon: <BookOpen size={24} />,
            color: 'text-green-500',
            bg: 'bg-green-50',
            label: 'Student',
            desc: 'Access lectures, notes, and quizzes for your courses.',
        },
        teacher: {
            icon: <School size={24} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            label: 'Teacher',
            desc: 'Upload and record lectures, share with your organization.',
        },
        admin: {
            icon: <Building2 size={24} />,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            label: 'Organization Admin',
            desc: 'Create your institution account and manage members.',
        },
    };

    const cfg = roleConfig[role];

    /* ── Step 1: Pick role ── */
    if (step === 'pick-role') {
        return (
            <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-12">
                        <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
                            <Presentation size={26} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Create Account</h1>
                        <p className="mt-2 text-sm font-bold text-gray-400 uppercase tracking-widest">Select your role</p>
                    </div>

                    <div className="space-y-4">
                        {(['student', 'teacher', 'admin'] as Role[]).map((r) => {
                            const c = roleConfig[r];
                            return (
                                <button
                                    key={r}
                                    onClick={() => { setRole(r); setStep('fill-form'); }}
                                    className="w-full flex items-center gap-5 p-6 bg-white border-2 border-gray-100 rounded-[28px] hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300 text-left group"
                                >
                                    <div className={`w-14 h-14 ${c.bg} rounded-2xl flex items-center justify-center ${c.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                        {c.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-lg font-black text-gray-900 uppercase tracking-tight">{c.label}</p>
                                        <p className="text-sm text-gray-500 font-medium mt-0.5">{c.desc}</p>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Google sign-up shortcut */}
                    <div className="mt-6">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                            <div className="relative flex justify-center">
                                <span className="px-4 bg-[#FDFDFF] text-[10px] font-black uppercase tracking-widest text-gray-300">or sign up with google</span>
                            </div>
                        </div>
                        <button
                            onClick={() => { window.location.href = `${BACKEND}/api/auth/google`; }}
                            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-700 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <GoogleIcon />
                            Continue with Google
                        </button>
                    </div>

                    <p className="mt-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Already a member?{' '}
                        <Link href="/login" className="text-blue-600 font-black">Sign in</Link>
                    </p>
                </div>
            </div>
        );
    }

    /* ── Step 2: Fill form ── */
    return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">
                <button
                    onClick={() => { setStep('pick-role'); setError(''); }}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors mb-10"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100 p-10">
                    {/* Role badge */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`w-14 h-14 ${cfg.bg} rounded-2xl flex items-center justify-center ${cfg.color}`}>
                            {cfg.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Registering as</p>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{cfg.label}</h2>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 mb-6 text-sm font-bold text-red-600 bg-red-50 rounded-2xl border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                {role === 'admin' ? 'Admin Name' : 'Full Name'}
                            </label>
                            <input
                                type="text" required placeholder="John Doe"
                                value={name} onChange={e => setName(e.target.value)}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                            <input
                                type="email" required placeholder="john@example.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                            <input
                                type="password" required placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                            />
                        </div>

                        {/* ── Admin: create new org ── */}
                        {role === 'admin' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Organization Name</label>
                                    <input
                                        type="text" required placeholder="My University / School / Classes"
                                        value={newOrgName} onChange={e => setNewOrgName(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Organization Type</label>
                                    <select
                                        value={orgType} onChange={e => setOrgType(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                                    >
                                        <option value="college">College</option>
                                        <option value="school">School</option>
                                        <option value="classes">Coaching Classes</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {/* ── Student / Teacher: join existing org (optional, but both fields required) ── */}
                        {role !== 'admin' && (
                            <div className="pt-1 space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    Join Organization <span className="text-gray-300 normal-case font-bold tracking-normal">(optional — leave both blank for personal account)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="ORG-XXXXXX"
                                    value={orgCode}
                                    onChange={e => setOrgCode(e.target.value.toUpperCase())}
                                    maxLength={10}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-black text-gray-700 outline-none tracking-widest uppercase"
                                />
                                <input
                                    type="text"
                                    placeholder="Organization name (e.g. My University)"
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                                />
                                <p className="text-[10px] font-bold text-gray-400 ml-1">
                                    Both code and name must match. Get the code from your admin or teacher.
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-2 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-white text-[10px] font-black uppercase tracking-widest text-gray-300">or</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => { window.location.href = `${BACKEND}/api/auth/google`; }}
                        className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-700 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Already a member?{' '}
                        <Link href="/login" className="text-blue-600 font-black">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center"><p className="text-gray-400 font-bold">Loading...</p></div>}>
            <RegisterForm />
        </Suspense>
    );
}
