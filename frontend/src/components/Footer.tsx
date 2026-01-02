import { Phone, Shield, Activity } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-6 h-6 text-red-600" />
                            <span className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                                Wildfire AI Rescue
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-md">
                            Advanced AI-powered wildfire detection and rapid response coordination platform.
                            Protecting communities and forests with real-time intelligence.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-red-400 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-red-400 transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-red-400 transition-colors">Cookie Policy</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Emergency</h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-red-500 font-bold text-lg">
                                <Phone className="w-5 h-5" />
                                <span>112</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-500">
                                <Activity className="w-4 h-4" />
                                <span>System Status: Operational</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
                    <p>&copy; 2026 Wildfire AI Rescue. All rights reserved.</p>
                    <p>Designed for rapid emergency response.</p>
                </div>
            </div>
        </footer>
    );
}
