"use client"

import { useState } from 'react';
import api from '@/services/api';
import { Building2, Presentation, ArrowLeft, CheckCircle } from 'lucide-react';

const ORG_TYPES = [
    { value: 'college', label: 'College / University', desc: 'Higher education institution' },
    { value: 'school', label: 'School', desc: 'Primary or secondary school' },
    { value: 'classes', label: 'Coaching Classes', desc: 'Tuition centre or coaching institute' },
    { value: 'other', label: 'Other', desc: 'Any other type of organization' },
];

export default function SetupOrgPage() {
    const [orgName, setOrgName] = useState('');
    const [orgType, setOrgType] = useState('college');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) { setError('Organization name is required.'); return; }

        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/setup-organization', {
                organizationName: orgName.trim(),
                organizationType: orgType,
            });
            // Persist updated token, then full-page navigate so AuthContext
            // re-initialises cleanly with the new role=admin + orgId.
            localStorage.setItem('token', data.token);
            window.location.href = '/org/dashboard';
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to create organization. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-lg">
                {/* Back */}
                <button
                    onClick={() => { window.location.href = '/auth/select-role'; }}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors mb-10"
                >
                    <ArrowLeft size={15} /> Back
                </button>

                <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100 p-10">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 flex-shrink-0">
                            <Building2 size={26} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Setting up</p>
                            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Create Organization</h1>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-6">
                        <p className="text-sm font-bold text-blue-700">
                            Your Google account will become the <strong>admin</strong> of this organization.
                            An invite code will be auto-generated so teachers and students can join.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Org name */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
                                Organization Name
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="My University / School / Institute"
                                value={orgName}
                                onChange={e => setOrgName(e.target.value)}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700 outline-none"
                            />
                            <p className="text-[10px] font-bold text-gray-400 mt-1.5 ml-1">
                                This name will be visible to all members. Choose carefully.
                            </p>
                        </div>

                        {/* Org type */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">
                                Organization Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {ORG_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setOrgType(t.value)}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                            orgType === t.value
                                                ? 'border-purple-400 bg-purple-50'
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <p className={`text-xs font-black uppercase tracking-widest ${orgType === t.value ? 'text-purple-700' : 'text-gray-700'}`}>
                                                {t.label}
                                            </p>
                                            {orgType === t.value && (
                                                <CheckCircle size={14} className="text-purple-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400">{t.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !orgName.trim()}
                            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Creating…
                                </span>
                            ) : 'Create Organization'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
