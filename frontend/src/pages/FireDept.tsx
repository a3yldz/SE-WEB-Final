import { useState } from 'react';
import { ShieldAlert, Truck, Activity, MapPin, Clock, Phone, CheckCircle, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

export function FireDept() {
    const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'history'>('overview');

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                            Emergency Operations Center
                        </h1>
                        <p className="text-gray-500 mt-1">Istanbul HQ • Live Monitoring</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700">
                            Export Report
                        </button>
                        <button className="px-4 py-2 bg-red-600 rounded-lg text-sm font-medium hover:bg-red-700 text-white shadow-sm shadow-red-200">
                            Broadcast Alert
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Active Incidents"
                        value="3"
                        unit="High Priority"
                        icon={Activity}
                        color="red"
                    />
                    <StatCard
                        title="Available Units"
                        value="14"
                        unit="/ 20 Total"
                        icon={Truck}
                        color="blue"
                    />
                    <StatCard
                        title="Avg Response"
                        value="4.2"
                        unit="Minutes"
                        icon={Clock}
                        color="orange"
                    />
                    <StatCard
                        title="Risk Analysis"
                        value="98.5%"
                        unit="Coverage"
                        icon={BarChart3}
                        color="green"
                    />
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                    <div className="border-b border-gray-200 px-6 pt-4">
                        <div className="flex gap-6">
                            <TabButton
                                label="Mission Overview"
                                active={activeTab === 'overview'}
                                onClick={() => setActiveTab('overview')}
                            />
                            <TabButton
                                label="Active Units"
                                active={activeTab === 'units'}
                                onClick={() => setActiveTab('units')}
                            />
                            <TabButton
                                label="Incident History"
                                active={activeTab === 'history'}
                                onClick={() => setActiveTab('history')}
                            />
                        </div>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && <OverviewTab />}
                        {activeTab === 'units' && <UnitsTab />}
                        {activeTab === 'history' && <HistoryTab />}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, unit, icon: Icon, color }: any) {
    const colors: any = {
        red: 'bg-red-50 text-red-600',
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-orange-50 text-orange-600',
        green: 'bg-green-50 text-green-600',
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{value}</span>
                    <span className="text-sm text-gray-400 font-medium">{unit}</span>
                </div>
            </div>
            <div className={cn("p-3 rounded-lg", colors[color])}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}

function TabButton({ label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "pb-3 text-sm font-medium border-b-2 transition-colors",
                active
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
        >
            {label}
        </button>
    )
}

function OverviewTab() {
    return (
        <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-gray-900 mb-2">Live Incidents</h3>
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-full text-red-500">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Structural Failure Reported</h4>
                                <p className="text-sm text-gray-600 flex items-center gap-2 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    Kadikoy, District 4 • 2 mins ago
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 text-xs font-bold uppercase bg-red-200 text-red-800 rounded-full">Critical</span>
                            <button className="text-sm font-medium text-red-700 hover:underline">Dispatch Unit</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function UnitsTab() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-gray-500" />
                            <span className="font-bold text-gray-900">Unit #{100 + i}</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                        <p>Status: <span className="text-gray-900 font-medium">{i % 2 === 0 ? 'Available' : 'On Mission'}</span></p>
                        <p>Location: <span className="text-gray-900 font-medium">{i % 2 === 0 ? 'Station Central' : 'Sector 7'}</span></p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function HistoryTab() {
    return (
        <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold">
                <tr>
                    <th className="px-6 py-3">Incident ID</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Time</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4].map((i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-medium text-gray-900">#INC-2024-{100 + i}</td>
                        <td className="px-6 py-4">Building Collapse</td>
                        <td className="px-6 py-4">Fatih, Istanbul</td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolved
                            </span>
                        </td>
                        <td className="px-6 py-4">12 Oct 2024, 14:30</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
