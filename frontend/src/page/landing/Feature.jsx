import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Package, 
  DollarSign, 
  BarChart3, 
  FileText, 
  Layers, 
  Activity, 
  CheckCircle, 
  Star, 
  Shield, 
  Zap, 
  Cloud, 
  Smartphone, 
  Lock, 
  Globe, 
  Settings, 
  Database, 
  ArrowRight 
} from 'lucide-react';
import HeaderBanner from '../../components/landing/HeaderBanner';

export default function InventoryFeaturesPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Stock Management', 'Financial Integration', 'Reporting', 'Workflows', 'Document Management', 'Real-time Monitoring'];

  const modules = [
    {
      id: 1,
      name: "Stock Management",
      category: "Stock Management",
      icon: <Package className="w-8 h-8" />,
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3a89d5d?w=400&h=400&fit=crop",
      features: ["Purchase Tracking", "Sales Monitoring", "Stock-ins/Stock-outs", "Returns Management"],
      badge: "Core",
      description: "Complete control over inventory movements, tracking purchases, sales, stock-ins, stock-outs, and returns with precision.",
      benefits: ["Accurate stock levels", "Reduced discrepancies", "Automated tracking", "Real-time updates"],
      pricing: "Included in all plans"
    },
    {
      id: 2,
      name: "Financial Integration",
      category: "Financial Integration",
      icon: <DollarSign className="w-8 h-8" />,
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop",
      features: ["Client Payments", "Transport Costs", "Expense Tracking", "Profit Margin Analysis"],
      badge: "Automated",
      description: "Synchronize financial transactions with inventory, including client payments, transport costs, and expense tracking.",
      benefits: ["Unified financial view", "Accurate cost tracking", "Profit insights", "Automated calculations"],
      pricing: "Starting at $5/user"
    },
    {
      id: 3,
      name: "Advanced Reporting",
      category: "Reporting",
      icon: <BarChart3 className="w-8 h-8" />,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
      features: ["Custom Dashboards", "PDF/Excel Exports", "Real-time Analytics", "Trend Analysis"],
      badge: "Intelligent",
      description: "Generate comprehensive dashboards, exportable reports, and real-time analytics for data-driven decisions.",
      benefits: ["Actionable insights", "Customizable reports", "Real-time data", "Trend visualization"],
      pricing: "Starting at $10/month"
    },
    {
      id: 4,
      name: "Category Management",
      category: "Workflows",
      icon: <Layers className="w-8 h-8" />,
      image: "https://images.unsplash.com/photo-1581291518633-83b4d6e98900?w=400&h=400&fit=crop",
      features: ["Category Organization", "Request Workflows", "Approval Processes", "Trade Management"],
      badge: "Flexible",
      description: "Organize materials by category or trade with streamlined request and approval workflows for efficient operations.",
      benefits: ["Structured inventory", "Streamlined approvals", "Trade-specific tracking", "Enhanced workflows"],
      pricing: "Starting at $3/user"
    },
    {
      id: 5,
      name: "Document Management",
      category: "Document Management",
      icon: <FileText className="w-8 h-8" />,
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=400&fit=crop",
      features: ["Purchase Orders", "Supplier Linking", "Transaction Records", "Document Storage"],
      badge: "Organized",
      description: "Create and manage purchase orders, link suppliers, and maintain comprehensive transaction records.",
      benefits: ["Centralized documents", "Supplier integration", "Record accessibility", "Streamlined orders"],
      pricing: "Starting at $4/user"
    },
    {
      id: 6,
      name: "Real-time Monitoring",
      category: "Real-time Monitoring",
      icon: <Activity className="w-8 h-8" />,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
      features: ["Live Updates", "Search Functionality", "Data Filtering", "Pagination"],
      badge: "Dynamic",
      description: "Monitor inventory and financial data in real-time with search, filtering, and pagination for large datasets.",
      benefits: ["Instant updates", "Easy data access", "Flexible filtering", "Scalable data handling"],
      pricing: "Starting at $2/user"
    }
  ];

  const keyFeatures = [
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Cloud-Based",
      description: "Access your inventory system anytime, anywhere with secure cloud infrastructure."
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile Ready",
      description: "Native mobile apps for iOS and Android for on-the-go management."
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Bank-level encryption and access controls for your data."
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Multi-Language",
      description: "Support for multiple languages and currencies."
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: "Customizable",
      description: "Flexible workflows and custom field configurations."
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Data Integration",
      description: "Seamless integration with existing ERP and accounting systems."
    }
  ];

  // Fixed filtering logic
  const filteredModules = activeCategory === 'All' 
    ? modules 
    : modules.filter(module => module.category === activeCategory);

  // Debug state changes
  useEffect(() => {
    console.log('Active Category:', activeCategory);
    console.log('Filtered Modules:', filteredModules);
  }, [activeCategory, filteredModules]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 right-10 w-32 h-32 bg-primary-100 rounded-full opacity-20 blur-2xl"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-primary-100 rounded-full opacity-30 blur-2xl"></div>
      </div>

      {/* Header Banner */}
          <HeaderBanner
        title="HR Features"
        subtitle="Home  / Features"
       backgroundStyle="image"
        icon={<Star className="w-10 h-10" />}
       
      />
      {/* Overview Stats */}
      <section className="py-16 relative">
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { value: "6+", label: "Core Modules", icon: <Package className="w-6 h-6 text-primary-600" /> },
              { value: "30+", label: "Features", icon: <Star className="w-6 h-6 text-primary-600" /> },
              { value: "99.2%", label: "Uptime", icon: <Cloud className="w-6 h-6 text-primary-600" /> },
              { value: "24/7", label: "Support", icon: <Shield className="w-6 h-6 text-primary-600" /> }
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg text-center hover:scale-105 transition-transform duration-300"
              >
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-primary-700 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white">
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Why Choose Aby Inventory?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              A scalable, secure, and user-friendly system for inventory and financial management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {keyFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="text-primary-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Core Inventory Modules
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive tools to manage stock, finances, and business insights
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  console.log(`Category selected: ${category}`);
                }}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105 ${
                  activeCategory === category
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                }`}
                aria-label={`Filter by ${category}`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Active category indicator */}
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
              Showing: {activeCategory} ({filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''})
            </span>
          </div>

          {filteredModules.length === 0 ? (
            <div className="text-center text-gray-600 text-lg">
              No modules found for this category.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredModules.map((module) => (
                <div
                  key={module.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:-translate-y-2 hover:scale-105 transition-all duration-300"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={module.image}
                      alt={module.name}
                      className="w-full h-56 object-cover hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {module.badge}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className="bg-white rounded-full p-2 text-primary-600">
                        {module.icon}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-2">
                      <span className="text-primary-600 text-sm font-medium">{module.category}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{module.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{module.description}</p>

                    <div className="space-y-2 mb-4">
                      {module.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-gray-600 text-sm">{feature}</span>
                        </div>
                      ))}
                      {module.features.length > 3 && (
                        <div className="text-primary-600 text-sm font-medium">
                          +{module.features.length - 3} more features
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-500">{module.pricing}</div>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>

                    <button
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all duration-300"
                      aria-label={`Learn more about ${module.name}`}
                    >
                      Learn More <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Seamless Integrations
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with your existing tools for a unified inventory workflow
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {['SAP', 'QuickBooks', 'Zoho Inventory', 'Shopify'].map((integration, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-primary-600 font-semibold">{integration.charAt(0)}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{integration}</h3>
                <p className="text-sm text-gray-600 mt-2">Easy integration</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}