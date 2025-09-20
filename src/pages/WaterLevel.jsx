import React from 'react';
import { motion } from 'framer-motion';
import { Droplets, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const WaterLevel = () => {
  const waterSources = [
    { id: 'tank1', name: 'Main Tank', level: 85, capacity: 1000, status: 'normal' },
    { id: 'tank2', name: 'Reservoir A', level: 42, capacity: 500, status: 'low' },
    { id: 'tank3', name: 'Reservoir B', level: 95, capacity: 800, status: 'high' },
    { id: 'well', name: 'Well Water', level: 68, capacity: 300, status: 'normal' },
  ];

  const waterUsage = [
    { area: 'Field A', usage: 150, unit: 'L/h', trend: 'up' },
    { area: 'Field B', usage: 120, unit: 'L/h', trend: 'down' },
    { area: 'Field C', usage: 180, unit: 'L/h', trend: 'up' },
    { area: 'Greenhouse', usage: 45, unit: 'L/h', trend: 'stable' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'low': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Water Level Monitoring</h1>
            <p className="text-gray-500">Real-time water management</p>
          </div>
        </div>
      </div>

      {/* Water Sources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {waterSources.map((source, index) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{source.name}</h3>
              {source.status === 'low' && (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Level</span>
                <span className={`font-bold ${getStatusColor(source.status)}`}>
                  {source.level}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${getStatusBg(source.status)} transition-all duration-500`}
                  style={{ width: `${source.level}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Capacity</span>
              <span>{source.capacity}L</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Water Usage */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Water Usage by Area</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {waterUsage.map((usage, index) => (
            <motion.div
              key={usage.area}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center space-x-3">
                <Droplets className="w-6 h-6 text-cyan-600" />
                <div>
                  <p className="font-medium text-gray-800">{usage.area}</p>
                  <p className="text-sm text-gray-600">{usage.usage} {usage.unit}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getTrendIcon(usage.trend)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Water Level Chart */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Water Level Trends</h2>
        
        <div className="h-48 sm:h-64 flex items-end justify-between space-x-1 sm:space-x-2">
          {Array.from({ length: 12 }, (_, i) => {
            const height = Math.random() * 200 + 50;
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg flex-1"
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
        
        <div className="flex justify-between text-xs sm:text-sm text-gray-600 mt-4">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
          <span>Jul</span>
          <span>Aug</span>
          <span>Sep</span>
          <span>Oct</span>
          <span>Nov</span>
          <span>Dec</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Update Readings
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
        >
          Set Alerts
        </motion.button>
      </div>
    </motion.div>
  );
};

export default WaterLevel;