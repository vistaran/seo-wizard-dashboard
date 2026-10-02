import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Issues from './pages/Issues';
import Performance from './pages/Performance';
import Content from './pages/Content';
import Authority from './pages/Authority';
import Technical from './pages/Technical';
import Notes from './pages/Notes';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/content" element={<Content />} />
        <Route path="/authority" element={<Authority />} />
        <Route path="/technical" element={<Technical />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
