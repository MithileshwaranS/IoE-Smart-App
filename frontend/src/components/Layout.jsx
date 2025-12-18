import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Home,
  Wheat,
  Bug,
  Gauge,
  Droplets,
  Settings,
  MapPin,
} from "lucide-react";

const menuItems = [
  { path: "/", name: "Dashboard", icon: Home },
  { path: "/crop-disease-prediction", name: "Disease Prediction", icon: Bug },
  { path: "/crop-prediction", name: "Crop Yield Prediction", icon: Wheat },
  { path: "/sensor-readings", name: "Sensor Readings", icon: Gauge },
  { path: "/water-level", name: "Water Level", icon: Droplets },
  { path: "/water-control", name: "Water Control", icon: Settings },
  { path: "/geofence-map", name: "Geo Fence", icon: MapPin },
];

const Layout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white shadow-lg border-b border-green-100 sticky top-0 z-[1000]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Wheat className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">IOE Smart App</h1>
          </div>

          <button
            onClick={toggleMenu}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:shadow-lg lg:border-r lg:border-gray-200">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Wheat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    IOE Smart App
                  </h2>
                  <p className="text-xs text-gray-500">Agricultural IoT</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="mr-3 flex-shrink-0 h-6 w-6" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[999]"
                onClick={closeMenu}
              />

              <motion.nav
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="lg:hidden fixed top-0 left-0 bottom-0 w-80 max-w-sm bg-white shadow-2xl z-[1000] flex flex-col"
              >
                <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Wheat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">
                        IOE Smart App
                      </h2>
                      <p className="text-xs text-gray-500">Agricultural IoT</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-y-auto">
                  <nav className="flex-1 px-2 py-4 space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={closeMenu}
                          className={`group flex items-center px-2 py-3 text-base font-medium rounded-md transition-colors duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex flex-col w-0 flex-1 lg:ml-64">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
