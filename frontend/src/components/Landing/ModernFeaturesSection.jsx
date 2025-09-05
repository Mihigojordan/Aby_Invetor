import React, { useState } from 'react';
import { 
  Package, 
  BarChart3, 
  Users, 
  Smartphone, 
  Shield, 
  Zap,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const ModernFeaturesSection = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const features = [
    {
      icon: <Package className="w-8 h-8" />,
      title: "Smart Product Tracking",
      description: "Advanced barcode scanning and real-time inventory updates with AI-powered categorization.",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Advanced Analytics",
      description: "Deep insights with predictive analytics, demand forecasting, and comprehensive reporting dashboards.",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Collaboration",
      description: "Seamless multi-user access with role-based permissions and real-time team synchronization.",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Mobile-First Design",
      description: "Native mobile apps with offline capabilities and instant cloud synchronization across all devices.",
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise Security",
      description: "Bank-level encryption, automated backups, and compliance with industry security standards.",
      gradient: "from-indigo-500 to-blue-500",
      bgGradient: "from-indigo-50 to-blue-50"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "Optimized performance with instant search, rapid data processing, and minimal loading times.",
      gradient: "from-yellow-500 to-orange-500",
      bgGradient: "from-yellow-50 to-orange-50"
    }
  ];

  return (
    <section id="features" className="py-5 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative max-w-8xl p-8 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Powerful Features</span>
          </div>
          
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 bg-clip-text text-transparent">
              Next-Gen Inventory
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Management
            </span>
          </h3>
          
        
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-slate-100 overflow-hidden ${
                hoveredIndex === index ? 'scale-105 -translate-y-2' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500`}></div>
              
              {/* Icon Container */}
              <div className={`relative z-10 w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} p-4 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-800 transition-colors">
                  {feature.title}
                </h4>
                <p className="text-slate-600 leading-relaxed mb-4 group-hover:text-slate-700 transition-colors">
                  {feature.description}
                </p>
                
                {/* Learn More Link */}
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span>Learn more</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Hover Effect Border */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-0.5`}>
                <div className="w-full h-full bg-white rounded-2xl"></div>
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
            </div>
          ))}
        </div>

      
      </div>
    </section>
  );
};

export default ModernFeaturesSection;