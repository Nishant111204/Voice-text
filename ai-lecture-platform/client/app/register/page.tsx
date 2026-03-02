"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import Link from 'next/link';
import { User, School, BookOpen, Building2 } from 'lucide-react';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [orgName, setOrgName] = useState(''); // For new org
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Simplified: If admin, we might need to create org first or pass orgName 
            // For now, let's just pass role
            const { data } = await api.post('/auth/register', {
                name,
                email,
                password,
                role
            });
            login(data.token, data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-xl shadow-gray-200 border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">L</div>
                    <h2 className="mt-6 text-3xl font-black text-gray-900 tracking-tight uppercase">Join the Future</h2>
                    <p className="mt-2 text-sm font-bold text-gray-400 uppercase tracking-widest">Select your role to get started</p>
                </div>

                {error && (
                    <div className="p-4 text-sm font-bold text-red-600 bg-red-50 rounded-2xl border border-red-100 animate-shake">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${role === 'student' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                        >
                            <BookOpen size={24} className="mb-2" />
                            <span className="text-xs font-black uppercase tracking-wider">Student</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('teacher')}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${role === 'teacher' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                        >
                            <School size={24} className="mb-2" />
                            <span className="text-xs font-black uppercase tracking-wider">Teacher</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Email address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                                placeholder="john@university.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all uppercase tracking-[0.2em] shadow-xl shadow-blue-200"
                        >
                            Create Account
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <Link href="/login" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                        Already a member? <span className="text-blue-600">Sign in</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
