import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Discover } from './pages/Discover';
import { JobDetail } from './pages/JobDetail';
import { JobForm } from './pages/JobForm';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/jobs/new" element={<JobForm mode="create" />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:id/edit" element={<JobForm mode="edit" />} />
        <Route path="*" element={<div>Not found</div>} />
      </Route>
    </Routes>
  );
}
