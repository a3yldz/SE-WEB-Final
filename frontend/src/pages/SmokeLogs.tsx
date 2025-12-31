import { useState, useEffect } from 'react';
import { Camera, AlertTriangle, MapPin, Clock, Filter, RefreshCw, Eye, X } from 'lucide-react';
import api from '../services/api';

interface SmokeDetection {
    id: string;
    image_url: string | null;
    latitude: number | null;
    longitude: number | null;
    district: string | null;
    risk_score: number | null;
    status: string;
    created_at: string | null;
}

interface Stats {
    total: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
}

export function SmokeLogs() {
    const [detections, setDetections] = useState<SmokeDetection[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [selectedDetection, setSelectedDetection] = useState<SmokeDetection | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = '/api/admin/smoke-detections';
            if (filter === 'high') url += '?min_risk=70';
            else if (filter === 'medium') url += '?min_risk=40';

            const [detectionsRes, statsRes] = await Promise.all([
                api.get(url),
                api.get('/api/admin/smoke-detections/stats')
            ]);

            let data = detectionsRes.data;

            if (filter === 'medium') {
                data = data.filter((d: SmokeDetection) => d.risk_score && d.risk_score >= 40 && d.risk_score < 70);
            } else if (filter === 'low') {
                data = data.filter((d: SmokeDetection) => d.risk_score && d.risk_score < 40);
            }

            setDetections(data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch smoke logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    const getRiskBadge = (score: number | null) => {
        if (!score) return { color: 'bg-gray-500', text: 'Unknown' };
        if (score > 70) return { color: 'bg-red-600', text: 'Critical' };
        if (score > 40) return { color: 'bg-yellow-500', text: 'Warning' };
        return { color: 'bg-green-600', text: 'Low' };
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Camera className="w-8 h-8 text-purple-400" />
                            Smoke Detection Logs
                        </h1>
                        <p className="text-slate-400 mt-2">Monitor AI-detected smoke events and their risk levels</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-slate-400 text-sm">Total Detections</p>
                            <p className="text-3xl font-bold text-white">{stats.total}</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                            <p className="text-red-400 text-sm">Critical Risk</p>
                            <p className="text-3xl font-bold text-red-400">{stats.high_risk}</p>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                            <p className="text-yellow-400 text-sm">Warning</p>
                            <p className="text-3xl font-bold text-yellow-400">{stats.medium_risk}</p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                            <p className="text-green-400 text-sm">Low Risk</p>
                            <p className="text-3xl font-bold text-green-400">{stats.low_risk}</p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <Filter className="w-5 h-5 text-slate-400" />
                    <div className="flex gap-2">
                        {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f === 'high' ? '🔴 Critical' : f === 'medium' ? '🟡 Warning' : '🟢 Low'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detection List */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                            Loading detections...
                        </div>
                    ) : detections.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            No smoke detections found
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-black/30 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Image</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Risk Score</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Detected At</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {detections.map((detection) => {
                                    const badge = getRiskBadge(detection.risk_score);
                                    return (
                                        <tr key={detection.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                                                    {detection.image_url ? (
                                                        <img
                                                            src={detection.image_url}
                                                            alt="Detection"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <Camera className="w-6 h-6 text-slate-500" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-white">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    <span>{detection.district || 'Unknown Location'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${badge.color}`}>
                                                        {badge.text}
                                                    </span>
                                                    <span className="text-white font-semibold">
                                                        {detection.risk_score?.toFixed(1) || '--'}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-300 capitalize">{detection.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                    <Clock className="w-4 h-4" />
                                                    {formatDate(detection.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setSelectedDetection(detection)}
                                                    className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Detail Modal */}
                {selectedDetection && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                                    Detection Details
                                </h2>
                                <button
                                    onClick={() => setSelectedDetection(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Image */}
                                <div className="bg-black rounded-xl overflow-hidden">
                                    {selectedDetection.image_url ? (
                                        <img
                                            src={selectedDetection.image_url}
                                            alt="Full Detection"
                                            className="w-full max-h-96 object-contain"
                                        />
                                    ) : (
                                        <div className="h-48 flex items-center justify-center text-slate-500">
                                            <Camera className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-slate-400 text-sm">Risk Score</p>
                                        <p className="text-2xl font-bold text-white">
                                            {selectedDetection.risk_score?.toFixed(1) || '--'}%
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-slate-400 text-sm">Location</p>
                                        <p className="text-lg font-semibold text-white">
                                            {selectedDetection.district || 'Unknown'}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-slate-400 text-sm">Status</p>
                                        <p className="text-lg font-semibold text-white capitalize">
                                            {selectedDetection.status}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-slate-400 text-sm">Detected At</p>
                                        <p className="text-sm font-medium text-white">
                                            {formatDate(selectedDetection.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Coordinates */}
                                {(selectedDetection.latitude || selectedDetection.longitude) && (
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-slate-400 text-sm mb-2">Coordinates</p>
                                        <p className="text-white font-mono text-sm">
                                            {selectedDetection.latitude}, {selectedDetection.longitude}
                                        </p>
                                    </div>
                                )}

                                {/* Detection ID */}
                                <div className="text-xs text-slate-500">
                                    Detection ID: {selectedDetection.id}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
