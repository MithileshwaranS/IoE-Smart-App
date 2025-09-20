import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import CropPrediction from './pages/CropPrediction';
import CropDiseasePrediction from './pages/CropDiseasePrediction';
import SensorReadings from './pages/SensorReadings';
import WaterLevel from './pages/WaterLevel';
import WaterControl from './pages/WaterControl';

function App() {
  return (
    <Router>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/crop-prediction" element={<CropPrediction />} />
            <Route path="/crop-disease-prediction" element={<CropDiseasePrediction />} />
            <Route path="/sensor-readings" element={<SensorReadings />} />
            <Route path="/water-level" element={<WaterLevel />} />
            <Route path="/water-control" element={<WaterControl />} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </Router>
  );
}

export default App;