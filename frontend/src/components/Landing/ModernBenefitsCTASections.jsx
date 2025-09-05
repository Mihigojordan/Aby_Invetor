import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Settings, 
  UserCheck, 
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Smartphone,
  Download,
  ArrowRight,
  Star,
  Zap,
  Shield,
  BarChart,
  Globe,
  Award,
  HeadphoneOff,
  Headphones
} from 'lucide-react';

const RedesignedBenefitsCTASections = () => {
  const [hoveredBenefit, setHoveredBenefit] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [, setAnimateStats] = useState(false);

  const benefits = [
   
    "Eliminate stockouts and overstock situations",
    "Automate manual processes and save time",
    "Real-time visibility across all locations",


  ];

  const features = [
    { 
      icon: <BarChart className="w-8 h-8" />, 
      title: "Advanced Analytics", 
      description: "Deep insights with predictive analytics and custom reporting dashboards",
      color: "from-blue-500 to-blue-600"
    },
    { 
      icon: <Globe className="w-8 h-8" />, 
      title: "Multi-Location", 
      description: "Manage inventory across unlimited locations with centralized control",
      color: "from-emerald-500 to-emerald-600"
    },
    { 
      icon: <Shield className="w-8 h-8" />, 
      title: "Enterprise Security", 
      description: "Bank-grade security with role-based access and audit trails",
      color: "from-purple-500 to-purple-600"
    }
  ];



  useEffect(() => {
    const timer = setTimeout(() => setAnimateStats(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const PWAInstallButton = ({ className = "", variant = "dark" }) => (
    <button className={`inline-flex items-center gap-3 px-6 py-3 font-semibold transition-all duration-300 hover:scale-105 rounded-xl ${
      variant === "dark" 
        ? "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20" 
        : "bg-slate-900 hover:bg-slate-800 text-white border border-slate-200"
    } ${className}`}>
      <Download className="w-5 h-5" />
      <span>Install App</span>
    </button>
  );

  return (
    <>
      {/* First Section - Dark Background */}
      <section className="py-24 relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          {/* Animated Orbs */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gradient-to-r from-emerald-400/30 to-teal-400/30 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">Transform Your Business</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Revolutionary
                  </span>
                  <br />
                  <span className="text-white">Operations</span>
                </h2>
                
                <p className="text-blue-100 text-xl leading-relaxed">
                  Join thousands of businesses that have transformed their inventory management 
                  with our comprehensive, AI-powered solution.
                </p>
              </div>

              {/* Benefits List */}
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className={`flex items-center space-x-4 p-4 rounded-xl backdrop-blur-sm transition-all duration-300 cursor-pointer ${
                      hoveredBenefit === index 
                        ? 'bg-white/20 transform translate-x-2 border border-white/30' 
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                    onMouseEnter={() => setHoveredBenefit(index)}
                    onMouseLeave={() => setHoveredBenefit(null)}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      hoveredBenefit === index 
                        ? 'bg-gradient-to-r from-blue-400 to-cyan-400 scale-110' 
                        : 'bg-white/20'
                    }`}>
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white font-medium text-lg">{benefit}</span>
                  </div>
                ))}
              </div>

            </div>

           <div className="relative">
  <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
        <Settings className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white">Smart Access Control</h3>
        <p className="text-blue-200">Tailored for every role</p>
      </div>
    </div>

    <div className="space-y-6">
      {/* Super Admin */}
      <div className="group p-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 cursor-pointer">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-white text-lg">Super Admin</h4>
            <p className="text-blue-200">Full system control & role management</p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="group p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 cursor-pointer">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Headphones className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-white text-lg">Support</h4>
            <p className="text-blue-200">Assist users & resolve issues efficiently</p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Employee */}
      <div className="group p-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 cursor-pointer">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-white text-lg">Employee</h4>
            <p className="text-blue-200">Access assigned tasks & daily operations</p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>
    </div>



               
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-yellow-400/30 to-orange-400/30 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-pink-400/30 to-purple-400/30 rounded-full blur-xl animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Second Section - White Background */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-blue-50"></div>
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content - Features */}
            <div className="order-2 lg:order-1 space-y-8">
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`group p-8 bg-white rounded-3xl shadow-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-2xl ${
                      hoveredFeature === index 
                        ? 'border-blue-200 transform scale-105' 
                        : 'border-gray-100 hover:border-blue-100'
                    }`}
                    onMouseEnter={() => setHoveredFeature(index)}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className="flex items-start space-x-6">
                      <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center text-white transition-transform duration-300 ${
                        hoveredFeature === index ? 'scale-110' : ''
                      }`}>
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                          {feature.title}
                        </h4>
                        <p className="text-gray-600 text-lg leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      <div className={`opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                        hoveredFeature === index ? 'translate-x-0' : 'translate-x-2'
                      }`}>
                        <ArrowRight className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-8 h-8 text-blue-600" />
                  <h4 className="text-xl font-bold text-gray-900">Industry Leading</h4>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Trusted by over 10,000+ businesses worldwide. Our platform consistently delivers 
                  exceptional results with 99.9% uptime and award-winning customer support.
                </p>
              </div>
            </div>

            {/* Right Content - Text & CTA */}
            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
                  <Star className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">Premium Features</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  <span className="text-gray-900">
                    Enterprise-Grade
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    Solutions
                  </span>
                </h2>
                
                <p className="text-gray-600 text-xl leading-relaxed mb-8">
                  Experience the power of advanced inventory management with features designed 
                  for modern businesses. Scale effortlessly while maintaining complete control.
                </p>
              </div>

              {/* Enhanced Stats */}
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <div className="text-4xl font-bold text-blue-600 mb-2">50M+</div>
                  <div className="text-gray-600">Items Tracked</div>
                </div>
                <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <div className="text-4xl font-bold text-purple-600 mb-2">150+</div>
                  <div className="text-gray-600">Countries</div>
                </div>
                <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <div className="text-4xl font-bold text-emerald-600 mb-2">98%</div>
                  <div className="text-gray-600">Satisfaction</div>
                </div>
                <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <div className="text-4xl font-bold text-orange-600 mb-2">5min</div>
                  <div className="text-gray-600">Setup Time</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-4">
                <button className="w-full group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3">
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <PWAInstallButton className="w-full justify-center" variant="light" />
              </div>

              {/* Trust Indicators */}
            
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default RedesignedBenefitsCTASections;