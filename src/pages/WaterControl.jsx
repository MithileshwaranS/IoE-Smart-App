import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Power, Clock, Droplets, Play, Pause, RotateCcw } from 'lucide-react';

const WaterControl = () => {
  const [systems, setSystems] = useState([
    { id: 'sprinkler1', name: 'Sprinkler System A', status: 'active', duration: 45, zone: 'Field A' },
    { id: 'sprinkler2', name: 'Sprinkler System B', status: 'inactive', duration: 30, zone: 'Field B' },
    { id: 'drip1', name: 'Drip Irrigation C', status: 'active', duration: 120, zone: 'Field C' },
    { id: 'greenhouse', name: 'Greenhouse Misting', status: 'scheduled', duration: 15, zone: 'Greenhouse' },
  ]);

  const [schedules, setSchedules] = useState([
    { id: 1, system: 'Sprinkler System A', time: '06:00', duration: 45, days: 'Mon, Wed, Fri' },
    { id: 2, system: 'Drip Irrigation C', time: '18:00', duration: 120, days: 'Daily' },
    { id: 3, system: 'Greenhouse Misting', time: '12:00', duration: 15, days: 'Daily' },
  ]);

  const toggleSystem = (id) => {
    setSystems(systems.map(system => 
      system.id === id 
        ? { ...system, status: system.status === 'active' ? 'inactive' : 'active' }
        : system
    ));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-600';
      case 'scheduled': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play className="w-5 h-5 text-green-600" />;
      case 'inactive': return <Pause className="w-5 h-5 text-gray-600" />;
      case 'scheduled': return <Clock className="w-5 h-5 text-blue-600" />;
      default: return <Pause className="w-5 h-5 text-gray-600" />;
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
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Water Control System</h1>
            <p className="text-gray-500">Manage irrigation and water systems</p>
          </div>
        </div>
      </div>

      {/* Control Systems */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {systems.map((system, index) => (
          <motion.div
            key={system.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{system.name}</h3>
                  <p className="text-sm text-gray-500">{system.zone}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBg(system.status)}`}>
                {system.status.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">{system.duration} min</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(system.status)}
                <span className={`font-medium ${getStatusColor(system.status)}`}>
                  {system.status === 'active' ? 'Running' : 
                   system.status === 'scheduled' ? 'Scheduled' : 'Stopped'}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <motion.button
                onClick={() => toggleSystem(system.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-200 ${
                  system.status === 'active' 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {system.status === 'active' ? 'Stop' : 'Start'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Irrigation Schedule */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Irrigation Schedule</h2>
        
        <div className="space-y-4">
          {schedules.map((schedule, index) => (
            <motion.div
              key={schedule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl space-y-3 sm:space-y-0"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{schedule.system}</p>
                  <p className="text-sm text-gray-500">{schedule.time} • {schedule.duration} min • {schedule.days}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 text-sm sm:text-base"
                >
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-all duration-200 text-sm sm:text-base"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Controls</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center space-y-2 p-3 sm:p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all duration-200"
          >
            <Power className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            <span className="text-xs sm:text-sm font-medium text-green-600">Start All</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center space-y-2 p-3 sm:p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all duration-200"
          >
            <Power className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
            <span className="text-xs sm:text-sm font-medium text-red-600">Stop All</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center space-y-2 p-3 sm:p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all duration-200"
          >
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <span className="text-xs sm:text-sm font-medium text-blue-600">Schedule</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center space-y-2 p-3 sm:p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all duration-200"
          >
            <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
            <span className="text-xs sm:text-sm font-medium text-purple-600">Settings</span>
          </motion.button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Add New Schedule
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
        >
          System Settings
        </motion.button>
      </div>
    </motion.div>
  );
};

export default WaterControl;