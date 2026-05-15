"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Building2, LogOut, Presentation, Users, School, BookOpen,
    Globe, Copy, CheckCircle, TrendingUp, ChevronRight, Search
} from 'lucide-react';

export default function OrgDashboard() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    const [orgDetails, setOrgDetails] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [lectures, setLectures] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) { router.replace('/login'); return; }
        if (!loading && user && !['admin', 'superadmin'].includes(user.role)) { router.replace('/dashboard'); }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            api.get('/organizations/me/details').catch(() => null),
            api.get('/lectures').catch(() => null),
        ]).then(([orgRes, lecturesRes]) => {
            if (orgRes) {
                setOrgDetails(orgRes.data.organization);
                setMembers(orgRes.data.members || []);
            }
            // Only org-shared lectures (isPrivate: false) belong to the organization view
            if (lecturesRes) setLectures((lecturesRes.data || []).filter((l: any) => l.isPrivate === false));
        }).finally(() => setFetching(false));
    }, [user]);

    const copyCode = () => {
        if (orgDetails?.organizationCode) {
            navigator.clipboard.writeText(orgDetails.organizationCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading || !user) return (
        <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const teachers = members.filter(m => m.role === 'teacher');
    const students = members.filter(m => m.role === 'student');
    const sharedLectures = lectures.filter(l => !l.isPrivate);
    const completed = lectures.filter(l => l.status === 'completed').length;

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans pb-20">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Presentation size={22} className="text-white" />
                        </div>
                        <span className="text-xl font-black text-gray-900 tracking-tighter uppercase">EchoBrain</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100">
                            <Building2 size={14} className="text-purple-500" />
                            <span className="text-[11px] font-black text-purple-600 uppercase tracking-widest">{user.role === 'superadmin' ? 'Superadmin' : 'Admin'}</span>
                            <div className="w-[1px] h-3 bg-purple-200"></div>
                            <span className="text-xs font-bold text-gray-700">{user.name}</span>
                        </div>
                        <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Organization Dashboard</p>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">
                            {orgDetails?.name || user.organizationName || 'Your Organization'}
                        </h1>
                        {orgDetails?.organizationType && (
                            <p className="text-gray-400 font-medium mt-2 capitalize">{orgDetails.organizationType} · {orgDetails?.domain || 'No domain set'}</p>
                        )}
                    </div>
                    {orgDetails?.organizationCode && (
                        <button
                            onClick={copyCode}
                            className="flex items-center gap-3 bg-white border-2 border-gray-100 px-6 py-4 rounded-2xl hover:border-blue-300 transition-all group"
                        >
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Invite Code</p>
                                <p className="text-xl font-black text-gray-900 tracking-widest">{orgDetails.organizationCode}</p>
                            </div>
                            {copied ? <CheckCircle size={20} className="text-green-500" /> : <Copy size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />}
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Total Members', value: members.length, color: 'bg-blue-50 text-blue-600', icon: <Users size={16} /> },
                        { label: 'Teachers', value: teachers.length, color: 'bg-orange-50 text-orange-600', icon: <School size={16} /> },
                        { label: 'Students', value: students.length, color: 'bg-green-50 text-green-600', icon: <BookOpen size={16} /> },
                        { label: 'Shared Lectures', value: sharedLectures.length, color: 'bg-purple-50 text-purple-600', icon: <Globe size={16} /> },
                    ].map(({ label, value, color, icon }) => (
                        <div key={label} className="bg-white border border-gray-100 rounded-[28px] p-6 flex flex-col gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
                            <p className="text-3xl font-black text-gray-900">{value}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                    <Link href="/admin/users" className="group p-8 bg-blue-600 text-white rounded-[32px] hover:shadow-2xl hover:shadow-blue-200 transition-all flex flex-col justify-between min-h-[180px]">
                        <Users size={32} />
                        <div>
                            <p className="text-xl font-black uppercase tracking-tight mt-8">Manage Members</p>
                            <p className="text-white/70 text-sm font-medium mt-1">Add or manage students and teachers</p>
                        </div>
                    </Link>

                    {user.role === 'superadmin' && (
                        <Link href="/admin/orgs" className="group p-8 bg-gray-900 text-white rounded-[32px] hover:shadow-2xl hover:shadow-gray-300 transition-all flex flex-col justify-between min-h-[180px]">
                            <Building2 size={32} />
                            <div>
                                <p className="text-xl font-black uppercase tracking-tight mt-8">All Organizations</p>
                                <p className="text-white/70 text-sm font-medium mt-1">View and manage all institutions</p>
                            </div>
                        </Link>
                    )}

                    <div className="p-8 bg-white border-2 border-gray-100 rounded-[32px] flex flex-col justify-between min-h-[180px]">
                        <TrendingUp size={32} className="text-purple-500" />
                        <div>
                            <p className="text-xl font-black text-gray-900 uppercase tracking-tight mt-8">Content Analytics</p>
                            <p className="text-gray-400 text-sm font-medium mt-1">{completed} of {lectures.length} lectures processed</p>
                        </div>
                    </div>
                </div>

                {/* Members & Lectures side-by-side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Members */}
                    <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Members</h2>
                            <Link href="/admin/users" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1">
                                View all <ChevronRight size={14} />
                            </Link>
                        </div>

                        {fetching ? (
                            <div className="py-10 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                        ) : members.length === 0 ? (
                            <div className="py-12 text-center">
                                <Users size={40} className="mx-auto text-gray-100 mb-4" />
                                <p className="font-bold text-gray-400 uppercase tracking-tight">No members yet</p>
                                <p className="text-sm text-gray-300 mt-1">Share the invite code above so members can join.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {members.slice(0, 6).map((member: any) => (
                                    <div key={member._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${member.role === 'teacher' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-800 truncate">{member.name}</p>
                                            <p className="text-xs font-bold text-gray-400 truncate">{member.email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${member.role === 'teacher' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                            {member.role}
                                        </span>
                                    </div>
                                ))}
                                {members.length > 6 && (
                                    <Link href="/admin/users" className="block text-center text-xs font-black uppercase tracking-widest text-blue-600 pt-2 hover:underline">
                                        +{members.length - 6} more members
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Shared Lectures */}
                    <div className="bg-white rounded-[40px] border border-gray-100 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Shared Lectures</h2>
                            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-xl">
                                <Globe size={12} className="text-purple-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">{sharedLectures.length} public</span>
                            </div>
                        </div>

                        {fetching ? (
                            <div className="py-10 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                        ) : sharedLectures.length === 0 ? (
                            <div className="py-12 text-center">
                                <Search size={40} className="mx-auto text-gray-100 mb-4" />
                                <p className="font-bold text-gray-400 uppercase tracking-tight">No shared lectures</p>
                                <p className="text-sm text-gray-300 mt-1">Teachers can share lectures when uploading.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sharedLectures.slice(0, 6).map((lecture: any) => (
                                    <Link key={lecture._id} href={`/lectures/${lecture._id}`}>
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group cursor-pointer">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Presentation size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-gray-800 truncate group-hover:text-blue-600 transition-colors">{lecture.title}</p>
                                                <p className="text-xs font-bold text-gray-400">{new Date(lecture.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${lecture.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600'}`}>
                                                {lecture.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
