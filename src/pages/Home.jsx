import React from 'react';
import { motion } from 'framer-motion';
import { 
  Wheat, 
  Bug, 
  Gauge, 
  Droplets, 
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const Home = () => {
  const quickStats = [
    { label: 'Active Sensors', value: '12', icon: Gauge, color: 'bg-blue-500' },
    { label: 'Water Level', value: '85%', icon: Droplets, color: 'bg-cyan-500' },
    { label: 'Healthy Crops', value: '94%', icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Alerts', value: '3', icon: AlertTriangle, color: 'bg-yellow-500' },
  ];

  const recentActivities = [
    { action: 'Crop prediction completed', time: '2 min ago', status: 'success' },
    { action: 'Water level alert triggered', time: '15 min ago', status: 'warning' },
    { action: 'Disease detection scan finished', time: '1 hour ago', status: 'info' },
    { action: 'Irrigation system activated', time: '2 hours ago', status: 'success' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 sm:p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome to IOE Smart App</h1>
        <p className="text-green-100 text-lg">
          Monitor and manage your agricultural IoT system with intelligent insights
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { name: 'Crop Prediction', icon: Wheat, color: 'from-green-500 to-green-600' },
            { name: 'Disease Check', icon: Bug, color: 'from-red-500 to-red-600' },
            { name: 'Sensor Status', icon: Gauge, color: 'from-blue-500 to-blue-600' },
            { name: 'Water Level', icon: Droplets, color: 'from-cyan-500 to-cyan-600' },
            { name: 'Water Control', icon: Settings, color: 'from-purple-500 to-purple-600' },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-gradient-to-r ${action.color} rounded-2xl p-3 sm:p-4 text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
              >
                <Icon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-medium text-center">{action.name}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl space-y-2 sm:space-y-0"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <span className="text-gray-700">{activity.action}</span>
              </div>
              <span className="text-sm text-gray-500 ml-6 sm:ml-0">{activity.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Home;