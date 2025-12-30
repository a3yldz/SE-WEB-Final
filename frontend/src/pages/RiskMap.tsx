import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Layers, Search, AlertTriangle } from 'lucide-react';
import { useRiskData } from '../hooks/useRiskData';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export function RiskMap() {
    const { data } = useRiskData();
    const [selectedRisk, setSelectedRisk] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

    const filteredData = selectedRisk === 'All'
        ? data
        : data.filter(p => p.riskLevel === selectedRisk);

    const getColor = (level: string) => {
        switch (level) {
            case 'High': return '#ef4444'; // red-500
            case 'Medium': return '#f97316'; // orange-500
            case 'Low': return '#22c55e'; // green-500
            default: return '#3b82f6';
        }
    };

    return (
        <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
            {/* Map Container */}
            <MapContainer
                center={[41.0082, 28.9784]}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {filteredData.map((point) => (
                    <CircleMarker
                        key={point.id}
                        center={[point.lat, point.lng]}
                        radius={20}
                        pathOptions={{
                            color: getColor(point.riskLevel),
                            fillColor: getColor(point.riskLevel),
                            fillOpacity: 0.6,
                            weight: 2
                        }}
                    >
                        <Popup className="glass-popup">
                            <div className="p-2">
                                <h3 className="font-bold text-lg">{point.district}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-semibold">Risk Level:</span>
                                    <span style={{ color: getColor(point.riskLevel) }} className="font-bold">
                                        {point.riskLevel}
                                    </span>
                                </div>
                                <button className="mt-3 w-full bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700">
                                    View Analysis
                                </button>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            {/* Floating Sidebar (Glassmorphism) */}
            <div className="absolute top-4 left-4 z-[1000] w-80 bg-white/10 backdrop-blur-md border border-white/20 text-white p-6 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Risk Radar</h2>
                        <p className="text-xs text-gray-300">Live Structural Monitoring</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search district..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Filters</span>
                        <div className="flex flex-wrap gap-2">
                            {['All', 'High', 'Medium', 'Low'].map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedRisk(level as any)}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedRisk === level
                                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/30'
                                        : 'bg-transparent border-white/20 text-gray-300 hover:bg-white/5'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                            <span>Total Alerts</span>
                            <span className="font-bold text-white">1,245</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-300">
                            <span>High Risk Areas</span>
                            <span className="font-bold text-red-400">12</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-black/80 backdrop-blur-sm p-4 rounded-lg border border-white/10 text-white text-xs">
                <h4 className="font-semibold mb-2 text-gray-400 uppercase tracking-widest">Risk Index</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
                        <span>Critical Structural Failure</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                        <span>Moderate Damage Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span>Safe / Retrofitted</span>
                    </div>
                </div>
            </div>

            {/* Info Overlay */}
            <div className="absolute top-4 right-4 z-[1000]">
                <button className="p-3 bg-white text-gray-900 rounded-full shadow-lg hover:bg-gray-100 transition-colors">
                    <Layers className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
