"use client"

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, User, Mail, Shield, Building2,
    Copy, CheckCircle, LogOut, BookOpen, School, ChevronRight, Zap
} from 'lucide-react';

/* ── Role config — single source of truth ── */
type RoleKey = 'student' | 'teacher' | 'admin' | 'superadmin';

const ROLE_CONFIG: Record<RoleKey, {
    label: string;
    icon: React.ReactNode;
    badge: string;          // tailwind classes for the badge pill
    avatar: string;         // tailwind classes for the avatar box
    dashLink: string;
    dashLabel: string;
}> = {
    student: {
        label: 'Student',
        icon: <BookOpen size={16} />,
        badge: 'bg-green-50 text-green-700 border-green-200',
        avatar: 'bg-green-600 shadow-green-200',
        dashLink: '/student/dashboard',
        dashLabel: 'Student Dashboard',
    },
    teacher: {
        label: 'Teacher',
        icon: <School size={16} />,
        badge: 'bg-orange-50 text-orange-700 border-orange-200',
        avatar: 'bg-orange-500 shadow-orange-200',
        dashLink: '/teacher/dashboard',
        dashLabel: 'Teacher Dashboard',
    },
    admin: {
        label: 'Organization Admin',
        icon: <Building2 size={16} />,
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        avatar: 'bg-purple-600 shadow-purple-200',
        dashLink: '/org/dashboard',
        dashLabel: 'Org Dashboard',
    },
    superadmin: {
        label: 'Super Admin',
        icon: <Zap size={16} />,
        badge: 'bg-gray-900 text-white border-gray-700',
        avatar: 'bg-gray-900 shadow-gray-400',
        dashLink: '/org/dashboard',
        dashLabel: 'Org Dashboard',
    },
};

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [orgCode, setOrgCode] = useState('');
    const [orgName, setOrgName] = useState('');
    const [joinStatus, setJoinStatus] = useState('');
    const [joinError, setJoinError] = useState('');
    const [joining, setJoining] = useState(false);
    const [copied, setCopied] = useState(false);

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

    // Normalise role — fall back to 'student' only if truly unknown
    const roleKey = (user.role as RoleKey) in ROLE_CONFIG
        ? (user.role as RoleKey)
        : 'student';
    const cfg = ROLE_CONFIG[roleKey];

    const isOrgRole = ['admin', 'superadmin'].includes(user.role);
    const canJoinOrg = ['student', 'teacher'].includes(user.role) && !user.organizationId;

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans pb-20">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link
                        href={cfg.dashLink}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={16} /> {cfg.dashLabel}
                    </Link>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={15} /> Sign Out
                    </button>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

                {/* ── Profile card ── */}
                <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                    <div className="flex items-center gap-5 mb-8">
                        {/* Avatar with role-specific colour */}
                        <div className={`w-20 h-20 ${cfg.avatar} rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl flex-shrink-0`}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">{user.name}</h1>
                            {/* Role badge — fully adaptive */}
                            <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest ${cfg.badge}`}>
                                {cfg.icon}
                                {cfg.label}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <InfoRow icon={<Mail size={16} />}   label="Email"      value={user.email} />
                        <InfoRow icon={<Shield size={16} />} label="Role"       value={cfg.label} />
                        <InfoRow icon={<User size={16} />}   label="Account ID" value={user._id} mono />
                    </div>
                </div>

                {/* ── Organization card ── */}
                <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Organization</h2>

                    {user.organizationId ? (
                        <>
                            {/* Joined org info */}
                            <div className="flex items-center gap-4 p-5 bg-green-50 border border-green-100 rounded-2xl mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                                    <Building2 size={22} className="text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-0.5">
                                        {isOrgRole ? 'Managing' : 'Member of'}
                                    </p>
                                    <p className="font-black text-gray-900 text-lg truncate">
                                        {user.organizationName || 'Your Organization'}
                                    </p>
                                </div>
                                <CheckCircle size={22} className="text-green-500 flex-shrink-0" />
                            </div>

                            {/* Invite code — visible to all org members for easy sharing */}
                            {user.organizationCode && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                                            {isOrgRole ? 'Your Invite Code' : 'Organization Code'}
                                        </p>
                                        <p className="font-black text-gray-900 tracking-widest text-xl">{user.organizationCode}</p>
                                    </div>
                                    <button
                                        onClick={() => copyCode(user.organizationCode!)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all text-xs font-black uppercase tracking-widest"
                                    >
                                        {copied ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            )}

                            {/* Admin tip */}
                            {isOrgRole && (
                                <p className="mt-3 text-[10px] font-bold text-gray-400 ml-1">
                                    Share this code + your organization name with teachers and students so they can join.
                                </p>
                            )}
                        </>
                    ) : canJoinOrg ? (
                        /* ── Join org form (student / teacher without org) ── */
                        <>
                            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-6">
                                <Building2 size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-bold text-blue-700">
                                    You have a <strong>personal account</strong>. Join an organization to access shared lectures from your institution.
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
                        </>
                    ) : (
                        /* No org and not student/teacher (shouldn't normally happen) */
                        <p className="text-gray-400 font-bold text-sm">No organization linked to this account.</p>
                    )}
                </div>

                {/* ── Quick links ── */}
                <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">Quick Links</h2>
                    <div className="space-y-2">
                        {[
                            { href: cfg.dashLink, label: cfg.dashLabel, desc: 'Back to your main workspace' },
                            ...(user.organizationId && !isOrgRole
                                ? [{ href: `${cfg.dashLink}#org`, label: 'Organization Lectures', desc: 'Browse shared content from your institution' }]
                                : []),
                            ...(isOrgRole
                                ? [{ href: '/admin/users', label: 'Manage Members', desc: 'Add or update teachers and students' }]
                                : []),
                        ].map(({ href, label, desc }) => (
                            <Link key={label} href={href} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all group">
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
