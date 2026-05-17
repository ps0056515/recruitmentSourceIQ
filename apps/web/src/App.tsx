import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth, useAuth } from "./lib/auth";
import { CandidateProfile } from "./pages/CandidateProfile";
import { JobSetup } from "./pages/JobSetup";
import { JobsDashboard } from "./pages/JobsDashboard";
import { LiveDiscovery } from "./pages/LiveDiscovery";
import { Login } from "./pages/Login";
import { OutreachComposer } from "./pages/OutreachComposer";
import { PipelineKanban } from "./pages/PipelineKanban";
import { RankedList } from "./pages/RankedList";
import { Analytics } from "./pages/Analytics";
import { Inbox } from "./pages/Inbox";
import { ShareView } from "./pages/ShareView";

function Shell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/share/:token" element={<ShareView />} />
      <Route path="/" element={user ? <Navigate to="/jobs" replace /> : <Navigate to="/login" replace />} />

      <Route path="/jobs" element={<Shell><JobsDashboard /></Shell>} />
      <Route path="/jobs/:jobId/setup" element={<Shell><JobSetup /></Shell>} />
      <Route path="/jobs/:jobId/discover" element={<Shell><LiveDiscovery /></Shell>} />
      <Route path="/jobs/:jobId/ranked" element={<Shell><RankedList /></Shell>} />
      <Route path="/candidates/:candidateId" element={<Shell><CandidateProfile /></Shell>} />
      <Route path="/jobs/:jobId/outreach" element={<Shell><OutreachComposer /></Shell>} />
      <Route path="/jobs/:jobId/pipeline" element={<Shell><PipelineKanban /></Shell>} />
      <Route path="/inbox" element={<Shell><Inbox /></Shell>} />
      <Route path="/analytics" element={<Shell><Analytics /></Shell>} />
      <Route path="/jobs/:jobId/analytics" element={<Shell><Analytics /></Shell>} />

      <Route path="*" element={<Navigate to="/jobs" replace />} />
    </Routes>
  );
}
