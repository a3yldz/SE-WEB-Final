import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, CheckCircle, AlertTriangle, FileImage, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function Upload() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<{ score: number; risk: string; details: string[] } | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selected = acceptedFiles[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setResult(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1
    });

    const handleAnalyze = () => {
        if (!file) return;
        setAnalyzing(true);
        // Mock analysis
        setTimeout(() => {
            setAnalyzing(false);
            setResult({
                score: 72,
                risk: 'High',
                details: [
                    'Detected significant crack in load-bearing pillar.',
                    'Exposed reinforcement bars visible.',
                    'Spalling observed in Area A.'
                ]
            });
        }, 2000);
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Structural Vulnerability Analysis</h1>
                <p className="text-gray-500">Upload an image of a building column or wall to detect structural defects using AI.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center p-6 transition-all cursor-pointer relative overflow-hidden bg-gray-50",
                            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400",
                            preview ? "border-solid border-gray-200" : ""
                        )}
                    >
                        <input {...getInputProps()} />

                        {preview ? (
                            <>
                                <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white font-medium">Click to change image</p>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                    <UploadIcon className="w-8 h-8" />
                                </div>
                                <p className="text-lg font-medium text-gray-700">Drop image here or click to upload</p>
                                <p className="text-sm text-gray-400 mt-2">Supports JPG, PNG (Max 10MB)</p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {file && (
                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={clearFile}
                                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                disabled={analyzing}
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing || !!result}
                                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : result ? 'Analysis Complete' : (
                                    <>
                                        Analyze Structure
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <FileImage className="w-5 h-5 mr-2 text-gray-500" />
                        Analysis Results
                    </h2>

                    {!result && !analyzing && (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <p>No analysis data yet.</p>
                            <p className="text-sm">Upload an image to start.</p>
                        </div>
                    )}

                    {analyzing && (
                        <div className="h-64 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                            <p className="text-gray-600 font-medium">Processing image vectors...</p>
                            <p className="text-xs text-gray-400 mt-2">Identifying structural patterns</p>
                        </div>
                    )}

                    {result && (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <div className="flex items-center justify-between mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <div>
                                    <p className="text-sm text-red-600 font-semibold uppercase tracking-wider">Risk Score</p>
                                    <p className="text-3xl font-bold text-red-700">{result.score}/100</p>
                                </div>
                                <div className="text-right">
                                    <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                        <AlertTriangle className="w-4 h-4 mr-1.5" />
                                        {result.risk} Risk
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Detected Issues</h3>
                            <ul className="space-y-3">
                                {result.details.map((detail, idx) => (
                                    <li key={idx} className="flex items-start text-gray-700">
                                        <CheckCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                                        {detail}
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <p className="text-xs text-gray-500 text-center">
                                    ** This is an AI-assisted estimation. Please consult a civil engineer for official certification.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
