import { 
  ShoppingCart, 
  Wrench, 
  Phone, 
  Users, 
  Home,
  Info,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

// Enhanced Header Banner Component
export default function HeaderBanner({ 
  title, 
  subtitle, 
  backgroundStyle = "gradient", // "gradient", "image", "solid"
  backgroundImage = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&h=1080&fit=crop&crop=center",
  icon = null,
  breadcrumb = [],
  overlayOpacity = 0.6,
  height = "30vh", // "20vh", "30vh", "40vh", "50vh"
  titleSize = "large", // "small", "medium", "large", "xl"
  showParticles = true,
  textAlign = "center" // "left", "center", "right"
}) {
  
  const getBackgroundClasses = () => {
    switch (backgroundStyle) {
      case "image":
        return "bg-cover bg-center bg-no-repeat";
      case "solid":
        return "bg-primary-700";
      case "gradient":
      default:
        return "bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800";
    }
  };

  const getHeightClasses = () => {
    const heights = {
      "20vh": "h-[20vh] py-12",
      "30vh": "h-[30vh] py-16",
      "40vh": "h-[40vh] py-20",
      "50vh": "h-[50vh] py-24"
    };
    return heights[height] || heights["30vh"];
  };

  const getTitleSizeClasses = () => {
    const sizes = {
      "small": "text-2xl md:text-3xl",
      "medium": "text-3xl md:text-4xl",
      "large": "text-4xl md:text-5xl",
      "xl": "text-5xl md:text-6xl"
    };
    return sizes[titleSize] || sizes["large"];
  };

  const getTextAlignClasses = () => {
    const aligns = {
      "left": "text-left",
      "center": "text-center",
      "right": "text-right"
    };
    return aligns[textAlign] || aligns["center"];
  };

  return (
    <section className={`relative overflow-hidden ${getHeightClasses()} ${getBackgroundClasses()}`}
             style={backgroundImage && backgroundStyle === "image" ? { 
               backgroundImage: `linear-gradient(to right,rgba(0,0,0,${overlayOpacity}),rgba(0,0,0,${overlayOpacity})),url(${backgroundImage})` 
             } : {}}>
      
      {/* Animated Background Particles */}
      {showParticles && (
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-2 h-2 bg-white bg-opacity-20 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-3 h-3 bg-primary-300 bg-opacity-30 rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-white bg-opacity-15 rounded-full animate-pulse delay-700"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-primary-200 bg-opacity-40 rounded-full animate-ping"></div>
          <div className="absolute bottom-1/3 right-10 w-2 h-2 bg-white bg-opacity-25 rounded-full animate-bounce delay-300"></div>
        </div>
      )}
      
      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10"></div>
      
      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
        
        {/* Breadcrumb Navigation */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-6">
            <ol className={`flex items-center space-x-2 text-sm ${getTextAlignClasses()}`}>
              {breadcrumb.map((item, index) => (
                <li key={index} className="flex items-center">
                  {item.active ? (
                    <span className="text-primary-200 font-medium">{item.label}</span>
                  ) : (
                    <Link 
                      to={item.href || "#"}
                      className="text-white hover:text-primary-200 transition-colors duration-200"
                    >
                      {item.label}
                    </Link>
                  )}
                  {index < breadcrumb.length - 1 && (
                    <ChevronRight className="w-4 h-4 mx-2 text-primary-300" />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className={`text-white ${getTextAlignClasses()}`}>
          {/* Icon with enhanced styling */}
          {icon && (
            <div className="mb-8">
              <div className="bg-white bg-opacity-15 rounded-full w-20 h-20 flex items-center justify-center mx-auto backdrop-blur-lg border border-white/20 shadow-xl">
                <div className="text-white drop-shadow-lg">
                  {icon}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Title */}
          <h1 className={`${getTitleSizeClasses()} font-bold mb-4 leading-tight`}>
            <span className="bg-gradient-to-r from-white via-primary-100 to-white bg-clip-text text-transparent drop-shadow-2xl">
              {title}
            </span>
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <div className="text-primary-100 text-lg md:text-xl font-light tracking-wide">
              <span className="inline-block px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                {subtitle}
              </span>
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        {/* <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-50"></div> */}
      </div>

      {/* Modern geometric shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-300 opacity-10 rounded-full translate-y-24 -translate-x-24 blur-2xl"></div>
    </section>
  );
}