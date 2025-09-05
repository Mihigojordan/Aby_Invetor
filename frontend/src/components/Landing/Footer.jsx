/* eslint-disable no-unused-vars */
import React from "react";
import {
  Warehouse,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ArrowRight,
  Heart,
  Settings,
  Package
} from "lucide-react";

export default function ModernFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-8xl mx-auto px-6 py-16">
        {/* Four Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Introduction Card */}
          <div className="bg-gray-800/50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl">
                <Warehouse className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-xl">ABY Inventory</h3>
            </div>
            <p className="text-gray-300 text-base leading-relaxed mb-6">
              Streamline your business with our advanced inventory management solution, designed for efficiency and growth.
            </p>
            <a
              href="#"
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm font-semibold"
            >
              Learn More <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </div>

          {/* Support Card */}
          <div className="bg-gray-800/50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <h4 className="text-white font-bold text-xl mb-6">Support</h4>
            <ul className="space-y-4">
              {['Documentation', 'Help Center', 'Community', 'Status Page'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-300 transition-colors flex items-center group text-sm"
                  >
                    <span>{item}</span>
                    <ArrowRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product Card */}
          <div className="bg-gray-800/50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <h4 className="text-white font-bold text-xl mb-6">Product</h4>
            <ul className="space-y-4">
              {['Features', 'Pricing', 'Integrations', 'Updates'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-blue-300 transition-colors flex items-center group text-sm"
                  >
                    <span>{item}</span>
                    <ArrowRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Card */}
          <div className="bg-gray-800/50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <h4 className="text-white font-bold text-xl mb-6">Contact</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300 text-sm">hello@abyinventory.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300 text-sm">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300 text-sm">San Francisco, CA</span>
              </div>
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300 text-sm">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>

      

        {/* Bottom Section */}
        <div className="border-t border-gray-700/50 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">Follow us:</span>
              {[
                { icon: Facebook, href: "#", label: "Facebook" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Instagram, href: "#", label: "Instagram" },
                { icon: Linkedin, href: "#", label: "LinkedIn" }
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="p-2 bg-gray-800 hover:bg-blue-600 rounded-xl transition-all group"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5 text-gray-400 group-hover:text-white" />
                </a>
              ))}
            </div>
            {/* Copyright & Legal */}
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-400">
              <div className="flex items-center">
                <span>© {currentYear} ABY Inventory Management. Made with </span>
                <Heart className="h-4 w-4 text-red-500 mx-1 fill-current" />
                <span>in San Francisco</span>
              </div>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-blue-300 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-blue-300 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-blue-300 transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Line */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
    </footer>
  );
}