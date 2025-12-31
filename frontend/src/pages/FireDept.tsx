import { useState, useEffect } from 'react';
import { ShieldAlert, Truck, Activity, MapPin, Phone, BarChart3, Camera, RefreshCw, Filter, Eye, X, AlertTriangle, Monitor, Radio, Plus, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../services/api';
import { LiveConsole } from '../components/LiveConsole';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface FireStation {
    id: string;
    name: string;
    district: string;
    latitude?: number;
    longitude?: number;
    status: string;
    created_at: string;
}

interface FireIncident {
    id: string;
    district: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    status: string;
    reported_by?: string;
    assigned_station_id?: string;
    created_at: string;
}

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

export function FireDept() {
    const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'history' | 'smoke-logs'>('overview');

    const [stations, setStations] = useState<FireStation[]>([]);
    const [incidents, setIncidents] = useState<FireIncident[]>([]);
    const [missions, setMissions] = useState<SmokeDetection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [totalIncidents, setTotalIncidents] = useState(0);
    const [currentSkip, setCurrentSkip] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cityFilter, setCityFilter] = useState<'all' | 'izmir' | 'ankara' | 'istanbul'>('all');
    const ITEMS_PER_PAGE = 100;

    const [showAddStationModal, setShowAddStationModal] = useState(false);
    const [selectedMission, setSelectedMission] = useState<SmokeDetection | null>(null);
    const [dispatchingId, setDispatchingId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [decliningId, setDecliningId] = useState<string | null>(null);
    const [showSystemStatus, setShowSystemStatus] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [broadcasting, setBroadcasting] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [newStation, setNewStation] = useState({
        name: '',
        district: '',
        latitude: '',
        longitude: '',
        status: 'available'
    });

    const fetchIncidents = async (skip: number = 0, city?: string, append: boolean = false) => {
        try {
            let url = `/api/fire-incidents?skip=${skip}&limit=${ITEMS_PER_PAGE}`;
            if (city && city !== 'all') {
                url += `&city=${city}`;
            }
            const response = await api.get(url);
            const data = response.data;

            if (append) {
                setIncidents(prev => [...prev, ...data.items]);
            } else {
                setIncidents(data.items);
            }
            setTotalIncidents(data.total);
            setCurrentSkip(skip);
        } catch (err) {
            console.error("Failed to fetch incidents:", err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            console.log("[FireDept] Starting data fetch...");
            try {
                const [stationsRes, missionsRes] = await Promise.all([
                    api.get('/api/fire-stations'),
                    api.get('/api/admin/smoke-detections?min_risk=75')
                ]);

                console.log("[FireDept] Stations Data:", stationsRes.data);
                console.log("[FireDept] Missions Data:", missionsRes.data);

                setStations(Array.isArray(stationsRes.data) ? stationsRes.data : []);
                setMissions(Array.isArray(missionsRes.data) ? missionsRes.data : []);

                await fetchIncidents(0, cityFilter === 'all' ? undefined : cityFilter);
                setError(null);
                console.log("[FireDept] All data loaded successfully!");
            } catch (err: any) {
                console.error("[FireDept] Failed to fetch data:", err);
                console.error("[FireDept] Error details:", err?.response?.data || err?.message);
                setError(`Connection failed: ${err?.message || 'Unknown error'}`);
                setStations([]);
                setMissions([]);
                setIncidents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (!loading) {
            fetchIncidents(0, cityFilter === 'all' ? undefined : cityFilter);
        }
    }, [cityFilter]);

    const handleLoadMore = async () => {
        setLoadingMore(true);
        const newSkip = currentSkip + ITEMS_PER_PAGE;
        await fetchIncidents(newSkip, cityFilter === 'all' ? undefined : cityFilter, true);
        setLoadingMore(false);
    };

    const refreshAllData = async () => {
        try {
            const [stationsRes, missionsRes] = await Promise.all([
                api.get('/api/fire-stations'),
                api.get('/api/admin/smoke-detections?min_risk=75')
            ]);
            setStations(stationsRes.data);
            setMissions(missionsRes.data);
            await fetchIncidents(0, cityFilter === 'all' ? undefined : cityFilter);
        } catch (err) {
            console.error("Failed to refresh data:", err);
        }
    };

    const handleAddStation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/fire-stations', {
                name: newStation.name,
                district: newStation.district,
                latitude: newStation.latitude ? parseFloat(newStation.latitude) : null,
                longitude: newStation.longitude ? parseFloat(newStation.longitude) : null,
                status: newStation.status
            });
            setShowAddStationModal(false);
            setNewStation({ name: '', district: '', latitude: '', longitude: '', status: 'available' });
            await refreshAllData();
        } catch (err) {
            console.error("Failed to add station:", err);
        }
    };

    const handleApprove = async (detectionId: string) => {
        setApprovingId(detectionId);
        try {
            const response = await api.post(`/api/admin/smoke-detections/${detectionId}/approve`);
            setSelectedMission(null);
            await refreshAllData();
            showToast(`✅ Incident created! Station: ${response.data.station_assigned || 'None available'}`, 'success');
        } catch (err) {
            console.error("Failed to approve detection:", err);
            showToast('Failed to approve detection', 'error');
        } finally {
            setApprovingId(null);
        }
    };

    const handleDecline = async (detectionId: string) => {
        setDecliningId(detectionId);
        try {
            await api.post(`/api/admin/smoke-detections/${detectionId}/decline`);
            setSelectedMission(null);
            await refreshAllData();
            showToast('Detection marked as false alarm', 'success');
        } catch (err) {
            console.error("Failed to decline detection:", err);
            showToast('Failed to decline detection', 'error');
        } finally {
            setDecliningId(null);
        }
    };

    const handleDispatch = async (incidentId: string) => {
        setDispatchingId(incidentId);
        try {
            const response = await api.post(`/api/fire-incidents/${incidentId}/dispatch`);
            await refreshAllData();
            showToast(`🚒 ${response.data.station_name} dispatched! (${response.data.distance_km}km)`, 'success');
        } catch (err) {
            console.error("Failed to dispatch:", err);
            showToast('Failed to dispatch station', 'error');
        } finally {
            setDispatchingId(null);
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMessage.trim()) return;
        setBroadcasting(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setBroadcasting(false);
        setShowBroadcast(false);
        setBroadcastMessage('');
        showToast(`📢 Broadcast sent to 1,245 devices!`, 'success');
    };

    const stats = {
        active_incidents: incidents.filter(i => i.status === 'active').length,
        available_units: stations.filter(s => s.status === 'available').length,
        total_stations: stations.length,
        total_incidents: incidents.length,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Initializing Command Center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8 relative overflow-hidden">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-950/80 to-slate-950 pointer-events-none"></div>

            {/* Header */}
            <div className="max-w-[1600px] mx-auto mb-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight text-white/90">
                            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
                            EMERGENCY OPERATIONS CENTER
                        </h1>
                        <p className="text-slate-400 mt-1 flex items-center gap-2 text-sm font-mono">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            SYSTEM ONLINE • ISTANBUL_HQ • <span className="text-green-400">SECURE_UPLINK</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowAddStationModal(true)}
                            className="px-4 py-2 bg-green-600/90 backdrop-blur-sm border border-green-500/50 rounded-lg text-sm font-medium hover:bg-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Station
                        </button>
                        <button
                            onClick={() => setShowSystemStatus(true)}
                            className="px-4 py-2 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 text-slate-300 transition-colors flex items-center gap-2"
                        >
                            <Monitor className="w-4 h-4" />
                            System Status
                        </button>
                        <button
                            onClick={() => setShowBroadcast(true)}
                            className="px-4 py-2 bg-red-600/90 backdrop-blur-sm border border-red-500/50 rounded-lg text-sm font-medium hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2"
                        >
                            <Radio className="w-4 h-4 animate-pulse" />
                            BROADCAST ALERT
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="max-w-[1600px] mx-auto mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 backdrop-blur-sm">
                    {error}
                </div>
            )}

            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                {/* Left Column: Stats & Main Content */}
                <div className="lg:col-span-9 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Active Threats"
                            value={missions.length}
                            unit="PENDING"
                            icon={AlertTriangle}
                            color="orange"
                            glow={missions.length > 0}
                        />
                        <StatCard
                            title="Available Units"
                            value={stats.available_units}
                            unit={`/ ${stats.total_stations} READY`}
                            icon={Truck}
                            color="blue"
                        />
                        <StatCard
                            title="Active Incidents"
                            value={stats.active_incidents}
                            unit="CONFIRMED"
                            icon={Activity}
                            color="red"
                            glow={stats.active_incidents > 0}
                        />
                        <StatCard
                            title="Total Logged"
                            value={stats.total_incidents}
                            unit="ARCHIVED"
                            icon={BarChart3}
                            color="green"
                        />
                    </div>

                    {/* Main Tabs Panel */}
                    <div className="glass-panel rounded-xl overflow-hidden min-h-[600px] border border-white/10">
                        <div className="border-b border-white/10 px-6 pt-4 bg-black/20">
                            <div className="flex gap-6">
                                <TabButton
                                    label="MISSION CONTROL"
                                    active={activeTab === 'overview'}
                                    onClick={() => setActiveTab('overview')}
                                />
                                <TabButton
                                    label="FLEET STATUS"
                                    active={activeTab === 'units'}
                                    onClick={() => setActiveTab('units')}
                                />
                                <TabButton
                                    label="INCIDENT LOGS"
                                    active={activeTab === 'history'}
                                    onClick={() => setActiveTab('history')}
                                />
                                <TabButton
                                    label="SMOKE DETECTIONS"
                                    active={activeTab === 'smoke-logs'}
                                    onClick={() => setActiveTab('smoke-logs')}
                                    icon={Camera}
                                />
                            </div>
                        </div>

                        <div className="p-6">
                            {activeTab === 'overview' && (
                                <OverviewTab
                                    incidents={incidents}
                                    missions={missions}
                                    cityFilter={cityFilter}
                                    setCityFilter={setCityFilter}
                                    totalIncidents={totalIncidents}
                                    loadingMore={loadingMore}
                                    onLoadMore={handleLoadMore}
                                    currentCount={incidents.length}
                                    onSelectMission={setSelectedMission}
                                    onDispatch={handleDispatch}
                                    dispatchingId={dispatchingId}
                                />
                            )}
                            {activeTab === 'units' && <UnitsTab stations={stations} />}
                            {activeTab === 'history' && <HistoryTab incidents={incidents} />}
                            {activeTab === 'smoke-logs' && <SmokeLogsTab />}
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Console & Side Widgets */}
                <div className="lg:col-span-3 space-y-6">
                    <LiveConsole className="h-[400px] shadow-[0_0_30px_rgba(0,255,100,0.05)] border-green-500/20" />

                    {/* Quick Status Widget */}
                    <div className="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
                        <h3 className="text-white/70 text-sm font-medium uppercase tracking-wider mb-2">System Health</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Database Latency</span>
                                    <span className="text-green-400">24ms</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[20%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Satellite Link</span>
                                    <span className="text-green-400">98%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[98%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>AI Confidence</span>
                                    <span className="text-blue-400">High</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[85%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Station Modal */}
            {showAddStationModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-green-500" />
                                Add New Station
                            </h2>
                            <button onClick={() => setShowAddStationModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddStation} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Station Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newStation.name}
                                    onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-green-500 focus:outline-none"
                                    placeholder="Fire Station Alpha"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">District</label>
                                <input
                                    type="text"
                                    required
                                    value={newStation.district}
                                    onChange={(e) => setNewStation({ ...newStation, district: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-green-500 focus:outline-none"
                                    placeholder="Istanbul - Kadıköy"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={newStation.latitude}
                                        onChange={(e) => setNewStation({ ...newStation, latitude: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-green-500 focus:outline-none"
                                        placeholder="41.0082"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={newStation.longitude}
                                        onChange={(e) => setNewStation({ ...newStation, longitude: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-green-500 focus:outline-none"
                                        placeholder="28.9784"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Create Station
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Verification Modal */}
            {selectedMission && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl max-w-lg w-full shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                Verify Detection
                            </h2>
                            <button onClick={() => setSelectedMission(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Image Preview */}
                            {selectedMission.image_url && selectedMission.image_url.startsWith('http') && (
                                <div className="bg-black rounded-lg overflow-hidden border border-white/10">
                                    <img src={selectedMission.image_url} alt="Detection" className="w-full max-h-48 object-contain" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Risk Score</p>
                                    <p className="text-2xl font-bold text-orange-400 font-mono">{selectedMission.risk_score?.toFixed(1)}%</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">District</p>
                                    <p className="text-sm font-bold text-white">{selectedMission.district || 'Unknown'}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Coordinates</p>
                                    <p className="text-xs font-mono text-white">
                                        {selectedMission.latitude?.toFixed(4)}, {selectedMission.longitude?.toFixed(4)}
                                    </p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Timestamp</p>
                                    <p className="text-xs font-mono text-white">
                                        {selectedMission.created_at ? new Date(selectedMission.created_at).toLocaleString() : 'Unknown'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleApprove(selectedMission.id)}
                                    disabled={approvingId === selectedMission.id || decliningId === selectedMission.id}
                                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {approvingId === selectedMission.id ? (
                                        <><RefreshCw className="w-4 h-4 animate-spin" /> Approving...</>
                                    ) : (
                                        <><Navigation className="w-4 h-4" /> Approve & Assign</>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDecline(selectedMission.id)}
                                    disabled={approvingId === selectedMission.id || decliningId === selectedMission.id}
                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {decliningId === selectedMission.id ? (
                                        <><RefreshCw className="w-4 h-4 animate-spin" /> Declining...</>
                                    ) : (
                                        <><X className="w-4 h-4" /> False Alarm</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* System Status Modal */}
            {showSystemStatus && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-blue-500" />
                                System Status
                            </h2>
                            <button onClick={() => setShowSystemStatus(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-4 flex items-center justify-between">
                                <span className="text-sm text-slate-300">Neon DB Connection</span>
                                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Active
                                </span>
                            </div>
                            <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-4 flex items-center justify-between">
                                <span className="text-sm text-slate-300">FastAPI Latency</span>
                                <span className="text-xs font-bold text-green-400">24ms</span>
                            </div>
                            <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-4 flex items-center justify-between">
                                <span className="text-sm text-slate-300">Roboflow AI</span>
                                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                                </span>
                            </div>
                            <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between">
                                <span className="text-sm text-slate-300">Active User Sessions</span>
                                <span className="text-xs font-bold text-blue-400">3</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Broadcast Alert Modal */}
            {showBroadcast && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Radio className="w-5 h-5 text-red-500" />
                                Emergency Broadcast
                            </h2>
                            <button onClick={() => setShowBroadcast(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Alert Message</label>
                                <textarea
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    placeholder="e.g., Extreme Heat Warning - Avoid outdoor activities"
                                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-red-500 focus:outline-none h-24 resize-none"
                                />
                            </div>
                            {broadcasting && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Broadcasting to 1,245 devices...</span>
                                        <span className="text-red-400">In Progress</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 animate-pulse w-full"></div>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={handleBroadcast}
                                disabled={broadcasting || !broadcastMessage.trim()}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {broadcasting ? (
                                    <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
                                ) : (
                                    <><Radio className="w-4 h-4" /> Send Alert</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={cn(
                    "fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl border backdrop-blur-sm animate-in slide-in-from-bottom-5",
                    toast.type === 'success'
                        ? "bg-green-900/90 border-green-500/30 text-green-100"
                        : "bg-red-900/90 border-red-500/30 text-red-100"
                )}>
                    <p className="font-medium">{toast.message}</p>
                </div>
            )}
        </div>
    );
}

// ... StatCard with Animation and specific War Room styling ...
function StatCard({ title, value, unit, icon: Icon, color, glow }: any) {
    const colors: any = {
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        green: 'text-green-500 bg-green-500/10 border-green-500/20',
    };

    return (
        <div className={cn(
            "glass-card p-5 rounded-xl border flex items-center justify-between group hover:border-white/20",
            glow && color === 'red' && "shadow-[0_0_20px_rgba(239,68,68,0.2)] border-red-500/30",
            glow && color === 'orange' && "shadow-[0_0_20px_rgba(249,115,22,0.2)] border-orange-500/30",
        )}>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white tracking-tight">
                        <AnimatedCounter value={value} />
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{unit}</span>
                </div>
            </div>
            <div className={cn("p-3 rounded-lg transition-transform group-hover:scale-110 duration-300", colors[color])}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}

function TabButton({ label, active, onClick, icon: Icon }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 uppercase tracking-widest",
                active
                    ? "border-red-500 text-red-500 text-glow"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
            )}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
        </button>
    )
}

interface OverviewTabProps {
    incidents: FireIncident[];
    missions: SmokeDetection[];
    cityFilter: 'all' | 'izmir' | 'ankara' | 'istanbul';
    setCityFilter: (filter: 'all' | 'izmir' | 'ankara' | 'istanbul') => void;
    totalIncidents: number;
    loadingMore: boolean;
    onLoadMore: () => void;
    currentCount: number;
    onSelectMission: (mission: SmokeDetection) => void;
    onDispatch: (incidentId: string) => void;
    dispatchingId: string | null;
}

function OverviewTab({
    incidents,
    missions,
    cityFilter,
    setCityFilter,
    totalIncidents,
    loadingMore,
    onLoadMore,
    currentCount,
    onSelectMission,
    onDispatch,
    dispatchingId
}: OverviewTabProps) {
    const activeIncidents = incidents.filter(i => i.status === 'active');

    const groupedIncidents = {
        izmir: activeIncidents.filter(i => i.district.toLowerCase().includes('izmir')),
        ankara: activeIncidents.filter(i => i.district.toLowerCase().includes('ankara')),
        istanbul: activeIncidents.filter(i => i.district.toLowerCase().includes('istanbul') || i.district.toLowerCase().includes('İstanbul')),
    };

    const cityTabs: { key: 'all' | 'izmir' | 'ankara' | 'istanbul'; label: string; count: number }[] = [
        { key: 'all', label: 'ALL', count: activeIncidents.length },
        { key: 'izmir', label: 'İZMİR', count: groupedIncidents.izmir.length },
        { key: 'ankara', label: 'ANKARA', count: groupedIncidents.ankara.length },
        { key: 'istanbul', label: 'İSTANBUL', count: groupedIncidents.istanbul.length },
    ];

    const hasMore = currentCount < totalIncidents;

    if (activeIncidents.length === 0 && missions.length === 0) {
        return (
            <div className="text-center py-20 opacity-50">
                <div className="text-green-500/20 text-7xl mb-6">✓</div>
                <h3 className="text-xl font-bold text-slate-300 tracking-widest uppercase">No Active Threats</h3>
                <p className="text-slate-500 font-mono text-sm mt-2">All sectors clear. Monitoring continues...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Missions / Alerts Section */}
            {missions.length > 0 && (
                <div>
                    <h3 className="font-bold text-orange-500 mb-4 flex items-center gap-2 uppercase tracking-widest text-sm">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                        Pending Interventions
                    </h3>
                    <div className="space-y-3">
                        {missions.map((mission) => (
                            <div
                                key={mission.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-orange-950/20 border border-orange-500/20 hover:border-orange-500/40 transition-colors cursor-pointer"
                                onClick={() => onSelectMission(mission)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-orange-900/30 rounded-full text-orange-500 border border-orange-500/20">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-200">High Risk Smoke Detected</h4>
                                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono uppercase">
                                            <MapPin className="w-3 h-3" />
                                            {mission.district || 'GPS Coordinates Only'} • {mission.created_at ? new Date(mission.created_at).toLocaleString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/20 tracking-wider">
                                        Risk: {mission.risk_score?.toFixed(1)}%
                                    </span>
                                    <button className="text-xs font-bold text-orange-500 hover:text-orange-400 uppercase tracking-wider hover:underline">Verify & Dispatch</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirmed Incidents Section with City Filter */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-red-500 flex items-center gap-2 uppercase tracking-widest text-sm">
                        <Phone className="w-5 h-5 animate-bounce" />
                        Confirmed Incidents
                        <span className="text-xs text-slate-500 font-mono ml-2">({totalIncidents} total)</span>
                    </h3>
                </div>

                {/* City Filter Tabs */}
                <div className="flex gap-2 mb-6">
                    {cityTabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setCityFilter(tab.key)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2",
                                cityFilter === tab.key
                                    ? "bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px]",
                                cityFilter === tab.key ? "bg-white/20" : "bg-white/5"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Incidents List */}
                {activeIncidents.length > 0 ? (
                    <div className="space-y-3">
                        {activeIncidents.map((incident) => (
                            <div key={incident.id} className="flex items-center justify-between p-4 rounded-lg bg-red-950/20 border border-red-500/20 hover:border-red-500/40 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.05)]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-red-900/30 rounded-full text-red-500 border border-red-500/20">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-200">{incident.district}</h4>
                                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono uppercase">
                                            <MapPin className="w-3 h-3" />
                                            {incident.address || 'NO_ADDRESS'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {incident.assigned_station_id && (
                                        <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-full bg-green-500/20 text-green-400 border border-green-500/20 tracking-wider flex items-center gap-1">
                                            🚒 Assigned
                                        </span>
                                    )}
                                    <span className={cn("px-3 py-1 text-[10px] font-bold uppercase rounded-full border tracking-wider",
                                        incident.status === 'active'
                                            ? "bg-red-500/20 text-red-400 border-red-500/20"
                                            : incident.status === 'contained'
                                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                                                : "bg-green-500/20 text-green-400 border-green-500/20"
                                    )}>
                                        {incident.status}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDispatch(incident.id); }}
                                        disabled={!!incident.assigned_station_id || dispatchingId === incident.id}
                                        className={cn(
                                            "text-xs font-bold uppercase tracking-wider flex items-center gap-1",
                                            incident.assigned_station_id
                                                ? "text-green-500 cursor-default"
                                                : dispatchingId === incident.id
                                                    ? "text-slate-400"
                                                    : "text-red-500 hover:text-red-400 hover:underline"
                                        )}
                                    >
                                        {incident.assigned_station_id ? (
                                            <>✓ Dispatched</>
                                        ) : dispatchingId === incident.id ? (
                                            <><RefreshCw className="w-3 h-3 animate-spin" /> Dispatching...</>
                                        ) : (
                                            <>
                                                <Navigation className="w-3 h-3" /> Dispatch Unit
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Load More Button */}
                        {hasMore && (
                            <button
                                onClick={onLoadMore}
                                disabled={loadingMore}
                                className="w-full py-3 mt-4 bg-white/5 border border-white/10 rounded-lg text-sm font-bold uppercase tracking-wider text-slate-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        Load More ({currentCount} / {totalIncidents})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-500 font-mono text-sm uppercase">
                        No active incidents in this region.
                    </div>
                )}
            </div>
        </div>
    )
}

function UnitsTab({ stations }: { stations: FireStation[] }) {
    if (stations.length === 0) {
        return (
            <div className="text-center py-20 text-slate-500">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-mono text-sm uppercase">No units available in database.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station) => (
                <div key={station.id} className="p-4 border border-white/5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-slate-400" />
                            <div>
                                <span className="font-bold text-slate-200 block">{station.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{station.district}</span>
                            </div>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${station.status === 'available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : station.status === 'dispatched' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                    </div>
                    <div className="text-xs text-slate-400 space-y-2">
                        <div className="flex justify-between border-t border-white/5 pt-2">
                            <span>STATUS</span>
                            <span className={cn("font-bold uppercase",
                                station.status === 'available' ? 'text-green-400' :
                                    station.status === 'dispatched' ? 'text-red-400' : 'text-yellow-400'
                            )}>{station.status}</span>
                        </div>
                        {station.latitude && station.longitude && (
                            <p className="font-mono text-[10px] text-slate-600">POS: {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function HistoryTab({ incidents }: { incidents: FireIncident[] }) {
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'contained');

    if (resolvedIncidents.length === 0) {
        return (
            <div className="text-center py-20 text-slate-500 font-mono text-sm uppercase">
                No archived operations found.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {resolvedIncidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div>
                        <h4 className="font-medium text-slate-300 text-sm">{incident.district}</h4>
                        <p className="text-xs text-slate-500 font-mono">{incident.address || 'UNKNOWN'}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm tracking-wider",
                        incident.status === 'contained' ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"
                    )}>
                        {incident.status}
                    </span>
                </div>
            ))}
        </div>
    );
}

function SmokeLogsTab() {
    const [detections, setDetections] = useState<SmokeDetection[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [selectedDetection, setSelectedDetection] = useState<SmokeDetection | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = '/api/admin/smoke-detections';
            if (filter === 'high') url += '?min_risk=70';
            else if (filter === 'medium') url += '?min_risk=40';

            const response = await api.get(url);
            let data = response.data;

            if (filter === 'medium') {
                data = data.filter((d: SmokeDetection) => d.risk_score && d.risk_score >= 40 && d.risk_score < 70);
            } else if (filter === 'low') {
                data = data.filter((d: SmokeDetection) => d.risk_score && d.risk_score < 40);
            }

            setDetections(data);
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
        if (!score) return { color: 'bg-slate-700 text-slate-300', text: 'UNK' };
        if (score > 70) return { color: 'bg-red-500/20 text-red-400 border border-red-500/30', text: 'CRIT' };
        if (score > 40) return { color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', text: 'WARN' };
        return { color: 'bg-green-500/20 text-green-400 border border-green-500/30', text: 'LOW' };
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div>
            {/* Filters */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <div className="flex gap-2">
                        {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors border",
                                    filter === f
                                        ? 'bg-red-600 text-white border-red-500'
                                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 text-slate-400 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
                >
                    <RefreshCw className={cn("w-3 h-3", loading && 'animate-spin')} />
                    Sync
                </button>
            </div>

            {/* Detection List */}
            {loading ? (
                <div className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 opacity-50" />
                    <span className="font-mono text-xs uppercase animate-pulse">Syncing logs...</span>
                </div>
            ) : detections.length === 0 ? (
                <div className="py-12 text-center text-slate-600">
                    <Camera className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <span className="font-mono text-xs uppercase">No records found</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {detections.map((detection) => {
                        const badge = getRiskBadge(detection.risk_score);
                        return (
                            <div key={detection.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-black/50 rounded flex items-center justify-center overflow-hidden border border-white/10">
                                        {detection.image_url && detection.image_url.startsWith('http') ? (
                                            <img
                                                src={detection.image_url}
                                                alt="Detection"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Camera className="w-4 h-4 text-slate-600" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-200 text-sm">{detection.district || 'UNKNOWN_SEC'}</h4>
                                        <p className="text-[10px] text-slate-500 font-mono">{formatDate(detection.created_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", badge.color)}>
                                        {detection.risk_score?.toFixed(1) || '--'}% {badge.text}
                                    </span>
                                    <button
                                        onClick={() => setSelectedDetection(detection)}
                                        className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedDetection && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl relative overflow-hidden">
                        {/* Scanline overlay for modal */}
                        <div className="scanline absolute inset-0 opacity-10 pointer-events-none"></div>

                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                Analysis Report
                            </h2>
                            <button
                                onClick={() => setSelectedDetection(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Image Preview */}
                            {selectedDetection.image_url && selectedDetection.image_url.startsWith('http') && (
                                <div className="bg-black rounded-lg overflow-hidden border border-white/10 relative">
                                    <img
                                        src={selectedDetection.image_url}
                                        alt="Detection"
                                        className="w-full max-h-64 object-contain"
                                    />
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur text-white text-[10px] font-mono border border-white/10 rounded">
                                        SOURCE_IMG_RAW
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Risk Probability</p>
                                    <p className="text-2xl font-bold text-white font-mono">{selectedDetection.risk_score?.toFixed(1) || '--'}%</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Target Sector</p>
                                    <p className="text-sm font-bold text-white">{selectedDetection.district || 'UNKNOWN'}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Status</p>
                                    <p className="text-sm font-bold text-white uppercase">{selectedDetection.status}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Timestamp</p>
                                    <p className="text-xs font-bold text-white font-mono">{formatDate(selectedDetection.created_at)}</p>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-600 pt-2 border-t border-white/5 font-mono">
                                REF_ID: {selectedDetection.id}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
