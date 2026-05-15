"use client"

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowLeft, Shield, ChevronRight, Globe, School, Users } from 'lucide-react';

type Org = {
    _id: string;
    name: string;
    organizationCode?: string;
    organizationType?: string;
    domain?: string;
    admin?: { name?: string; email?: string };
};

export default function AdminOrgsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!user) return;
        if (user.role !== 'superadmin') { router.push('/dashboard'); return; }
        api.get('/organizations')
            .then(({ data }) => setOrgs(data || []))
            .catch(e => setStatus(e?.response?.data?.message || 'Failed to load'));
    }, [user, router]);

    if (!user) return null;

    const typeColor: Record<string, string> = {
        college: 'bg-blue-100 text-blue-600',
        school: 'bg-green-100 text-green-600',
        classes: 'bg-orange-100 text-orange-600',
        other: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans pb-20">
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/org/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={16} /> Org Dashboard
                    </Link>
                    <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-2xl">
                        <Shield size={14} className="text-white" />
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Superadmin</span>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="mb-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Superadmin View</p>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">All Organizations</h1>
                    <p className="text-gray-400 font-medium">{orgs.length} organization{orgs.length !== 1 ? 's' : ''} registered</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Total', value: orgs.length, color: 'bg-blue-50 text-blue-600', icon: <Building2 size={16} /> },
                        { label: 'Colleges', value: orgs.filter(o => o.organizationType === 'college').length, color: 'bg-purple-50 text-purple-600', icon: <School size={16} /> },
                        { label: 'Schools', value: orgs.filter(o => o.organizationType === 'school').length, color: 'bg-green-50 text-green-600', icon: <Globe size={16} /> },
                        { label: 'Classes', value: orgs.filter(o => o.organizationType === 'classes').length, color: 'bg-orange-50 text-orange-600', icon: <Users size={16} /> },
                    ].map(({ label, value, color, icon }) => (
                        <div key={label} className="bg-white border border-gray-100 rounded-[28px] p-6 flex flex-col gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
                            <p className="text-3xl font-black text-gray-900">{value}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                        </div>
                    ))}
                </div>

                {status && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{status}</div>
                )}

                {/* Org cards */}
                {orgs.length === 0 ? (
                    <div className="py-20 bg-white rounded-[48px] border border-gray-100 text-center">
                        <Building2 size={52} className="mx-auto text-gray-100 mb-5" />
                        <p className="font-bold text-gray-400 uppercase tracking-tight">No organizations yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {orgs.map(org => (
                            <div key={org._id} className="bg-white rounded-[32px] border border-gray-100 p-8 hover:shadow-xl hover:shadow-blue-50 hover:border-blue-100 transition-all duration-500 group">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                        <Building2 size={26} />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${typeColor[org.organizationType || 'other'] || typeColor.other}`}>
                                        {org.organizationType || 'other'}
                                    </span>
                                </div>

                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{org.name}</h3>
                                {org.domain && <p className="text-xs font-bold text-gray-400 mb-4">{org.domain}</p>}

                                <div className="space-y-2 mb-6">
                                    {org.organizationCode && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 w-16">Code</span>
                                            <span className="text-xs font-black text-gray-700 bg-gray-100 px-3 py-1 rounded-lg tracking-widest">{org.organizationCode}</span>
                                        </div>
                                    )}
                                    {org.admin?.name && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 w-16">Admin</span>
                                            <span className="text-xs font-bold text-gray-600">{org.admin.name}</span>
                                        </div>
                                    )}
                                    {org.admin?.email && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 w-16">Email</span>
                                            <span className="text-xs font-bold text-gray-600 truncate">{org.admin.email}</span>
                                        </div>
                                    )}
                                </div>

                                <Link href={`/admin/users?orgId=${org._id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all group/link">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover/link:text-blue-600">View Members</span>
                                    <ChevronRight size={16} className="text-gray-400 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
