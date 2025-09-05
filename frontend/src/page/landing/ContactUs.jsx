
import { useState } from "react";
import {
    Phone,
    Mail,
    MapPin,
    Clock,
    Send,
    MessageCircle,
    Building,
    Package,
    ArrowRight,
    Home,
    Users
} from "lucide-react";
import { motion } from "framer-motion";
import Swal from 'sweetalert2';
import HeaderBanner from "../../components/landing/HeaderBanner";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        inquiryType: '',
        message: ''
    });
    const [formErrors, setFormErrors] = useState({
        name: '',
        email: '',
        inquiryType: '',
        message: ''
    });

    const validateForm = () => {
        const errors = {};
        let isValid = true;

        // Name validation
        if (!formData.name.trim()) {
            errors.name = 'Name is required';
            isValid = false;
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters long';
            isValid = false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
            isValid = false;
        } else if (!emailRegex.test(formData.email.trim())) {
            errors.email = 'Please enter a valid email address';
            isValid = false;
        }

        // Inquiry Type validation
        if (!formData.inquiryType) {
            errors.inquiryType = 'Please select an inquiry type';
            isValid = false;
        }

        // Message validation
        if (!formData.message.trim()) {
            errors.message = 'Message is required';
            isValid = false;
        } else if (formData.message.trim().length < 10) {
            errors.message = 'Message must be at least 10 characters long';
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Clear error for the field being edited
        setFormErrors({
            ...formErrors,
            [e.target.name]: ''
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            // Show error popup with specific messages
            const errorMessages = Object.values(formErrors)
                .filter(error => error)
                .map(error => `<li>${error}</li>`)
                .join('');
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                html: `<ul class="text-left">${errorMessages}</ul>`,
                confirmButtonColor: '#2563eb',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Show loading animation
        Swal.fire({
            title: 'Sending Message...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Simulate 2-second loading
        setTimeout(() => {
            // Show success notification
            Swal.fire({
                icon: 'success',
                title: 'Message Sent!',
                text: 'Thank you for contacting us. We\'ll respond soon.',
                confirmButtonColor: '#2563eb',
                confirmButtonText: 'OK',
                timer: 3000,
                timerProgressBar: true
            }).then(() => {
                // Reset form after success notification
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    inquiryType: '',
                    message: ''
                });
                setFormErrors({
                    name: '',
                    email: '',
                    inquiryType: '',
                    message: ''
                });
            });
        }, 2000);
    };

    const contactMethods = [
        {
            icon: <Phone className="w-8 h-8" />,
            title: "Inventory Support Helpline",
            description: "Speak directly with our inventory specialists",
            info: ["+250 788 123 456", "+250 788 654 321"],
            action: "Call Support",
            availability: "24/7 Support"
        },
        {
            icon: <Mail className="w-8 h-8" />,
            title: "Email Support",
            description: "Send us your inventory queries anytime",
            info: ["support@abyinventory.rw", "help@abyinventory.rw"],
            action: "Send Email",
            availability: "Response within 4 hours"
        },
        {
            icon: <MessageCircle className="w-8 h-8" />,
            title: "Live Chat",
            description: "Get instant help with inventory issues",
            info: ["Available on portal", "WhatsApp: +250 788 123 456"],
            action: "Start Chat",
            availability: "8 AM - 6 PM"
        }
    ];

    const officeLocations = [
        {
            name: "Main Support Office",
            address: "KG 15 Ave, Kimihurura",
            city: "Kigali, Rwanda",
            phone: "+250 788 123 456",
            hours: "Mon - Fri: 8:00 AM - 6:00 PM",
            services: ["Inventory Support", "Financial Integration", "Reporting Assistance"]
        },
        {
            name: "Technical Support Center",
            address: "KN 3 Rd, Nyarutarama",
            city: "Kigali, Rwanda",
            phone: "+250 788 654 321",
            hours: "Mon - Fri: 9:00 AM - 5:00 PM",
            services: ["System Troubleshooting", "Data Integration", "Workflow Setup"]
        }
    ];

    const inquiryTypes = [
        "Stock Discrepancy",
        "Financial Tracking Issue",
        "Report Export Issue",
        "Purchase Order Query",
        "Supplier Linking",
        "Real-time Monitoring",
        "Category Management",
        "System Access Issue",
        "Document Management",
        "General Support",
        "Other"
    ];

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

            {/* Header Section */}
                
      <HeaderBanner
        title="Contact HR"
        subtitle="Home / Contact Us"
        backgroundStyle="image"
        icon={<Users className="w-10 h-10" />}
       
      />
      

            {/* Quick Contact Badges */}
            <section className="py-12">
                <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="text-center mb-16"
                    >
                        <motion.h2
                            variants={itemVariants}
                            className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight"
                        >
                            Get in Touch
                        </motion.h2>
                        <motion.p
                            variants={itemVariants}
                            className="text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed"
                        >
                            Have questions about stock tracking, financial integration, or reporting? Our team is here to provide expert support for your inventory needs.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="flex flex-wrap justify-center gap-4"
                    >
                        {[
                            { icon: <Phone size={16} />, text: "+250 788 123 456" },
                            { icon: <Mail size={16} />, text: "support@abyinventory.rw" },
                            { icon: <Clock size={16} />, text: "Mon-Fri 8AM-6PM" }
                        ].map((badge, index) => (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                                className="flex items-center bg-primary-50 text-primary-700 px-4 py-2 rounded-full shadow-sm transition-all duration-300"
                            >
                                {badge.icon}
                                <span className="font-medium ml-2">{badge.text}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Contact Methods */}
            <section className="py-20 bg-white">
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
                            Contact Options
                        </motion.h3>
                        <motion.p
                            variants={itemVariants}
                            className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto"
                        >
                            Choose the best way to reach our inventory support team
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        {contactMethods.map((method, index) => (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                whileHover={{ y: -10, scale: 1.03 }}
                                className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary-100 hover:border-primary-300"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-primary-600 mb-6"
                                >
                                    {method.icon}
                                </motion.div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">{method.title}</h4>
                                <p className="text-gray-600 mb-6">{method.description}</p>
                                <div className="space-y-2 mb-6">
                                    {method.info.map((info, idx) => (
                                        <p key={idx} className="text-gray-700 font-medium">{info}</p>
                                    ))}
                                </div>
                                <div className="mb-6">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700">
                                        <Clock className="w-4 h-4 mr-2" />
                                        {method.availability}
                                    </span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 flex items-center justify-center space-x-2"
                                >
                                    <span>{method.action}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Contact Form & Offices Section */}
            <section className="py-20 bg-gray-50">
                <div className="w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-11/12">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="grid lg:grid-cols-2 gap-12"
                    >
                        {/* Contact Form */}
                        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-xl p-8">
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Send a Message</h3>
                            <p className="text-gray-600 mb-8">Contact our support team for help with your inventory needs. We'll respond within 4 hours.</p>

                            <div className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">
                                            <Package className="w-4 h-4 inline mr-2" />
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className={`w-full px-4 py-3 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors`}
                                            placeholder="Your full name"
                                            aria-label="Full Name"
                                            aria-invalid={!!formErrors.name}
                                            aria-describedby={formErrors.name ? 'name-error' : undefined}
                                        />
                                        {formErrors.name && (
                                            <p id="name-error" className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">
                                            <Mail className="w-4 h-4 inline mr-2" />
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            className={`w-full px-4 py-3 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors`}
                                            placeholder="your@company.rw"
                                            aria-label="Email Address"
                                            aria-invalid={!!formErrors.email}
                                            aria-describedby={formErrors.email ? 'email-error' : undefined}
                                        />
                                        {formErrors.email && (
                                            <p id="email-error" className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">
                                            <Phone className="w-4 h-4 inline mr-2" />
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                            placeholder="+250 788 123 456"
                                            aria-label="Phone Number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">
                                            <Building className="w-4 h-4 inline mr-2" />
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            name="company"
                                            value={formData.company}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                            placeholder="Your company"
                                            aria-label="Company Name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        <MessageCircle className="w-4 h-4 inline mr-2" />
                                        Inquiry Type
                                    </label>
                                    <select
                                        name="inquiryType"
                                        value={formData.inquiryType}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 border ${formErrors.inquiryType ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors`}
                                        aria-label="Inquiry Type"
                                        aria-invalid={!!formErrors.inquiryType}
                                        aria-describedby={formErrors.inquiryType ? 'inquiryType-error' : undefined}
                                    >
                                        <option value="">Select inquiry type</option>
                                        {inquiryTypes.map((type, index) => (
                                            <option key={index} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    {formErrors.inquiryType && (
                                        <p id="inquiryType-error" className="text-red-500 text-sm mt-1">{formErrors.inquiryType}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        <MessageCircle className="w-4 h-4 inline mr-2" />
                                        Message *
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                        rows={5}
                                        className={`w-full px-4 py-3 border ${formErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none`}
                                        placeholder="Tell us about your inventory query or concern..."
                                        aria-label="Message"
                                        aria-invalid={!!formErrors.message}
                                        aria-describedby={formErrors.message ? 'message-error' : undefined}
                                    ></textarea>
                                    {formErrors.message && (
                                        <p id="message-error" className="text-red-500 text-sm mt-1">{formErrors.message}</p>
                                    )}
                                </div>

                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSubmit}
                                    className="w-full bg-primary-600 text-white py-4 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 flex items-center justify-center space-x-2 text-lg shadow-lg hover:shadow-xl cursor-pointer"
                                    aria-label="Send Message"
                                >
                                    <Send className="w-5 h-5" />
                                    <span>Send Message</span>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Office Locations */}
                        <motion.div variants={itemVariants} className="space-y-8">
                            <motion.h3
                                variants={itemVariants}
                                className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8"
                            >
                                Visit Our Support Offices
                            </motion.h3>
                            {officeLocations.map((office, index) => (
                                <motion.div
                                    key={index}
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.03 }}
                                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
                                >
                                    <h4 className="text-xl font-bold text-primary-700 mb-3">{office.name}</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-start space-x-3">
                                            <MapPin className="w-5 h-5 text-primary-500 mt-1" />
                                            <div>
                                                <p className="text-gray-700 font-medium">{office.address}</p>
                                                <p className="text-gray-600">{office.city}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Phone className="w-5 h-5 text-primary-500" />
                                            <p className="text-gray-700">{office.phone}</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Clock className="w-5 h-5 text-primary-500" />
                                            <p className="text-gray-700">{office.hours}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-sm text-gray-600 mb-2">Services Available:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {office.services.map((service, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                                                    {service}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
