
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  Shield, 
  Zap,
  TrendingUp,
  CheckCircle,
  Star,
  ArrowRight,
  BarChart3,
  Building,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Rocket,
  DollarSign,
  FileText,
  Activity,
  Database,
  Layers,
  Globe,
} from "lucide-react";
import HeaderBanner from "../../components/landing/HeaderBanner";

export default function AboutPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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

  const stats = [
    { number: "1,200+", label: "Businesses Using ABY", icon: <Building className="w-8 h-8" /> },
    { number: "5+", label: "Years of Innovation", icon: <Calendar className="w-8 h-8" /> },
    { number: "10M+", label: "Transactions Tracked", icon: <Activity className="w-8 h-8" /> },
    { number: "99.2%", label: "System Uptime", icon: <Star className="w-8 h-8" /> }
  ];

  const values = [
    {
      icon: <Shield className="w-12 h-12" />,
      title: "Data Security",
      description: "Enterprise-grade encryption and access controls to protect your inventory and financial data.",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: <Zap className="w-12 h-12" />,
      title: "Real-time Tracking",
      description: "Live updates ensure accurate stock levels, sales, and financial records at all times.",
      color: "from-yellow-500 to-orange-600"
    },
    {
      icon: <TrendingUp className="w-12 h-12" />,
      title: "Smart Analytics",
      description: "Data-driven insights with comprehensive dashboards and exportable reports.",
      color: "from-primary-500 to-sky-600"
    },
    {
      icon: <Layers className="w-12 h-12" />,
      title: "Seamless Integration",
      description: "Unifies inventory, finance, and operations for complete business control.",
      color: "from-purple-500 to-violet-600"
    }
  ];

  const features = [
    {
      icon: <Package className="w-8 h-8" />,
      title: "Stock Management",
      description: "Track purchases, sales, stock-ins, stock-outs, and returns with precision.",
      gradient: "from-primary-500 to-cyan-600"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Financial Integration",
      description: "Monitor client payments, transport costs, and expenses alongside inventory.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Advanced Reporting",
      description: "Generate dashboards, statistics, and export reports in PDF and Excel.",
      gradient: "from-purple-500 to-violet-600"
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: "Category Management",
      description: "Organize materials by category with request and approval workflows.",
      gradient: "from-orange-500 to-red-600"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Document Management",
      description: "Create purchase orders, link suppliers, and manage transaction records.",
      gradient: "from-teal-500 to-primary-600"
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: "Real-time Monitoring",
      description: "Live updates, search, filtering, and pagination for large datasets.",
      gradient: "from-pink-500 to-rose-600"
    }
  ];

  const milestones = [
    {
      year: "2019",
      title: "ABY Inventory Launch",
      description: "Launched a robust system for seamless stock and financial tracking.",
      icon: <Rocket className="w-6 h-6" />
    },
    {
      year: "2020",
      title: "Financial Integration",
      description: "Added tracking for payments, expenses, and profit margins.",
      icon: <DollarSign className="w-6 h-6" />
    },
    {
      year: "2021",
      title: "Analytics Suite",
      description: "Introduced real-time dashboards and exportable reports.",
      icon: <BarChart3 className="w-6 h-6" />
    },
    {
      year: "2022",
      title: "Workflow Enhancements",
      description: "Added category management and approval workflows.",
      icon: <Layers className="w-6 h-6" />
    },
    {
      year: "2024",
      title: "Cloud Optimization",
      description: "Upgraded to a scalable, secure cloud-native platform.",
      icon: <Database className="w-6 h-6" />
    }
  ];

  const testimonials = [
    {
      quote: "ABY Inventory streamlined our warehouse operations, eliminating stock errors completely.",
      author: "Patricia Uwimana",
      position: "Operations Manager",
      company: "Prime Distribution Ltd"
    },
    {
      quote: "The financial integration has given us clear insights into our profit margins and costs.",
      author: "Emmanuel Nkurunziza",
      position: "Finance Director", 
      company: "Sunrise Trading Co"
    },
    {
      quote: "The dashboards and reports have transformed how we make business decisions.",
      author: "Grace Mukamana",
      position: "Business Owner",
      company: "Mountain View Supplies"
    }
  ];

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header Section with Hero Image */}
        <HeaderBanner
        title="About Aby Inventory"
        subtitle="Home / About us"
        backgroundStyle="image"
        icon={<Package className="w-10 h-10 text-white" />}
      />



      {/* Main Content Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-80 h-80 bg-primary-100/20 rounded-full blur-3xl"
        />

        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid lg:grid-cols-2 gap-12 items-center mb-16"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
                Complete Inventory Ecosystem
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Aby Inventory is a digital system designed to manage and track the flow of goods, materials, and financial transactions within your organization. It ensures full control over stock, purchases, sales, and expenses while providing actionable insights for decision-making.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                From tracking stock movements like purchases, sales, stock-ins, stock-outs, and returns to synchronizing financial records such as client payments and transport costs, Aby Inventory creates a unified ecosystem that reduces errors and enhances efficiency.
              </p>

              <motion.div
                variants={containerVariants}
                className="grid md:grid-cols-2 gap-6"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
                    className="text-center bg-primary-50 rounded-xl p-6 transition-all duration-300"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      className="text-primary-600 mb-3 flex justify-center"
                    >
                      {stat.icon}
                    </motion.div>
                    <div className="text-2xl font-bold text-primary-700 mb-1">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="relative flex-1"
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="bg-gradient-to-br from-primary-600 to-sky-800 rounded-2xl p-6 flex-1 shadow-2xl"
              >
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <BarChart3 className="w-6 h-6 text-white mr-2" />
                      <span className="text-white font-medium">Inventory Dashboard</span>
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/20 rounded p-3 text-center">
                      <div className="text-white text-xl font-bold">2,450</div>
                      <div className="text-primary-200 text-sm">Total Items</div>
                    </div>
                    <div className="bg-white/20 rounded p-3 text-center">
                      <div className="text-white text-xl font-bold">$125K</div>
                      <div className="text-primary-200 text-sm">Total Value</div>
                    </div>
                  </div>

                  <div className="bg-white/20 rounded p-3">
                    <div className="flex items-end space-x-1 h-20">
                      {[60, 80, 40, 90, 70, 85, 95].map((height, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: i * 0.1, duration: 0.6 }}
                          className="bg-white/60 rounded-sm flex-1"
                        />
                      ))}
                    </div>
                    <div className="text-primary-200 text-xs mt-2 text-center">Sales Trends</div>
                  </div>
                </div>

                <div className="text-center text-white">
                  <h4 className="text-lg font-bold">Real-time Insights</h4>
                  <p className="text-primary-200 text-sm mt-2">Monitor stock, sales, and finances in one unified dashboard.</p>
                </div>

                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50">
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h3
              variants={itemVariants}
              className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight"
            >
              Powerful Features
            </motion.h3>
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Comprehensive tools for inventory, financial, and operational management
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.03 }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.7 }}
                  className={`bg-gradient-to-br ${feature.gradient} rounded-lg w-14 h-14 flex items-center justify-center mb-4 shadow-md`}
                >
                  <div className="text-white">{feature.icon}</div>
                </motion.div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-white">
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h3
              variants={itemVariants}
              className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight"
            >
              Our Core Values
            </motion.h3>
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Principles driving our inventory management solutions
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.05 }}
                className="text-center"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.7 }}
                  className={`bg-gradient-to-br ${value.color} rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg`}
                >
                  <div className="text-white">{value.icon}</div>
                </motion.div>
                <h4 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h4>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-0 w-80 h-80 bg-primary-100/20 rounded-full blur-3xl"
        />
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h3
              variants={itemVariants}
              className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight"
            >
              Our Journey
            </motion.h3>
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Milestones in building Aby Inventory Management
            </motion.p>
          </motion.div>

          <div className="relative">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5 }}
              className="hidden lg:block absolute left-1/2 transform -translate-x-px h-full w-0.5 bg-primary-200"
            />
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5 }}
              className="lg:hidden absolute left-8 top-0 h-full w-0.5 bg-primary-200"
            />

            <div className="space-y-12 lg:space-y-16">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? 'lg:justify-start' : 'lg:justify-end'
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 + 0.3, duration: 0.4 }}
                    whileHover={{ scale: 1.5 }}
                    className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow-lg z-10"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 + 0.3, duration: 0.4 }}
                    className="lg:hidden absolute left-6 transform -translate-x-1/2 w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow-lg z-10"
                  />

                  <div className={`
                    w-full lg:w-5/12 
                    pl-16 lg:pl-0
                    ${index % 2 === 0 ? 'lg:pr-8 lg:text-right' : 'lg:pl-8 lg:text-left'}
                  `}>
                    <motion.div
                      whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                      className="bg-white rounded-xl p-6 shadow-lg hover:bg-primary-50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-center lg:justify-start mb-3">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, delay: index }}
                          className="text-primary-600 mr-2"
                        >
                          {milestone.icon}
                        </motion.div>
                        <div className="text-xl sm:text-2xl font-bold text-primary-700">{milestone.year}</div>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">{milestone.title}</h4>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{milestone.description}</p>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-b from-primary-50 to-sky-100">
        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h3
              variants={itemVariants}
              className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight"
            >
              Success Stories
            </motion.h3>
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600"
            >
              How businesses thrive with Aby Inventory
            </motion.p>
          </motion.div>

          <motion.div
            key={activeTestimonial}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.5 }}
            className="relative bg-white rounded-2xl p-8 shadow-xl"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-4 left-4 text-primary-200"
            >
              <Package className="w-8 h-8" />
            </motion.div>

            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg sm:text-xl text-gray-600 mb-6 italic leading-relaxed"
              >
                "{testimonials[activeTestimonial].quote}"
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-sky-700 rounded-full flex items-center justify-center mb-3">
                  <span className="text-white font-bold text-lg">
                    {testimonials[activeTestimonial].author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-gray-900">{testimonials[activeTestimonial].author}</h4>
                <p className="text-primary-600 font-medium">{testimonials[activeTestimonial].position}</p>
                <p className="text-gray-500 text-sm">{testimonials[activeTestimonial].company}</p>
              </motion.div>
            </div>

            <div className="flex justify-between items-center mt-8">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={prevTestimonial}
                className="p-3 rounded-full bg-primary-100 hover:bg-primary-200 transition-colors duration-300 shadow-lg"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-6 h-6 text-primary-600" />
              </motion.button>

              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                      index === activeTestimonial ? 'bg-primary-600' : 'bg-primary-200'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={nextTestimonial}
                className="p-3 rounded-full bg-primary-100 hover:bg-primary-200 transition-colors duration-300 shadow-lg"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-6 h-6 text-primary-600" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Section
      <section className="py-24 bg-gradient-to-r from-primary-700 to-sky-800 relative overflow-hidden">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute top-12 right-12 w-32 h-32 border border-white/20 rounded-full"
        />
        <motion.div
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-12 left-12 w-24 h-24 border border-white/20 rounded-full"
        />

        <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center"
          >
            <motion.h3
              variants={itemVariants}
              className="text-3xl sm:text-4xl font-extrabold text-white mb-6 tracking-tight"
            >
              Transform Your Inventory Management
            </motion.h3>
            <motion.p
              variants={itemVariants}
              className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto"
            >
              Join thousands of businesses using Aby Inventory to streamline operations, track finances, and make informed decisions.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(255,255,255,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-primary-700 px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:bg-gray-100 transition-all duration-300 flex items-center"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-primary-700 transition-all duration-300 flex items-center"
              >
                Schedule a Demo
                <Calendar className="w-5 h-5 ml-2" />
              </motion.button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex items-center justify-center text-primary-200"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Free 30-day trial • No credit card required • Full support included</span>
            </motion.div>
          </motion.div>
        </div>
      </section> */}

     
    </div>
  );
}
