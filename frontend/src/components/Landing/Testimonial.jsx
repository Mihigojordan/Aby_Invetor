import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination, Autoplay } from "swiper/modules";

export default function TestimonialSlider() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Customer",
      text: "This service exceeded my expectations. Everything was smooth and professional!",
      initials: "SJ",
      color: "bg-gradient-to-br from-purple-500 to-pink-600"
    },
    {
      name: "Michael Smith",
      role: "Entrepreneur", 
      text: "The support team was amazing. I highly recommend this to anyone looking for reliability.",
      initials: "MS",
      color: "bg-gradient-to-br from-blue-500 to-indigo-600"
    },
    {
      name: "Emily Davis",
      role: "Freelancer",
      text: "Easy to use, great design, and fantastic value. I'll definitely keep using it.",
      initials: "ED",
      color: "bg-gradient-to-br from-emerald-500 to-teal-600"
    },
    {
      name: "David Wilson",
      role: "Designer",
      text: "The interface is intuitive and the results are consistently outstanding. Couldn't be happier!",
      initials: "DW",
      color: "bg-gradient-to-br from-orange-500 to-red-600"
    },
    {
      name: "Lisa Chen",
      role: "Marketing Manager",
      text: "Game-changer for our business. The ROI has been incredible since we started using this platform.",
      initials: "LC",
      color: "bg-gradient-to-br from-cyan-500 to-blue-600"
    }
  ];

  return (
    <div className="w-full max-w-8xl mx-auto px-6 py-16 bg-gradient-to-b from-primary-800 to-primary-400">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-600 bg-clip-text text-transparent mb-4">
          What Our Clients Say
        </h2>
        <p className="text-white text-lg max-w-2xl mx-auto">
          Don't just take our word for it - hear from some of our amazing customers
        </p>
      </div>
      
      <Swiper
        modules={[Pagination, Autoplay]}
        pagination={{ 
          clickable: true,
          dynamicBullets: true
        }}
        autoplay={{ 
          delay: 4000,
          disableOnInteraction: false 
        }}
        spaceBetween={24}
        slidesPerView={1}
        loop={true}
        breakpoints={{
          640: { slidesPerView: 1, spaceBetween: 20 },
          768: { slidesPerView: 2, spaceBetween: 24 },
          1024: { slidesPerView: 3, spaceBetween: 30 },
        }}
        className="pb-12"
      >
        {testimonials.map((testimonial, index) => (
          <SwiperSlide key={index}>
            <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 flex flex-col h-full border border-gray-100 hover:border-indigo-200 group">
              <div className="flex flex-col items-center text-center flex-grow">
                {/* Quote Icon */}
                <div className="mb-6 opacity-20 group-hover:opacity-30 transition-opacity">
                  <svg className="w-12 h-12 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                  </svg>
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-700 mb-8 text-lg leading-relaxed italic flex-grow">
                  "{testimonial.text}"
                </p>

                {/* User Info */}
                <div className="flex flex-col items-center">
                  {/* Avatar with Initials */}
                  <div className={`w-16 h-16 ${testimonial.color} rounded-full flex items-center justify-center mb-4 shadow-lg`}>
                    <span className="text-white font-bold text-lg">
                      {testimonial.initials}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-xl text-gray-900 mb-1">
                    {testimonial.name}
                  </h3>
                  <span className="text-indigo-600 font-medium text-sm uppercase tracking-wide">
                    {testimonial.role}
                  </span>
                </div>
              </div>

              {/* Rating Stars */}
              <div className="flex justify-center mt-6 pt-6 border-t border-blue-600/30">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}