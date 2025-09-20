import React from 'react';
import { motion } from 'framer-motion';
import { Gauge, Thermometer, Droplets, Wind, Sun, Activity } from 'lucide-react';

const SensorReadings = () => {
  const sensors = [
    { 
      id: 'temp', 
      name: 'Temperature', 
      value: '24.5°C', 
      status: 'normal', 
      icon: Thermometer,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    { 
      id: 'humidity', 
      name: 'Humidity', 
      value: '65%', 
      status: 'normal', 
      icon: Droplets,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      id: 'soilMoisture', 
      name: 'Soil Moisture', 
      value: '42%', 
      status: 'low', 
      icon: Droplets,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50'
    },
    { 
      id: 'windSpeed', 
      name: 'Wind Speed', 
      value: '8.2 km/h', 
      status: 'normal', 
      icon: Wind,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      id: 'lightIntensity', 
      name: 'Light Intensity', 
      value: '850 lux', 
      status: 'high', 
      icon: Sun,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50'
    },
    { 
      id: 'soilPh', 
      name: 'Soil pH', 
      value: '6.8', 
      status: 'normal', 
      icon: Activity,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

  const sensorHistory = [
    { time: '12:00', temp: 24, humidity: 65, soilMoisture: 42 },
    { time: '11:00', temp: 23, humidity: 67, soilMoisture: 45 },
    { time: '10:00', temp: 22, humidity: 70, soilMoisture: 48 },
    { time: '09:00', temp: 21, humidity: 72, soilMoisture: 50 },
    { time: '08:00', temp: 20, humidity: 75, soilMoisture: 52 },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'low': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Gauge className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sensor Readings</h1>
            <p className="text-gray-500">Real-time environmental monitoring</p>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {sensors.map((sensor, index) => {
          const Icon = sensor.icon;
          return (
            <motion.div
              key={sensor.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${sensor.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${sensor.color}`} />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(sensor.status)}`}>
                  {sensor.status.toUpperCase()}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{sensor.name}</h3>
              <p className={`text-3xl font-bold ${getStatusColor(sensor.status)} mb-2`}>
                {sensor.value}
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    sensor.status === 'normal' ? 'bg-green-500' :
                    sensor.status === 'low' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.random() * 100}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Sensor History */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Sensor History</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-gray-600 font-semibold text-sm sm:text-base">Time</th>
                <th className="pb-3 text-gray-600 font-semibold text-sm sm:text-base">Temperature</th>
                <th className="pb-3 text-gray-600 font-semibold text-sm sm:text-base">Humidity</th>
                <th className="pb-3 text-gray-600 font-semibold text-sm sm:text-base">Soil Moisture</th>
              </tr>
            </thead>
            <tbody>
              {sensorHistory.map((reading, index) => (
                <motion.tr
                  key={reading.time}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 text-gray-800 font-medium text-sm sm:text-base">{reading.time}</td>
                  <td className="py-3 text-gray-600 text-sm sm:text-base">{reading.temp}°C</td>
                  <td className="py-3 text-gray-600 text-sm sm:text-base">{reading.humidity}%</td>
                  <td className="py-3 text-gray-600 text-sm sm:text-base">{reading.soilMoisture}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Refresh Readings
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
        >
          Export Data
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SensorReadings;