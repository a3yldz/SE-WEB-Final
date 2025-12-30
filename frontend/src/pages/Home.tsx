import { Link } from 'react-router-dom';
import { Map, Upload, ShieldAlert, Heart, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function Home() {
    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] opacity-10 bg-cover bg-center" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative z-10">
                    <div className="md:w-2/3 lg:w-1/2">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                            AI-Powered <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                                Disaster Risk Management
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl">
                            Advanced analysis and real-time monitoring to protect communities.
                            Visualize risk zones, analyze building structural integrity, and coordinate emergency responses.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link to="/map" className="inline-flex items-center px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-lg shadow-red-900/20">
                                View Risk Map
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Link>
                            <Link to="/upload" className="inline-flex items-center px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium backdrop-blur-sm transition-colors">
                                Analyze Structure
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-gray-50 flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Core Capabilities</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Comprehensive tools designed for emergency responders, city planners, and citizens.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={Map}
                            title="Interactive Risk Map"
                            description="Visualize geological and structural risk zones based on data analytics."
                            to="/map"
                            color="text-blue-500"
                        />
                        <FeatureCard
                            icon={Upload}
                            title="AI Analysis"
                            description="Upload building photos to detect potential structural vulnerabilities."
                            to="/upload"
                            color="text-purple-500"
                        />
                        <FeatureCard
                            icon={ShieldAlert}
                            title="Emergency Response"
                            description="Command center for fire departments and emergency units."
                            to="/fire-dept"
                            color="text-red-500"
                        />
                        <FeatureCard
                            icon={Heart}
                            title="Donation Support"
                            description="Direct channels to support affected areas and relief efforts."
                            to="/"
                            color="text-pink-500"
                            comingSoon
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    description,
    to,
    color,
    comingSoon
}: {
    icon: any,
    title: string,
    description: string,
    to: string,
    color: string,
    comingSoon?: boolean
}) {
    return (
        <Link
            to={to}
            className={cn(
                "group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1",
                comingSoon && "opacity-75 cursor-not-allowed pointer-events-none"
            )}
        >
            <div className={cn("inline-flex p-3 rounded-lg bg-gray-50 mb-4 group-hover:scale-110 transition-transform duration-300", color.replace('text-', 'bg-').replace('500', '100'))}>
                <Icon className={cn("w-6 h-6", color)} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-between">
                {title}
                {comingSoon && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Soon</span>}
            </h3>
            <p className="text-gray-600 leading-relaxed">
                {description}
            </p>
        </Link>
    );
}
