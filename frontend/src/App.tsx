import React from 'react';
import { LandingPage } from "./features/landing/components/LandingPage"
import { MaintenancePage } from "./features/maintenance/components/MaintenancePage"

function App() {
  // Leemos la variable de entorno de Vite
  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }

  return (
    <>
      <LandingPage />
    </>
  )
}

export default App;
