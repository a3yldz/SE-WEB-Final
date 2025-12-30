import { useState, useEffect } from 'react';

export interface RiskPoint {
    id: string;
    lat: number;
    lng: number;
    riskLevel: 'High' | 'Medium' | 'Low';
    district: string;
}

const MOCK_DATA: RiskPoint[] = [
    { id: '1', lat: 41.0082, lng: 28.9784, riskLevel: 'High', district: 'Fatih' }, // Istanbul
    { id: '2', lat: 40.9833, lng: 29.1167, riskLevel: 'High', district: 'Kadikoy' },
    { id: '3', lat: 41.1167, lng: 29.0833, riskLevel: 'Medium', district: 'Sariyer' },
    { id: '4', lat: 38.4192, lng: 27.1287, riskLevel: 'High', district: 'Konak' }, // Izmir
    { id: '5', lat: 38.4667, lng: 27.1500, riskLevel: 'Medium', district: 'Karsiyaka' },
];

export function useRiskData() {
    const [data, setData] = useState<RiskPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate API fetch
        const timer = setTimeout(() => {
            setData(MOCK_DATA);
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    return { data, loading };
}
