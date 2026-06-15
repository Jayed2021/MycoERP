import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { useRoute } from './hooks/useRoute';
import { Layout } from './components/Layout';
import { PageLoader } from './components/LoadingSpinner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BatchList from './pages/BatchList';
import BatchDetail from './pages/BatchDetail';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import SpeciesStrains from './pages/SpeciesStrains';
import Rooms from './pages/Rooms';
import ProcessTemplates from './pages/ProcessTemplates';
import ContaminationReports from './pages/ContaminationReports';
import Harvests from './pages/Harvests';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import UserManagement from './pages/Users';
import Permissions from './pages/Permissions';
import AppSettings from './pages/AppSettings';
import EnvironmentalLogs from './pages/EnvironmentalLogs';
import QrManager from './pages/QrManager';
import QrPrint from './pages/QrPrint';
import QrScanner from './pages/QrScanner';
import Devices from './pages/Devices';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { path, params } = useRoute();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  function renderPage() {
    // Batch detail: /batches/:id
    const batchDetailMatch = path.match(/^\/batches\/(.+)$/);
    if (batchDetailMatch) {
      return <BatchDetail batchId={batchDetailMatch[1]} />;
    }

    // Task detail: /tasks/:id
    const taskDetailMatch = path.match(/^\/tasks\/(.+)$/);
    if (taskDetailMatch) {
      return <TaskDetail taskId={taskDetailMatch[1]} />;
    }

    // QR print: /qr/:id/print
    const qrPrintMatch = path.match(/^\/qr\/(.+)\/print$/);
    if (qrPrintMatch) {
      return <QrPrint qrId={qrPrintMatch[1]} />;
    }

    switch (path) {
      case '/dashboard':
      case '/':
        return <Dashboard />;
      case '/batches':
        return <BatchList initialType={params.get('type') ?? ''} />;
      case '/tasks':
        return (
          <TaskList
            filter={params.get('filter') ?? ''}
            priority={params.get('priority') ?? ''}
            batchId={params.get('batch_id') ?? ''}
          />
        );
      case '/species':
        return <SpeciesStrains />;
      case '/rooms':
        return <Rooms />;
      case '/templates':
        return <ProcessTemplates />;
      case '/contamination':
        return <ContaminationReports batchId={params.get('batch_id') ?? undefined} />;
      case '/harvest':
        return <Harvests batchId={params.get('batch_id') ?? undefined} />;
      case '/inventory':
        return <Inventory />;
      case '/reports':
        return <Reports />;
      case '/users':
        return <UserManagement />;
      case '/permissions':
        return <Permissions />;
      case '/settings':
        return <AppSettings />;
      case '/env-logs':
        return <EnvironmentalLogs />;
      case '/scan':
        return (
          <QrScanner
            taskId={params.get('task_id') ?? undefined}
            required={params.get('required') ?? undefined}
            code={params.get('code') ?? undefined}
          />
        );
      case '/qr':
        return <QrManager />;
      case '/devices':
        return <Devices />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <Layout currentPath={path}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <AppRoutes />
      </PermissionsProvider>
    </AuthProvider>
  );
}
