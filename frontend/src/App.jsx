import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RoadsPage from './pages/RoadsPage';
import SensorsPage from './pages/SensorsPage';
import RegistryPage from './pages/RegistryPage';
import SimulationPage from './pages/SimulationPage';
import ConsensusTestPage from './pages/ConsensusTestPage';
import SecurityPage from './pages/SecurityPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/consensus" element={<ConsensusTestPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/roads/*" element={<RoadsPage />} />
        <Route path="/sensors/*" element={<SensorsPage />} />
        <Route path="/registry/*" element={<RegistryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
