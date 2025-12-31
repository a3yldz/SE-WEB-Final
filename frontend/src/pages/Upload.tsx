import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, AlertCircle, CheckCircle2, Flame, Loader2, Image as ImageIcon, XCircle, MapPin } from 'lucide-react';
import api from '../services/api';

interface AnalysisResult {
    success: boolean;
    risk_score: number;
    confidence: number;
    detection_count: number;
    detections: any[];
    detection_id?: string;
    image_url?: string;
    report_created?: boolean;
    report_id?: number;
}

export function Upload() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Location inputs
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        maxFiles: 1,
        multiple: false
    });

    const handleAnalyze = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Build URL with query params for location data
            let url = '/api/smoke/detect';
            const params = new URLSearchParams();
            if (city) params.append('city', city);
            if (district) params.append('district', district);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResult(response.data);
        } catch (err: any) {
            console.error('Analysis failed:', err);
            setError(err.response?.data?.detail || 'Failed to analyze image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getRiskStatus = (score: number) => {
        if (score > 70) return { label: 'CRITICAL: Smoke Detected', color: 'bg-red-600', textColor: 'text-red-400', icon: Flame };
        if (score > 40) return { label: 'WARNING: Possible Smoke', color: 'bg-orange-500', textColor: 'text-orange-400', icon: AlertCircle };
        return { label: 'SAFE: No Smoke Detected', color: 'bg-green-600', textColor: 'text-green-400', icon: CheckCircle2 };
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-orange-500/30">
                        <Flame className="w-4 h-4" />
                        AI-Powered Analysis
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                        Smoke Detection Scanner
                    </h1>
                    <p className="text-slate-400 max-w-xl mx-auto">
                        Upload an aerial or ground image and our AI will analyze it for signs of wildfire smoke using advanced computer vision.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Upload Area */}
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <UploadIcon className="w-5 h-5 text-blue-400" />
                            Upload Image
                        </h2>

                        {/* Location Inputs */}
                        <div className="mb-4 space-y-3">
                            <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                                <MapPin className="w-4 h-4 text-green-400" />
                                Location Info (Optional)
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="City (e.g., Izmir)"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <input
                                    type="text"
                                    placeholder="District (e.g., Buca)"
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${isDragActive
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                                }`}
                        >
                            <input {...getInputProps()} />
                            {preview ? (
                                <div className="relative">
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="max-h-64 mx-auto rounded-lg object-contain"
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            ) : (
                                <div className="py-8">
                                    <ImageIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                                    <p className="text-slate-300 font-medium mb-2">
                                        {isDragActive ? 'Drop the image here...' : 'Drag & drop an image here'}
                                    </p>
                                    <p className="text-slate-500 text-sm">or click to select a file</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={!selectedFile || loading}
                            className={`w-full mt-6 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${!selectedFile || loading
                                ? 'bg-slate-700 cursor-not-allowed opacity-50'
                                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-500/25'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Flame className="w-5 h-5" />
                                    Analyze for Smoke
                                </>
                            )}
                        </button>
                    </div>

                    {/* Results Area */}
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-purple-400" />
                            Analysis Results
                        </h2>

                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
                                <p className="font-medium">AI is analyzing your image...</p>
                                <p className="text-sm text-slate-500">This may take a few seconds</p>
                            </div>
                        )}

                        {error && !loading && (
                            <div className="flex flex-col items-center justify-center h-64 text-red-400">
                                <XCircle className="w-12 h-12 mb-4" />
                                <p className="font-medium">Analysis Failed</p>
                                <p className="text-sm text-slate-500 text-center mt-2">{error}</p>
                            </div>
                        )}

                        {result && !loading && (
                            <div className="space-y-6">
                                {/* Risk Score */}
                                <div className="bg-black/30 rounded-xl p-6 border border-white/5">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 ${getRiskStatus(result.risk_score).color}`}>
                                        {(() => {
                                            const StatusIcon = getRiskStatus(result.risk_score).icon;
                                            return <StatusIcon className="w-4 h-4" />;
                                        })()}
                                        {getRiskStatus(result.risk_score).label}
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-5xl font-bold ${getRiskStatus(result.risk_score).textColor}`}>
                                            {result.risk_score.toFixed(1)}%
                                        </span>
                                        <span className="text-slate-500 text-sm">Risk Score</span>
                                    </div>

                                    <div className="w-full bg-slate-800 h-3 rounded-full mt-4 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${getRiskStatus(result.risk_score).color}`}
                                            style={{ width: `${result.risk_score}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Detection Details */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Confidence</p>
                                        <p className="text-white text-xl font-bold">{(result.confidence * 100).toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Detections</p>
                                        <p className="text-white text-xl font-bold">{result.detection_count}</p>
                                    </div>
                                </div>

                                {/* Report Created Badge */}
                                {result.report_created && (
                                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <div>
                                            <p className="text-green-400 font-medium text-sm">Fire Report Auto-Created</p>
                                            <p className="text-slate-400 text-xs">Report ID: {result.report_id}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Detection ID */}
                                {result.detection_id && (
                                    <div className="text-xs text-slate-500">
                                        Detection ID: {result.detection_id}
                                    </div>
                                )}
                            </div>
                        )}

                        {!loading && !error && !result && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                                <p className="font-medium">No analysis yet</p>
                                <p className="text-sm">Upload an image and click "Analyze"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
