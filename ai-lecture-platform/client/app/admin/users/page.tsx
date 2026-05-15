"use client"

import { useEffect, useState, Suspense } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft, Building2, School, BookOpen, Shield, ChevronRight, UserPlus, Copy, CheckCircle } from 'lucide-react';

type Member = { _id: string; name: string; email: string; role: string; };
type Org = { _id: string; name: string; organizationCode?: string; organizationType?: string; };

function AdminUsersContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [members, setMembers] = useState<Member[]>([]);
    const [organization, setOrganization] = useState<Org | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [emailToAdd, setEmailToAdd] = useState('');
    const [roleToAdd, setRoleToAdd] = useState<'student' | 'teacher'>('student');
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error'>('success');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (!['admin', 'superadmin'].includes(user.role)) { router.push('/dashboard'); return; }

        const load = async () => {
            try {
                if (user.role === 'admin') {
                    const { data } = await api.get('/organizations/me/details');
                    setOrganization(data.organization);
                    setOrgId(data.organization._id);
                    setMembers(data.members || []);
                    return;
                }
                const paramOrgId = searchParams.get('orgId');
                const { data: orgs } = await api.get('/organizations');
                const first = orgs?.[0];
                const resolvedId = paramOrgId || first?._id;
                if (!resolvedId) { setStatus('No organizations found'); return; }
                setOrgId(resolvedId);
                setOrganization(orgs.find((o: Org) => o._id === resolvedId) || first);
                const { data: m } = await api.get(`/organizations/${resolvedId}/members`);
                setMembers(m || []);
            } catch (e: any) {
                setStatus(e?.response?.data?.message || 'Failed to load');
                setStatusType('error');
            }
        };
        load();
    }, [user, router, searchParams]);

    const handleAddMember = async () => {
        if (!orgId || !emailToAdd.trim()) return;
        setStatus('');
        try {
            await api.post(`/organizations/${orgId}/members`, { email: emailToAdd.trim(), role: roleToAdd });
            setStatus(`Member updated successfully.`);
            setStatusType('success');
            setEmailToAdd('');
            const { data } = await api.get(`/organizations/${orgId}/members`);
            setMembers(data || []);
        } catch (e: any) {
            setStatus(e?.response?.data?.message || 'Failed to update member');
            setStatusType('error');
        }
    };

    const copyCode = () => {
        if (organization?.organizationCode) {
            navigator.clipboard.writeText(organization.organizationCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const teachers = members.filter(m => m.role === 'teacher');
    const students = members.filter(m => m.role === 'student');
    const admins = members.filter(m => ['admin', 'superadmin'].includes(m.role));

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans pb-20">
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/org/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={16} /> Org Dashboard
                    </Link>
                    <div className="flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100">
                        <Shield size={14} className="text-purple-500" />
                        <span className="text-[11px] font-black text-purple-600 uppercase tracking-widest">User Management</span>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Member Management</p>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">
                            {organization?.name || 'Organization'}
                        </h1>
                        {organization?.organizationType && (
                            <p className="text-gray-400 font-medium mt-1 capitalize">{organization.organizationType}</p>
                        )}
                    </div>

                    {organization?.organizationCode && (
                        <button onClick={copyCode} className="flex items-center gap-4 bg-white border-2 border-gray-100 px-6 py-4 rounded-2xl hover:border-blue-300 transition-all group">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5 text-left">Invite Code</p>
                                <p className="text-xl font-black text-gray-900 tracking-widest">{organization.organizationCode}</p>
                            </div>
                            {copied ? <CheckCircle size={20} className="text-green-500" /> : <Copy size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />}
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Total', value: members.length, icon: <Users size={16} />, color: 'bg-blue-50 text-blue-600' },
                        { label: 'Teachers', value: teachers.length, icon: <School size={16} />, color: 'bg-orange-50 text-orange-600' },
                        { label: 'Students', value: students.length, icon: <BookOpen size={16} />, color: 'bg-green-50 text-green-600' },
                        { label: 'Admins', value: admins.length, icon: <Shield size={16} />, color: 'bg-purple-50 text-purple-600' },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className="bg-white border border-gray-100 rounded-[28px] p-6 flex flex-col gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
                            <p className="text-3xl font-black text-gray-900">{value}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Status bar */}
                {status && (
                    <div className={`mb-8 p-4 rounded-2xl flex items-center justify-between ${statusType === 'success' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                        <span className="font-bold text-sm">{status}</span>
                        <button onClick={() => setStatus('')} className="opacity-50 hover:opacity-100">✕</button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Members list */}
                    <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 p-8">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">All Members</h2>
                        {members.length === 0 ? (
                            <div className="py-12 text-center">
                                <Users size={40} className="mx-auto text-gray-100 mb-4" />
                                <p className="font-bold text-gray-400 uppercase tracking-tight text-sm">No members yet</p>
                                <p className="text-xs text-gray-300 mt-1">Share the invite code so members can join.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-sm transition-all">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                                            m.role === 'teacher' ? 'bg-orange-100 text-orange-600' :
                                            m.role === 'student' ? 'bg-green-100 text-green-600' :
                                            'bg-purple-100 text-purple-600'
                                        }`}>
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-800 truncate">{m.name}</p>
                                            <p className="text-xs font-bold text-gray-400 truncate">{m.email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${
                                            m.role === 'teacher' ? 'bg-orange-100 text-orange-600' :
                                            m.role === 'student' ? 'bg-green-100 text-green-600' :
                                            'bg-purple-100 text-purple-600'
                                        }`}>
                                            {m.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add member panel */}
                    <div className="bg-gray-900 text-white rounded-[40px] p-8 flex flex-col">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                            <UserPlus size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Add Member</h2>
                        <p className="text-gray-400 font-medium text-sm mb-8">
                            Assign or update a user by their email address. The user must already have an account.
                        </p>

                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    value={emailToAdd}
                                    onChange={e => setEmailToAdd(e.target.value)}
                                    placeholder="member@email.com"
                                    className="w-full px-4 py-3 bg-white/10 border border-white/10 text-white rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 font-bold text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Assign Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['student', 'teacher'] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setRoleToAdd(r)}
                                            className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${roleToAdd === r ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAddMember}
                            disabled={!orgId || !emailToAdd.trim()}
                            className="mt-8 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-blue-900/30"
                        >
                            Update Member
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminUsersPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
            <AdminUsersContent />
        </Suspense>
    );
}
