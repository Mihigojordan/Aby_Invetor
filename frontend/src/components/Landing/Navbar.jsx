import { NavLink } from "react-router-dom";
import Image from "../../assets/images/applogo.png"; // adjust the path to your image

const Navbar = () => {
  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About Us" },
    { to: "/features", label: "Features" },
    { to: "/contact", label: "Contact Us" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-primary-200">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg">
              <img
                src={Image}
                alt="Logo"
                className="h-8 w-24 object-cover scale-150"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-14">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `font-medium text-md transition-colors duration-200 ${
                    isActive
                      ? "text-primary-900 border-b-2 border-primary-600 pb-1"
                      : "text-primary-700 hover:text-primary-900"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center space-x-3">
            <NavLink
              to="/auth"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors duration-200"
            >
              Get Started
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
