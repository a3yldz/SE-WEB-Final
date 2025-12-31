import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet';
import { Search, AlertTriangle, X, Wind, Thermometer, Droplets, BrainCircuit, Loader2 } from 'lucide-react';
import api from '../services/api';

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

interface RiskPoint {
    id: string;
    lat: number;
    lng: number;
    riskLevel: 'High' | 'Medium' | 'Low';
    district: string;
    temp?: number;
    humidity?: number;
    wind?: number;
    vegetation?: number;
    score?: number;
}

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        console.log(`🗺️ Moving Map -> Center: ${center}, Zoom: ${zoom}`);
        map.flyTo(center, zoom, { duration: 1.5 });
    }, [center, zoom, map]);
    return null;
}

import { usePageTitle } from '../hooks/usePageTitle';

export function RiskMap() {
    usePageTitle('Risk Analysis Map');
    const [data, setData] = useState<RiskPoint[]>([]);
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [selectedRisk, setSelectedRisk] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
    const [analyzingDistrict, setAnalyzingDistrict] = useState<RiskPoint | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [mapCenter, setMapCenter] = useState<[number, number]>([39.0, 35.0]);
    const [mapZoom, setMapZoom] = useState(6);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);

    useEffect(() => {
        fetch('/turkey_provinces.json')
            .then(res => res.json())
            .then(data => setGeoJsonData(data))
            .catch(err => console.error("Failed to load GeoJSON:", err));
    }, []);

    const fetchRiskData = async (city: string) => {
        console.log(`🚀 Fetching Risk Data for City: "${city}"`);
        setIsLoading(true);
        try {
            const response = await api.get(`/api/risk-analysis?city=${city}`);
            const responseData = response.data;
            console.log("Raw API Response:", responseData);
            if (responseData && responseData.points) {
                console.log("✅ Parsed Points (New Format):", responseData.points.length);
                setData(responseData.points);
            } else if (Array.isArray(responseData)) {
                console.log("✅ Parsed Points (Old Format):", responseData.length);
                setData(responseData);
            } else {
                console.warn("⚠️ Unexpected Data Format:", responseData);
                setData([]);
            }
        } catch (error) {
            console.error('Failed to fetch risk data:', error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCityClick = (feature: any) => {
        const rawCityName = feature.properties.name;

        const cityMapping: Record<string, string> = {
            'İstanbul': 'istanbul',
            'Istanbul': 'istanbul',
            'Ankara': 'ankara',
            'Izmir': 'izmir',
            'İzmir': 'izmir'
        };

        const backendKey = cityMapping[rawCityName];

        if (backendKey) {
            console.log(`🗺️ City Clicked: ${rawCityName} -> Backend Key: ${backendKey}`);
            setSelectedCity(rawCityName);

            let newCenter: [number, number] = [39.0, 35.0];
            let newZoom = 10;

            if (backendKey === 'istanbul') newCenter = [41.0082, 28.9784];
            if (backendKey === 'ankara') newCenter = [39.9334, 32.8597];
            if (backendKey === 'izmir') newCenter = [38.4237, 27.1428];

            setMapCenter(newCenter);
            setMapZoom(newZoom);

            fetchRiskData(backendKey);
        }
    };

    const geoJsonStyle = () => ({
        color: '#475569',
        weight: 0.5,
        fillColor: 'transparent',
        fillOpacity: 0
    });

    const onEachFeature = (feature: any, layer: any) => {
        const rawCityName = feature.properties.name;
        const activeCities = ['İstanbul', 'Istanbul', 'Ankara', 'Izmir', 'İzmir'];

        if (activeCities.includes(rawCityName)) {
            layer.on({
                click: () => handleCityClick(feature),
                mouseover: (e: any) => {
                    const layer = e.target;
                    layer.setStyle({ fillOpacity: 0.4, weight: 3 });
                },
                mouseout: (e: any) => {
                    const layer = e.target;
                    layer.setStyle({
                        fillOpacity: selectedCity === rawCityName ? 0.3 : 0.1,
                        weight: selectedCity === rawCityName ? 3 : 2
                    });
                }
            });
        }
    };

    const filteredData = selectedRisk === 'All'
        ? data
        : data.filter(p => p.riskLevel === selectedRisk);



    return (
        <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <MapController center={mapCenter} zoom={mapZoom} />

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {geoJsonData && (
                    <GeoJSON
                        data={geoJsonData}
                        style={geoJsonStyle}
                        onEachFeature={onEachFeature}
                    />
                )}

                {filteredData.map((point, index) => {
                    if (index < 3) console.log(`📍 Rendering Point [${index}]:`, point);
                    const score = point.score || 0;
                    const color = score > 70 ? '#ef4444' : score > 40 ? '#f97316' : '#22c55e';
                    const radius = score > 70 ? 40 : score > 40 ? 35 : 30;

                    return (
                        <CircleMarker
                            key={`risk-point-${point.id}`}
                            center={[point.lat, point.lng]}
                            radius={radius}
                            pathOptions={{
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.7,
                                weight: 3,
                                className: score > 75 ? 'pulse-red' : ''
                            }}
                        >
                            <Popup className="glass-popup">
                                <div className="p-3 min-w-[220px]">
                                    <h3 className="font-bold text-lg text-gray-900">{point.district}</h3>

                                    {/* Risk Probability Display */}
                                    <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                                        <div className="text-xs text-gray-600 uppercase tracking-wide">Risk Probability</div>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-bold" style={{ color }}>{score}%</span>
                                            <span className="text-sm font-medium" style={{ color }}>{point.riskLevel}</span>
                                        </div>
                                    </div>

                                    {/* Environmental Data */}
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-gray-100 rounded p-2">
                                            <div className="text-gray-500">Temp</div>
                                            <div className="font-bold text-gray-800">{point.temp || '--'}°C</div>
                                        </div>
                                        <div className="bg-gray-100 rounded p-2">
                                            <div className="text-gray-500">Wind</div>
                                            <div className="font-bold text-gray-800">{point.wind || '--'} km/h</div>
                                        </div>
                                        <div className="bg-gray-100 rounded p-2">
                                            <div className="text-gray-500">Humidity</div>
                                            <div className="font-bold text-gray-800">{point.humidity || '--'}%</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setAnalyzingDistrict(point)}
                                        className="mt-3 w-full bg-blue-600 text-white text-sm py-2 px-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                    >
                                        Full Analysis
                                    </button>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {/* Analysis Modal Overlay */}
            {analyzingDistrict && (
                <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <AnalysisModal
                        district={analyzingDistrict}
                        onClose={() => setAnalyzingDistrict(null)}
                    />
                </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-[1500] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                        <p className="text-white font-medium">Loading Risk Data...</p>
                    </div>
                </div>
            )}

            {/* Sidebar & Legend (Unchanged mostly) */}
            <div className="absolute top-4 left-4 z-[1000] w-80 bg-white/10 backdrop-blur-md border border-white/20 text-white p-6 rounded-2xl shadow-2xl transition-all hover:bg-white/15">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/40">
                        <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Risk Radar</h2>
                        <p className="text-xs text-gray-300">
                            {selectedCity ? `${selectedCity} Area Monitor` : 'Select a Region'}
                        </p>
                    </div>
                </div>
                {/* ... (Existing filters code) ... */}
                <div className="space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-red-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search district..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500 text-white transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Filters</span>
                        <div className="flex flex-wrap gap-2">
                            {['All', 'High', 'Medium', 'Low'].map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedRisk(level as any)}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-300 ${selectedRisk === level
                                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/30 scale-105'
                                        : 'bg-transparent border-white/20 text-gray-300 hover:bg-white/10'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Legend */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white text-xs shadow-xl">
                <h4 className="font-semibold mb-3 text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-2">Risk Index</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse"></span>
                        <span className="font-medium">Critical Structural Failure</span>
                    </div>
                    {/* ... */}
                </div>
            </div>
        </div>
    );
}

function AnalysisModal({ district, onClose }: { district: RiskPoint; onClose: () => void }) {
    const isHighRisk = district.riskLevel === 'High';
    const structuralScore = district.score || (isHighRisk ? 42 : 88);
    const temp = district.temp || 24;
    const wind = district.wind || 18;
    const humidity = district.humidity || 45;

    return (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 text-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-white/5 border-b border-white/10 p-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BrainCircuit className="w-6 h-6 text-purple-400" />
                        AI Structural Analysis
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Target: <span className="text-white font-medium">{district.district}</span></p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                </button>
            </div>
            {/* Body */}
            <div className="p-8 space-y-8">
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/30 rounded-xl p-5 border border-white/5 relative overflow-hidden group">
                        <h3 className="text-slate-400 text-sm font-medium mb-2">Structural Health Score</h3>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-bold ${isHighRisk ? 'text-red-500' : 'text-green-500'}`}>{structuralScore}</span>
                            <span className="text-slate-500 text-sm">/ 100</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                            <div className={`h-full rounded-full ${isHighRisk ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${structuralScore}%` }} />
                        </div>
                    </div>
                    {/* Environmental */}
                    <div className="bg-black/30 rounded-xl p-5 border border-white/5 relative overflow-hidden group space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Temperature</span>
                            <div className="flex items-center gap-2">
                                <Thermometer className="w-4 h-4 text-yellow-400" />
                                <span className="font-bold">{temp}°C</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Wind Speed</span>
                            <div className="flex items-center gap-2">
                                <Wind className="w-4 h-4 text-blue-400" />
                                <span className="font-bold">{wind} km/h</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Humidity</span>
                            <div className="flex items-center gap-2">
                                <Droplets className="w-4 h-4 text-cyan-400" />
                                <span className="font-bold">{humidity}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Recommendation Box */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/20">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {isHighRisk
                            ? "CRITICAL: Environmental factors indicate high fire risk. Immediate vegetation clearing recommended."
                            : "NORMAL: Conditions are stable. Routine monitoring advised."}
                    </p>
                </div>
            </div>
        </div>
    );
}
