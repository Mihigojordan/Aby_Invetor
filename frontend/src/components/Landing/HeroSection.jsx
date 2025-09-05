import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, ArrowRight } from "lucide-react";

const HeroPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Mock images - replace with your actual inventory-related images
  const images = [
    "https://images.unsplash.com/photo-1580795479225-c50ab8c3348d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Warehouse
    "https://plus.unsplash.com/premium_photo-1682089005307-725142a30eac?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Inventory tracking
    "https://images.unsplash.com/photo-1585313736187-2d481f3c3969?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Analytics dashboard
  ];
const words = [
  "Smart Inventory Management for Modern Businesses.",

  "Automated Warehouse Management Systems work hand in hand with supply chain optimization tools.",

  "Intelligent Asset Management ensures maximum efficiency across all resources. "
];


  const serviceTypes = [
    "Inventory Management",
    "Stock Tracking",
    "Warehouse Automation",
    "Supply Chain",
    "Asset Management",
    "Analytics & Reporting"
  ];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % images.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="w-full bg-gray-900 overflow-hidden">
      <div className="relative h-screen md:h-[620px] rounded-xl">
        {/* Sliding Container */}
        <div 
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className="w-full h-full flex-shrink-0 relative"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.3)), url(${image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              {/* Content for each slide */}
              <div className="relative z-10 ml-10 flex flex-col justify-center h-full p-6 md:p-12 lg:p-16 xl:p-24 leading-tight -mt-20 md:mt-7">
                <div className="max-w-4xl">
                  {/* Brand Badge */}
                  <div className="inline-flex items-center gap-2 mb-6 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="px-4 py-2  rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-sm">
                      Abyinventory
                    </span>
                    <span className="text-white font-medium uppercase tracking-wide text-sm">
                      Smart inventory made simple
                    </span>
                  </div>

                  {/* Main Heading */}
                  <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-6" style={{lineHeight: 1.3}}>
                    <span className="bg-gradient-to-r from-white via-primary-200 to-primary-200 bg-clip-text text-transparent">
                      {words[index]}
                    </span>
                  </h1>

                  {/* Service Type Badge */}
                  <div className="mb-6">
                    <span className="px-3 py-1 bg-gradient-to-r from-primary-500/80 to-primary-600/80 backdrop-blur-md text-white rounded-full text-xs font-semibold border border-white/20">
                      {serviceTypes[index]}
                    </span>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <button className="group px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-sm hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                      <Play size={16} className="group-hover:translate-x-1 transition-transform" />
                      Learn More
                    </button>
                    <button className="px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-xl font-semibold text-sm border border-white/30 hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-2">
                      Start Free Trial
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* LEFT SLIDE BUTTON */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md text-white hover:from-emerald-500/40 hover:to-teal-600/40 transition-all duration-300 flex items-center justify-center border border-white/30 shadow-xl group z-10"
        >
          <ChevronLeft size={24} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* RIGHT SLIDE BUTTON */}
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md text-white hover:from-emerald-500/40 hover:to-teal-600/40 transition-all duration-300 flex items-center justify-center border border-white/30 shadow-xl group z-10"
        >
          <ChevronRight size={24} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-8 h-2 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? 'bg-gradient-to-r from-primary-400 to-primary-500 shadow-lg'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Floating Info Card */}
        <div className="absolute bottom-6 right-6 bg-slate-800/90 backdrop-blur-md p-4 rounded-xl text-white max-w-xs border border-primary-400/30 shadow-xl z-10">
          <h3 className="text-sm font-semibold mb-1 text-primary-300">Enterprise Solution</h3>
          <p className="text-xs opacity-90">
            Transform your {serviceTypes[currentSlide].toLowerCase()} with our cutting-edge platform.
          </p>
        </div>

        {/* Slide Counter */}
        <div className="absolute top-6 right-6 bg-slate-800/80 backdrop-blur-md px-3 py-1 rounded-full text-white border border-blue-400/30 z-10">
          <span className="text-xs font-medium">
            {currentSlide + 1} / {images.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeroPage;