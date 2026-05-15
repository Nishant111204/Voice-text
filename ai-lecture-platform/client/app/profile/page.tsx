"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, User, Mail, Shield, Building2,
    Copy, CheckCircle, LogOut, BookOpen, School, ChevronRight
} from 'lucide-react';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    // Join org state
    const [orgCode, setOrgCode] = useState('');
    const [orgName, setOrgName] = useState('');
    const [joinStatus, setJoinStatus] = useState('');
    const [joinError, setJoinError] = useState('');
    const [joining, setJoining] = useState(false);

    const [orgDetails, setOrgDetails] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) { router.replace('/login'); return; }
        if (['admin', 'superadmin'].includes(user.role)) { router.replace('/org/dashboard'); }
    }, [user, router]);

    useEffect(() => {
        if (user?.organizationId) {
            // Fetch org details for display
            api.get('/auth/me').catch(() => null);
        }
    }, [user]);

    const handleJoinOrg = async () => {
        setJoinStatus('');
        setJoinError('');
        if (!orgCode.trim()) { setJoinError('Organization code is required.'); return; }
        if (!orgName.trim()) { setJoinError('Organization name is required.'); return; }

        setJoining(true);
        try {
            const { data } = await api.post('/auth/join-organization', {
                organizationCode: orgCode.trim().toUpperCase(),
                organizationName: orgName.trim(),
            });
            localStorage.setItem('token', data.token);
            setJoinStatus(`Successfully joined ${data.organizationName}! Refreshing…`);
            setTimeout(() => window.location.reload(), 1200);
        } catch (e: any) {
            setJoinError(e?.response?.data?.message || 'Could not join. Check both fields and try again.');
        } finally {
            setJoining(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const isStudent = user.role === 'student';
    const dashLink = isStudent ? '/student/dashboard' : '/teacher/dashboard';
    const roleColor = isStudent ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100';
    const roleIcon = isStudent ? <BookOpen size={16} /> : <School size={16} />;

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans pb-20">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href={dashLink} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={16} /> Dashboard
                    </Link>
                    <button onClick={logout} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">
                        <LogOut size={15} /> Sign Out
                    </button>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
                {/* Profile card */}
                <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                    {/* Avatar */}
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-200 flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">{user.name}</h1>
                            <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest ${roleColor}`}>
                                {roleIcon} {user.role}
                            </div>
                        </div>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-3">
                        <InfoRow icon={<Mail size={16} />} label="Email" value={user.email} />
                        <InfoRow icon={<Shield size={16} />} label="Role" value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} />
                        <InfoRow icon={<User size={16} />} label="Account ID" value={user._id} mono />
                    </div>
                </div>

                {/* Organization card */}
                <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Organization</h2>

                    {user.organizationId ? (
                        <div>
                            {/* Already in an org */}
                            <div className="flex items-center gap-4 p-5 bg-green-50 border border-green-100 rounded-2xl mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                                    <Building2 size={22} className="text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-0.5">Joined</p>
                                    <p className="font-black text-gray-900 text-lg truncate">{user.organizationName || 'Your Organization'}</p>
                                </div>
                                <CheckCircle size={22} className="text-green-500 flex-shrink-0" />
                            </div>

                            {user.organizationCode && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Organization Code</p>
                                        <p className="font-black text-gray-900 tracking-widest text-lg">{user.organizationCode}</p>
                                    </div>
                                    <button
                                        onClick={() => copyCode(user.organizationCode!)}
                                        className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                                    >
                                        {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-6">
                                <Building2 size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-bold text-blue-700">
                                    You're on a <strong>personal account</strong>. Join an organization to access shared lectures from your institution.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                        Organization Code <span className="text-gray-300 normal-case font-bold tracking-normal">(e.g. ORG-AB12CD)</span>
                                    </label>
                                    <input
                                        value={orgCode}
                                        onChange={e => setOrgCode(e.target.value.toUpperCase())}
                                        placeholder="ORG-XXXXXX"
                                        maxLength={10}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-black text-gray-700 outline-none tracking-widest uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Organization Name</label>
                                    <input
                                        value={orgName}
                                        onChange={e => setOrgName(e.target.value)}
                                        placeholder="My University / School"
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400">
                                    Both fields are required. Get the code from your admin or teacher.
                                </p>
                                <button
                                    onClick={handleJoinOrg}
                                    disabled={!orgCode.trim() || !orgName.trim() || joining}
                                    className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 transition-all shadow-lg shadow-blue-200"
                                >
                                    {joining ? 'Joining…' : 'Join Organization'}
                                </button>
                            </div>

                            {joinStatus && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                    <p className="text-sm font-bold text-green-700">{joinStatus}</p>
                                </div>
                            )}
                            {joinError && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
                                    <p className="text-sm font-bold text-red-600">{joinError}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick links */}
                <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">Quick Links</h2>
                    <div className="space-y-2">
                        {[
                            { href: dashLink, label: 'Go to Dashboard', desc: 'Back to your main workspace' },
                            ...(user.organizationId ? [{ href: dashLink + '#org', label: 'Organization Lectures', desc: 'Browse shared content' }] : []),
                        ].map(({ href, label, desc }) => (
                            <Link key={href} href={href} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all group">
                                <div>
                                    <p className="font-black text-gray-800 group-hover:text-blue-600 transition-colors text-sm">{label}</p>
                                    <p className="text-xs font-bold text-gray-400 mt-0.5">{desc}</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-gray-100 text-gray-400 flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                <p className={`font-bold text-gray-800 truncate text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
            </div>
        </div>
    );
}
