from pathlib import Path
ROOT = Path(r"C:/Users/User/sourceIQ")

def w(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print("wrote", rel)

# --- API ---
w("apps/api/src/store.ts", """import type { Candidate, Job } from '@sourceiq/shared';
import { v4 as uuid } from 'uuid';
export const jobs = new Map<string, Job>();
export const candidates = new Map<string, Candidate>();
export const createJobId = () => uuid();
export const createCandidateId = () => uuid();
""")

w("apps/api/src/services/jdParser.ts", """import type { ParsedJD } from '@sourceiq/shared';
const SKILLS = ['typescript','javascript','react','node','python','java','aws','kubernetes','docker','sql','postgresql','graphql','rest','agile','leadership'];
function extractSkills(text: string) {
  const lower = text.toLowerCase();
  return [...new Set(SKILLS.filter((s) => lower.includes(s)))];
}
export function parseJDFromText(rawText: string): ParsedJD {
  const lines = rawText.split('\\n').map((l) => l.trim()).filter(Boolean);
  const role = lines[0]?.slice(0, 120) ?? 'Open Role';
  const all = extractSkills(rawText);
  const mustHaveSkills = all.slice(0, Math.max(3, Math.ceil(all.length * 0.6)));
  const niceToHaveSkills = all.filter((s) => !mustHaveSkills.includes(s));
  return {
    role,
    level: /senior|staff|principal|junior|mid|lead/i.exec(rawText)?.[0],
    mustHaveSkills: mustHaveSkills.length ? mustHaveSkills : ['communication'],
    niceToHaveSkills,
    domain: /fintech|healthcare|saas|ai|ml/i.exec(rawText)?.[0],
    yearsExperience: { min: 3, max: 8 },
    location: ['Bangalore', 'Remote'],
    responsibilities: lines.slice(1, 6),
    rawText,
  };
}
""")

w("apps/api/src/services/mockSearch.ts", """import type { Candidate, GapItem, GapStatus, ParsedJD, ProfileSource, SearchConfig } from '@sourceiq/shared';
import { createCandidateId } from '../store.js';
const FIRST = ['Priya','Arjun','Meera','Rohan','Ananya'];
const LAST = ['Sharma','Patel','Iyer','Gupta','Reddy'];
const TITLES = ['Senior Engineer','Staff Engineer','Tech Lead'];
const COMPANIES = ['Razorpay','Flipkart','Swiggy','Freshworks','Zoho'];
const pick = <T,>(a: T[], i: number) => a[i % a.length];
function gaps(jd: ParsedJD, i: number): GapItem[] {
  return jd.mustHaveSkills.slice(0, 5).map((skill, j) => {
    let status: GapStatus = 'matched';
    if ((i + j) % 5 === 0) status = 'missing';
    else if ((i + j) % 3 === 0) status = 'partial';
    return { requirement: skill, status, evidence: status !== 'missing' ? 'Recent role' : undefined };
  });
}
function score(g: GapItem[]) {
  const m = g.filter((x) => x.status === 'matched').length;
  const p = g.filter((x) => x.status === 'partial').length;
  return Math.min(98, Math.max(55, Math.round(((m + p * 0.5) / g.length) * 100)));
}
export function generateMockCandidates(jobId: string, jd: ParsedJD, config: SearchConfig, count = 20): Candidate[] {
  const sources = config.sources.length ? config.sources : ['LINKEDIN','NAUKRI','GITHUB'] as ProfileSource[];
  const list: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const g = gaps(jd, i);
    const matchScore = score(g);
    const src = pick(sources, i);
    list.push({
      id: createCandidateId(), jobId,
      name: `${pick(FIRST,i)} ${pick(LAST,i+2)}`,
      title: pick(TITLES,i), company: pick(COMPANIES,i),
      location: pick(jd.location ?? ['Remote'], i),
      sources: [src], matchScore, percentile: Math.max(1, 100 - matchScore),
      topSkillsMatched: g.filter((x) => x.status === 'matched').map((x) => x.requirement).slice(0,3),
      keyGap: g.find((x) => x.status === 'missing')?.requirement,
      contactStatus: 'NEW', stage: 'SOURCED',
      recency: i % 3 === 0 ? 'high' : 'moderate', gaps: g,
      aiSummary: `Strong fit for ${jd.role} with relevant ${g[0]?.requirement ?? 'skills'}.`,
      careerTimeline: [{ role: pick(TITLES,i), company: pick(COMPANIES,i), tenure: '2y', domainRelevant: true }],
      scoreBreakdown: { skillMatch: 35, experienceDepth: 22, domainRelevance: 18, profileSignals: 9, activityRecency: 5 },
    });
  }
  return list.sort((a,b) => b.matchScore - a.matchScore);
}
""")

w("apps/api/src/ws/searchProgress.ts", """import type { WebSocket, WebSocketServer } from 'ws';
import type { Candidate, JobStats, ProfileSource } from '@sourceiq/shared';
const sockets = new Map<string, Set<WebSocket>>();
export function attachSearchProgress(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    const jobId = new URL(req.url ?? '/', 'http://x').searchParams.get('jobId');
    if (!jobId) return ws.close();
    if (!sockets.has(jobId)) sockets.set(jobId, new Set());
    sockets.get(jobId)!.add(ws);
    ws.on('close', () => sockets.get(jobId)?.delete(ws));
  });
}
type Ev = { type: 'source_progress'; source: ProfileSource; scanned: number; matched: number; status: string }
  | { type: 'candidate_scored'; candidate: Candidate }
  | { type: 'search_complete'; stats: JobStats };
export function emitSearchProgress(jobId: string, event: Ev) {
  const msg = JSON.stringify(event);
  for (const ws of sockets.get(jobId) ?? []) if (ws.readyState === 1) ws.send(msg);
}
""")

w("apps/api/src/routes/auth.ts", """import { Router } from 'express';
export const authRouter = Router();
authRouter.post('/login', (req, res) => {
  const email = (req.body as { email?: string }).email ?? 'recruiter@demo.com';
  const role = email.includes('admin') ? 'ADMIN' : email.includes('hiring') ? 'HIRING_MANAGER' : 'RECRUITER';
  res.json({ token: 'demo', user: { id: '1', name: email.split('@')[0], email, role } });
});
authRouter.get('/me', (_req, res) => res.json({ id: '1', name: 'Recruiter', email: 'recruiter@demo.com', role: 'RECRUITER' }));
""")

w("apps/api/src/routes/jd.ts", """import { Router } from 'express';
import multer from 'multer';
import { parseJDFromText } from '../services/jdParser.js';
const upload = multer({ storage: multer.memoryStorage() });
export const jdRouter = Router();
jdRouter.post('/parse', upload.single('file'), (req, res) => {
  let raw = (req.body as { text?: string }).text ?? '';
  const url = (req.body as { url?: string }).url;
  if (req.file) raw = req.file.buffer.toString('utf8');
  else if (url) raw = `Senior Engineer\\nTypeScript React Node\\n5+ years\\nRemote`;
  if (!raw.trim()) return res.status(400).json({ error: 'Need text, file, or url' });
  res.json({ parsed: parseJDFromText(raw) });
});
""")

w("apps/api/src/routes/jobs.ts", """import { Router } from 'express';
import type { Job, SearchConfig } from '@sourceiq/shared';
import { candidates, createJobId, jobs } from '../store.js';
import { generateMockCandidates } from '../services/mockSearch.js';
import { emitSearchProgress } from '../ws/searchProgress.js';
export const jobsRouter = Router();
const DEFAULT: SearchConfig = { sources: ['LINKEDIN','NAUKRI','GITHUB'], experienceRange: {min:2,max:10}, locations: ['Remote'], profilesPerSource: 200, scoreWeights: { skillMatch:40, experienceDepth:25, domainRelevance:20, profileSignals:10, activityRecency:5 } };
jobsRouter.get('/', (_req,res) => res.json({ jobs: [...jobs.values()] }));
jobsRouter.post('/', (req,res) => {
  const { parsedJd, searchConfig, title, company } = req.body;
  const id = createJobId();
  const job: Job = { id, title: title ?? parsedJd.role, company, status:'DRAFT', parsedJd, searchConfig: {...DEFAULT,...searchConfig}, stats:{scanned:0,matched:0,shortlisted:0,outreachSent:0,replies:0}, createdAt: new Date().toISOString() };
  jobs.set(id, job); res.status(201).json({ job });
});
jobsRouter.get('/:id', (req,res) => { const j = jobs.get(req.params.id); if(!j) return res.status(404).json({error:'Not found'}); res.json({job:j}); });
jobsRouter.post('/:id/search', (req,res) => { const j = jobs.get(req.params.id); if(!j) return res.status(404).json({error:'Not found'}); j.status='SEARCHING'; runSearch(j.id); res.json({ jobId: j.id }); });
jobsRouter.get('/:id/candidates', (req,res) => {
  let list = [...candidates.values()].filter(c => c.jobId === req.params.id);
  if (req.query.minScore) list = list.filter(c => c.matchScore >= Number(req.query.minScore));
  list.sort((a,b) => b.matchScore - a.matchScore);
  res.json({ candidates: list, total: list.length });
});
async function runSearch(jobId: string) {
  const job = jobs.get(jobId); if (!job) return;
  for (const s of job.searchConfig.sources) {
    emitSearchProgress(jobId, { type:'source_progress', source:s, scanned:0, matched:0, status:'running' });
    await new Promise(r => setTimeout(r, 300));
    emitSearchProgress(jobId, { type:'source_progress', source:s, scanned:80, matched:12, status:'done' });
  }
  const gen = generateMockCandidates(jobId, job.parsedJd, job.searchConfig);
  for (const c of gen) { candidates.set(c.id, c); emitSearchProgress(jobId, { type:'candidate_scored', candidate: c }); await new Promise(r => setTimeout(r, 60)); }
  job.status='ACTIVE'; job.stats={ scanned: job.searchConfig.sources.length*80, matched: gen.length, shortlisted: gen.filter(c=>c.matchScore>=80).length, outreachSent:0, replies:0 };
  jobs.set(jobId, job);
  emitSearchProgress(jobId, { type:'search_complete', stats: job.stats });
}
""")

w("apps/api/src/routes/candidates.ts", """import { Router } from 'express';
import type { PipelineStage } from '@sourceiq/shared';
import { candidates } from '../store.js';
export const candidatesRouter = Router();
candidatesRouter.get('/:id', (req,res) => { const c = candidates.get(req.params.id); if(!c) return res.status(404).json({error:'Not found'}); res.json({candidate:c}); });
candidatesRouter.patch('/:id/stage', (req,res) => {
  const c = candidates.get(req.params.id); if(!c) return res.status(404).json({error:'Not found'});
  c.stage = (req.body as {stage: PipelineStage}).stage; candidates.set(c.id,c); res.json({candidate:c});
});
""")

w("apps/api/src/routes/outreach.ts", """import { Router } from 'express';
import { candidates, jobs } from '../store.js';
export const outreachRouter = Router();
outreachRouter.post('/draft', (req,res) => {
  const { candidateId, jobId } = req.body;
  const c = candidates.get(candidateId); const j = jobs.get(jobId);
  if(!c||!j) return res.status(404).json({error:'Not found'});
  res.json({ draft: { candidateId, channel:'EMAIL', tone:'conversational', message: `Hi ${c.name.split(' ')[0]}, your ${c.topSkillsMatched[0]} background fits our ${j.parsedJd.role} role.` } });
});
outreachRouter.post('/send', (req,res) => {
  const { candidateId, jobId } = req.body;
  const c = candidates.get(candidateId); const j = jobs.get(jobId);
  if(!c||!j) return res.status(404).json({error:'Not found'});
  c.contactStatus='CONTACTED'; c.stage='CONTACTED'; j.stats.outreachSent++; res.json({ ok:true });
});
outreachRouter.post('/bulk', (req,res) => {
  const { candidateIds, jobId } = req.body;
  res.json({ drafts: candidateIds.map((id:string) => ({ candidateId:id, channel:'EMAIL', message:'Hello — great fit for our role.' })) });
});
""")

w("apps/api/src/app.ts", """import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { jdRouter } from './routes/jd.js';
import { jobsRouter } from './routes/jobs.js';
import { candidatesRouter } from './routes/candidates.js';
import { outreachRouter } from './routes/outreach.js';
export function createApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '4mb' }));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/jd', jdRouter);
  app.use('/api/v1/jobs', jobsRouter);
  app.use('/api/v1/candidates', candidatesRouter);
  app.use('/api/v1/outreach', outreachRouter);
  app.get('/health', (_req,res) => res.json({ ok: true, product: 'sourceIQ' }));
  return app;
}
""")

w("apps/api/src/index.ts", """import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './app.js';
import { attachSearchProgress } from './ws/searchProgress.js';
const PORT = Number(process.env.PORT ?? 3333);
const app = createApp();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
attachSearchProgress(wss);
server.listen(PORT, () => console.log('sourceIQ API on', PORT));
""")

w("apps/web/src/styles/index.css", """@tailwind base;
@tailwind components;
@tailwind utilities;
:root { --ocean:#185FA5; --emerald:#1D9E75; --ink:#1A1A2E; --border:#e8e6e0; }
body { @apply font-sans antialiased bg-white text-[#2C2C2A]; }
.card { @apply rounded-xl border border-[var(--border)] bg-white shadow-sm; }
.btn-primary { @apply px-4 py-2 rounded-lg font-medium text-white; background: var(--ocean); }
.btn-secondary { @apply px-4 py-2 rounded-lg border border-[var(--border)]; }
""")

w("apps/web/src/lib/api.ts", """export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('sourceiq_token');
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}), ...init?.headers } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const token = localStorage.getItem('sourceiq_token');
  const res = await fetch(path, { method:'POST', body: form, headers: token?{Authorization:`Bearer ${token}`}:{} });
  if (!res.ok) throw new Error('upload failed');
  return res.json();
}
""")

w("apps/web/src/lib/auth.tsx", """import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserRole } from '@sourceiq/shared';
import { api } from './api';
type User = { id: string; name: string; email: string; role: UserRole };
const Ctx = createContext<{user:User|null;login:(e:string)=>Promise<void>;logout:()=>void}|null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User|null>(null);
  useEffect(() => { if (localStorage.getItem('sourceiq_token')) api<User>('/api/v1/auth/me').then(setUser).catch(()=>{}); }, []);
  async function login(email: string) {
    const r = await api<{token:string;user:User}>('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email})});
    localStorage.setItem('sourceiq_token', r.token); setUser(r.user);
  }
  function logout() { localStorage.removeItem('sourceiq_token'); setUser(null); }
  return <Ctx.Provider value={{user,login,logout}}>{children}</Ctx.Provider>;
}
export function useAuth() { const c = useContext(Ctx); if(!c) throw new Error('auth'); return c; }
""")

w("apps/web/src/main.tsx", """import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import './styles/index.css';
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></StrictMode>);
""")

w("apps/web/vite.config.ts", """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 2222, proxy: { '/api': 'http://localhost:3333', '/ws': { target: 'ws://localhost:3333', ws: true } } },
});
""")

w("apps/web/index.html", """<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>sourceIQ</title></head><body><motion.div id="root"></motion.div><script type="module" src="/src/main.tsx"></script></body></html>""".replace('motion.div','div'))

w("apps/web/src/App.tsx", """import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import JobsDashboard from './pages/JobsDashboard';
import JobSetup from './pages/JobSetup';
import LiveDiscovery from './pages/LiveDiscovery';
import RankedList from './pages/RankedList';
import CandidateProfile from './pages/CandidateProfile';
import PipelineKanban from './pages/PipelineKanban';
function Private({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Layout /></Private>}>
        <Route index element={<Navigate to="/jobs" />} />
        <Route path="jobs" element={<JobsDashboard />} />
        <Route path="jobs/new" element={<JobSetup />} />
        <Route path="jobs/:jobId/setup" element={<JobSetup />} />
        <Route path="jobs/:jobId/discover" element={<LiveDiscovery />} />
        <Route path="jobs/:jobId/candidates" element={<RankedList />} />
        <Route path="jobs/:jobId/candidates/:candidateId" element={<CandidateProfile />} />
        <Route path="pipeline" element={<PipelineKanban />} />
      </Route>
    </Routes>
  );
}
""")

w("apps/web/src/components/Layout.tsx", """import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
export function Layout() {
  const { user, logout } = useAuth();
  const path = useLocation().pathname;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#1A1A2E] text-white px-6 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">source<span className="text-[#1D9E75]">IQ</span></Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/jobs" className={path.startsWith('/jobs')?'text-[#1D9E75]':'text-gray-300'}>Jobs</Link>
          <Link to="/pipeline" className={path==='/pipeline'?'text-[#1D9E75]':'text-gray-300'}>Pipeline</Link>
        </nav>
        <button type="button" onClick={logout} className="text-sm text-[#D85A30]">Log out ({user?.name})</button>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full"><Outlet /></main>
    </motion.div>
  );
}
""".replace('motion.div','motion.div').replace('</motion.div>','</div>').replace('<motion.div','<div'))

w("apps/web/src/components/MatchBadge.tsx", """export function MatchBadge({ score }: { score: number }) {
  const cls = score>=90?'bg-[#1D9E75] text-white': score>=70?'bg-[#185FA5] text-white': score>=60?'bg-[#EF9F27] text-white':'bg-gray-300';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{score}</span>;
}
""")

w("apps/web/src/components/SourceDot.tsx", """import type { ProfileSource } from '@sourceiq/shared';
import { SOURCE_COLORS } from '@sourceiq/shared';
export function SourceDots({ sources }: { sources: ProfileSource[] }) {
  return <span className="inline-flex gap-1">{sources.map(s => <span key={s} className="w-2 h-2 rounded-full" style={{background:SOURCE_COLORS[s]}} title={s} />)}</span>;
}
""")

w("apps/web/src/pages/Login.tsx", """import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('recruiter@agency.com');
  if (user) return <Navigate to="/jobs" />;
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A2E]">
      <form className="card p-8 w-full max-w-md space-y-4" onSubmit={async e => { e.preventDefault(); await login(email); }}>
        <h1 className="text-2xl font-bold">source<span className="text-[#1D9E75]">IQ</span></h1>
        <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="btn-primary w-full" type="submit">Sign in</button>
      </form>
    </motion.div>
  );
}
""".replace('motion.div','div'))

w("apps/web/src/pages/JobsDashboard.tsx", '''
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Job } from "@sourceiq/shared";
import { api } from "../lib/api";
export default function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => { api<{jobs: Job[]}>("/api/v1/jobs").then((r) => setJobs(r.jobs)); }, []);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Active jobs</h1>
        <Link to="/jobs/new" className="btn-primary">+ New job</Link>
      </div>
      {jobs.length === 0 ? (
        <div className="card p-8 text-center text-gray-600">
          <p>No jobs yet.</p>
          <Link to="/jobs/new" className="btn-primary inline-block mt-4">Create first job</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {jobs.map((j) => (
            <Link key={j.id} to={`/jobs/${j.id}/candidates`} className="card p-5 block hover:border-[#185FA5]">
              <h2 className="font-semibold">{j.title}</h2>
              <p className="text-sm text-gray-500">{j.status} · {j.stats.matched} matched · {j.stats.outreachSent} outreach</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
'''.replace("div", "div").replace("<div", "<div").replace("</div>", "</div>"))


w("apps/web/src/pages/JobSetup.tsx", '''
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ParsedJD, ProfileSource } from "@sourceiq/shared";
import { api, apiForm } from "../lib/api";
const SOURCES: ProfileSource[] = ["LINKEDIN","NAUKRI","INDEED","GITHUB"];
export default function JobSetup() {
  const nav = useNavigate();
  const [text, setText] = useState("Senior Engineer\\nTypeScript React Node AWS\\n5+ years Bangalore");
  const [parsed, setParsed] = useState<ParsedJD | null>(null);
  const [sources, setSources] = useState<ProfileSource[]>(SOURCES);
  const [loading, setLoading] = useState(false);
  async function parse() {
    setLoading(true);
    const r = await api<{parsed: ParsedJD}>("/api/v1/jd/parse", { method:"POST", body: JSON.stringify({ text }) });
    setParsed(r.parsed); setLoading(false);
  }
  async function run() {
    if (!parsed) return;
    setLoading(true);
    const { job } = await api<{job:{id:string}}>("/api/v1/jobs", { method:"POST", body: JSON.stringify({ parsedJd: parsed, searchConfig: { sources, experienceRange:{min:2,max:10}, locations:["Remote"], profilesPerSource:200, scoreWeights:{skillMatch:40,experienceDepth:25,domainRelevance:20,profileSignals:10,activityRecency:5} } }) });
    await api(`/api/v1/jobs/${job.id}/search`, { method:"POST" });
    setLoading(false); nav(`/jobs/${job.id}/discover`);
  }
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">JD setup</h1>
      <textarea className="w-full h-40 border rounded p-3" value={text} onChange={(e)=>setText(e.target.value)} />
      <button type="button" className="btn-secondary" disabled={loading} onClick={parse}>Parse JD</button>
      {parsed && (
        <>
          <div className="card p-4"><p className="font-medium">{parsed.role}</p><p className="text-sm">Must: {parsed.mustHaveSkills.join(", ")}</p></div>
          <div className="flex flex-wrap gap-2">{SOURCES.map(s => (
            <button key={s} type="button" onClick={() => setSources(prev => prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}
              className={`px-3 py-1 rounded-full text-sm border ${sources.includes(s)?"bg-blue-100 border-blue-600":""}`}>{s}</button>
          ))}</div>
          <button type="button" className="btn-primary" disabled={loading} onClick={run}>Run search</button>
        </>
      )}
    </div>
  );
}
''')

w("apps/web/src/pages/LiveDiscovery.tsx", '''
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Candidate, ProfileSource } from "@sourceiq/shared";
import { MatchBadge } from "../components/MatchBadge";
export default function LiveDiscovery() {
  const { jobId } = useParams();
  const nav = useNavigate();
  const [feed, setFeed] = useState<Candidate[]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws?jobId=${jobId}`);
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.type === "candidate_scored") setFeed((p) => [d.candidate, ...p].slice(0, 10));
      if (d.type === "search_complete") setDone(true);
    };
    return () => ws.close();
  }, [jobId]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Live discovery</h1>
      {done && <button type="button" className="btn-primary" onClick={() => nav(`/jobs/${jobId}/candidates`)}>View ranked list</button>}
      <ul className="space-y-2">{feed.map(c => (
        <li key={c.id} className="card p-3 flex gap-3 items-center">
          <MatchBadge score={c.matchScore} />
          <Link to={`/jobs/${jobId}/candidates/${c.id}`} className="text-[#185FA5] font-medium">{c.name}</Link>
          <span className="text-sm text-gray-500">{c.title}</span>
        </li>
      ))}</ul>
    </div>
  );
}
''')

w("apps/web/src/pages/RankedList.tsx", '''
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Candidate } from "@sourceiq/shared";
import { api } from "../lib/api";
import { MatchBadge } from "../components/MatchBadge";
import { SourceDots } from "../components/SourceDot";
export default function RankedList() {
  const { jobId } = useParams();
  const [list, setList] = useState<Candidate[]>([]);
  useEffect(() => { api<{candidates: Candidate[]}>(`/api/v1/jobs/${jobId}/candidates?minScore=60`).then(r => setList(r.candidates)); }, [jobId]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ranked candidates</h1>
      <div className="card overflow-auto"><table className="w-full text-sm"><thead><tr className="bg-[#1A1A2E] text-white"><th className="p-2">#</th><th>Name</th><th>Score</th><th>Gap</th></tr></thead><tbody>
        {list.map((c,i) => (<tr key={c.id} className="border-t"><td className="p-2">{i+1}</td><td className="p-2"><Link className="text-[#185FA5]" to={`/jobs/${jobId}/candidates/${c.id}`}>{c.name}</Link><SourceDots sources={c.sources} /></td><td className="p-2"><MatchBadge score={c.matchScore} /></td><td className="p-2 text-[#D85A30]">{c.keyGap ?? "-"}</td></tr>))}
      </tbody></table></div>
    </div>
  );
}
''')

w("apps/web/src/pages/CandidateProfile.tsx", '''
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Candidate } from "@sourceiq/shared";
import { api } from "../lib/api";
import { MatchBadge } from "../components/MatchBadge";
export default function CandidateProfile() {
  const { jobId, candidateId } = useParams();
  const [c, setC] = useState<Candidate | null>(null);
  useEffect(() => { api<{candidate: Candidate}>(`/api/v1/candidates/${candidateId}`).then(r => setC(r.candidate)); }, [candidateId]);
  if (!c) return <p>Loading...</p>;
  return (
    <div className="space-y-4">
      <Link to={`/jobs/${jobId}/candidates`} className="text-[#185FA5] text-sm">Back</Link>
      <div className="card p-6 flex justify-between"><div><h1 className="text-2xl font-bold">{c.name}</h1><p>{c.title} @ {c.company}</p></div><MatchBadge score={c.matchScore} /></div>
      <div className="card p-4 bg-purple-50"><h2 className="font-semibold text-[#7F77DD]">AI summary</h2><p className="text-sm mt-2">{c.aiSummary}</p></div>
    </div>
  );
}
''')

w("apps/web/src/pages/PipelineKanban.tsx", '''
import { useEffect, useState } from "react";
import type { Candidate, PipelineStage } from "@sourceiq/shared";
import { api } from "../lib/api";
const STAGES: PipelineStage[] = ["SOURCED","CONTACTED","REPLIED","SCREENING","SHORTLISTED","HIRED","REJECTED"];
export default function PipelineKanban() {
  const [all, setAll] = useState<Candidate[]>([]);
  useEffect(() => {
    api<{jobs:{id:string}[]}>("/api/v1/jobs").then(async r => {
      const c: Candidate[] = [];
      for (const j of r.jobs) { const x = await api<{candidates: Candidate[]}>(`/api/v1/jobs/${j.id}/candidates`); c.push(...x.candidates); }
      setAll(c);
    });
  }, []);
  return (
    <div className="space-y-4"><h1 className="text-2xl font-bold">Pipeline</h1>
      <div className="flex gap-3 overflow-x-auto">{STAGES.map(s => (
        <div key={s} className="min-w-[180px] card p-2"><h3 className="text-xs font-bold mb-2">{s}</h3>
          {all.filter(c=>c.stage===s).map(c => <div key={c.id} className="text-sm p-2 border rounded mb-1">{c.name}</div>)}
        </div>
      ))}</div>
    </div>
  );
}
''')

