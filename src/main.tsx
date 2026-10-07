import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness,
  Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck,
  FileCheck2, FileText, FolderOpen, LayoutDashboard, LoaderCircle, Plus, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, Target, Trash2, UploadCloud, Users, X,
} from 'lucide-react'
import './styles.css'

type Job = {
  id: number; title: string; department: string; description: string;
  skills: string[]; min_years: number; skill_weight: number;
}
type Status = 'pending' | 'shortlisted' | 'hold' | 'not_fit'
type Candidate = {
  id: number; job_id: number; name: string; email: string; filename: string;
  text: string; status: Status; notes: string; created_at: string;
  assessment: {
    score: number; skill_score: number; experience_score: number; matched_skills: number;
    total_skills: number; years: number | null; experience_evidence: string[]; warnings: string[];
    skills: { skill: string; matched: boolean; evidence: string[] }[];
  };
}
const statuses: Record<Status, string> = {
  pending: 'Chưa xem xét', shortlisted: 'Phù hợp', hold: 'Cần trao đổi', not_fit: 'Chưa phù hợp',
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options)
  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status}).`
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await response.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = 'Dữ liệu chưa hợp lệ. Kiểm tra các trường và giới hạn đã hướng dẫn.'
    }
    throw new Error(message)
  }
  return response.status === 204 ? undefined as T : response.json()
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.'
const scoreClass = (score: number) => score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'
const initials = (name: string) => name.split(' ').filter(Boolean).slice(-2).map(word => word[0]).join('').toUpperCase()

function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState<number | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState<'dashboard' | 'jobs' | 'help'>('dashboard')
  const [showJob, setShowJob] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const requestVersion = useRef(0)
  const job = jobs.find(item => item.id === jobId)

  useEffect(() => {
    let active = true
    api<Job[]>('/jobs').then(data => {
      if (!active) return
      setJobs(data)
      setJobId(data[0]?.id ?? null)
      if (!data.length) setLoading(false)
    }).catch(err => { if (active) { setError(errorMessage(err)); setLoading(false) } })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (jobId === null) return
    const version = ++requestVersion.current
    setLoading(true)
    setCandidates([])
    setQuery('')
    setFilter('all')
    api<Candidate[]>(`/jobs/${jobId}/candidates`).then(data => {
      if (version === requestVersion.current) setCandidates(data)
    }).catch(err => {
      if (version === requestVersion.current) setError(errorMessage(err))
    }).finally(() => {
      if (version === requestVersion.current) setLoading(false)
    })
    return () => { requestVersion.current++ }
  }, [jobId])

  const filtered = candidates.filter(candidate =>
    `${candidate.name} ${candidate.email}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) &&
    (filter === 'all' || candidate.status === filter),
  ).sort((a, b) => sort === 'score' ? b.assessment.score - a.assessment.score : b.id - a.id)
  const average = candidates.length ? Math.round(candidates.reduce((sum, c) => sum + c.assessment.score, 0) / candidates.length) : 0
  const good = candidates.filter(c => c.assessment.score >= 80).length
  const reviewed = candidates.filter(c => c.status !== 'pending').length

  function exportCsv() {
    const rows = [
      ['Ứng viên', 'Email', 'Vị trí', 'Điểm đối sánh', 'Kỹ năng khớp', 'Kinh nghiệm khai báo', 'Trạng thái', 'Ghi chú'],
      ...filtered.map(c => [c.name, c.email, job?.title ?? '', c.assessment.score,
        `${c.assessment.matched_skills}/${c.assessment.total_skills}`, c.assessment.years ?? 'Chưa xác định',
        statuses[c.status], c.notes]),
    ]
    const csv = '\uFEFF' + rows.map(row => row.map(value => {
      let text = String(value)
      if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`
      return `"${text.replaceAll('"', '""')}"`
    }).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `talentlens-jd-${jobId}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="app">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('dashboard') }}>
        <span className="brand-icon"><ScanLogo /></span><span>talent<span className="brand-light">lens</span><small>RECRUITMENT WORKSPACE</small></span>
      </a>
      <div className="workspace"><span className="workspace-avatar">W</span><div>Không gian tuyển dụng<small>Local workspace</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}><LayoutDashboard size={19} />Đánh giá CV<span className="nav-dot" /></button>
        <button className={page === 'jobs' ? 'active' : ''} onClick={() => setPage('jobs')}><BriefcaseBusiness size={19} />Vị trí tuyển dụng<span className="nav-count">{jobs.length}</span></button>
        <button className={page === 'help' ? 'active' : ''} onClick={() => setPage('help')}><CircleHelp size={19} />Hướng dẫn sử dụng</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-card"><ShieldCheck size={23} /><strong>Dữ liệu của bạn, ở lại với bạn.</strong><p>Phân tích nội bộ. Không gửi CV đến dịch vụ AI bên ngoài.</p><span><span className="online-dot" /> Chế độ local</span></div>
        <div className="profile"><span className="profile-avatar">HR</span><div>Nhà tuyển dụng<small>Phiên làm việc nội bộ</small></div></div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div>Workspace <ChevronRight size={14} /><strong>{page === 'dashboard' ? 'Đánh giá CV' : page === 'jobs' ? 'Vị trí tuyển dụng' : 'Hướng dẫn'}</strong></div><div><span className="local-pill"><span className="online-dot" /> Local workspace</span><button className="icon-button" aria-label="Xem thông báo" onClick={() => setNotice('Mọi CV đều cần nhà tuyển dụng kiểm tra bằng chứng trước khi đưa ra quyết định.')}><Bell size={19} /></button><span className="top-avatar">HR</span></div></header>
      <main>
        {(error || notice) && <div role={error ? 'alert' : 'status'} className={`notification ${error ? 'error' : ''}`}><span>{error || notice}</span><button aria-label="Đóng thông báo" onClick={() => { setError(''); setNotice('') }}><X size={17} /></button></div>}
        <div className="page-heading"><div><div className="eyebrow"><span /> HIRING, WITH CLARITY</div><h1>{page === 'dashboard' ? 'Tìm đúng người. Bắt đầu từ CV.' : page === 'jobs' ? 'Vị trí tuyển dụng' : 'Tuyển dụng với đầy đủ bằng chứng.'}</h1><p>{page === 'dashboard' ? 'Biến những hồ sơ thành góc nhìn rõ ràng cho quyết định tuyển dụng của bạn.' : page === 'jobs' ? 'Thiết lập tiêu chí nhất quán cho từng vị trí trong đội ngũ.' : 'Hiểu cách TalentLens đánh giá và bảo vệ dữ liệu ứng viên.'}</p></div><button className="button primary" onClick={() => setShowJob(true)}><Plus size={17} />Tạo vị trí mới</button></div>

        {page === 'help' ? <Help /> : page === 'jobs' ? <div className="job-grid">{jobs.map(item => <section className="panel job-tile" key={item.id}><div className="job-icon"><BriefcaseBusiness size={23} /></div><span className="department">{item.department}</span><h2>{item.title}</h2><p>{item.description}</p><div className="tags">{item.skills.map(skill => <span key={skill}>{skill}</span>)}</div><p>{item.min_years}+ năm kinh nghiệm · Kỹ năng {item.skill_weight}%</p><button className="button secondary" onClick={() => { setJobId(item.id); setPage('dashboard') }}>Đánh giá ứng viên <ArrowRight size={16} /></button></section>)}</div> : <>
          <section className="panel position-panel">
            <div className="job-icon"><BriefcaseBusiness size={23} /></div>
            <div className="position-info"><span className="section-overline">VỊ TRÍ ĐANG ĐÁNH GIÁ</span><label className="sr-only" htmlFor="job-select">Chọn JD</label><div className="job-select-wrap"><select id="job-select" value={jobId ?? ''} onChange={e => setJobId(Number(e.target.value))}>{!jobs.length && <option value="">Chưa có JD</option>}{jobs.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select><ChevronDown size={17} /></div><div className="position-meta"><span>{job?.department ?? 'Chọn vị trí để bắt đầu'}</span><span className="meta-dot">·</span><span>{job?.min_years ?? 0}+ năm kinh nghiệm</span><span className="meta-dot">·</span><span>{job?.skills.length ?? 0} tiêu chí kỹ năng</span></div></div>
            <button className="button text-button" onClick={() => setPage('jobs')}>Xem JD <ArrowUpRight size={16} /></button>
            <div className="position-divider" />
            <button className="button primary" disabled={!job || loading} onClick={() => setShowUpload(true)}><UploadCloud size={18} />Tải CV lên</button>
          </section>

          <div className="stats-grid">
            <Stat icon={<Users size={20} />} title="Tổng hồ sơ" value={candidates.length} caption="Ứng viên cho vị trí này" color="blue" />
            <Stat icon={<Target size={20} />} title="Đối sánh từ 80 điểm" value={good} caption="Cần xác minh bằng chứng" color="green" />
            <Stat icon={<BarChart3 size={20} />} title="Điểm đối sánh trung bình" value={average} suffix="/ 100" caption="Theo tiêu chí trong JD" color="purple" />
            <Stat icon={<ClipboardCheck size={20} />} title="Đã xem xét" value={reviewed} suffix={`/ ${candidates.length}`} caption="Được nhà tuyển dụng cập nhật" color="orange" />
          </div>

          <div className="content-grid">
            <section className="panel candidates-panel">
              <div className="panel-heading"><div><h2>Hồ sơ ứng viên <span className="count-badge">{candidates.length}</span></h2><p>Mỗi hồ sơ, một góc nhìn. Mọi đánh giá, có bằng chứng.</p></div><button className="button secondary small" disabled={!filtered.length} onClick={exportCsv}><ArrowDownToLine size={15} />Xuất CSV</button></div>
              <div className="table-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Tìm ứng viên" placeholder="Tìm theo tên hoặc email..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filter-select"><SlidersHorizontal size={15} /><select aria-label="Lọc trạng thái" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div></div>
              <div className="table-scroll"><table><thead><tr><th>ỨNG VIÊN</th><th>ĐỐI SÁNH JD</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>{filtered.map((candidate, index) => <tr key={candidate.id} onClick={() => setSelected(candidate)}><td><div className="candidate-cell"><span className={`candidate-avatar avatar-${index % 4}`}>{initials(candidate.name)}</span><div><button className="candidate-name" onClick={e => { e.stopPropagation(); setSelected(candidate) }}>{candidate.name}</button><small>{candidate.email || candidate.filename}</small></div></div></td><td><div className={`score-cell ${scoreClass(candidate.assessment.score)}`}><strong>{candidate.assessment.score}<small>/100</small></strong><div className="score-track"><span style={{ width: `${candidate.assessment.score}%` }} /></div></div></td><td><span className={`status ${candidate.status}`}><span />{statuses[candidate.status]}</span></td><td><ChevronRight size={17} className="muted" /></td></tr>)}</tbody></table></div>
              {loading ? <div className="empty-state"><LoaderCircle className="spin" size={30} /><h3>Đang tải hồ sơ...</h3></div> : !filtered.length ? <div className="empty-state"><div className="empty-illustration"><FileText size={36} /><span><Plus size={13} /></span></div><h3>{candidates.length ? 'Không tìm thấy hồ sơ phù hợp' : 'Ứng viên tiếp theo đang chờ bạn'}</h3><p>{candidates.length ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Tải CV đầu tiên để khám phá mức độ phù hợp với vị trí.'}</p>{!candidates.length && <button className="button secondary" disabled={!job} onClick={() => setShowUpload(true)}><Plus size={16} />Thêm hồ sơ đầu tiên</button>}</div> : null}
              <div className="table-footer"><span>Hiển thị {filtered.length} / {candidates.length} hồ sơ</span><select aria-label="Sắp xếp hồ sơ" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Mới nhất trước</option><option value="score">Điểm cao nhất trước</option></select></div>
            </section>

            <aside className="insights">
              <section className="panel overview-panel"><div className="panel-heading"><h2>Tổng quan đối sánh</h2><BarChart3 size={17} className="muted" /></div><div className="donut" style={{ background: candidates.length ? `conic-gradient(#188976 0 ${good / candidates.length * 100}%, #e9eeed ${good / candidates.length * 100}% 100%)` : '#e9eeed' }}><div><strong>{candidates.length ? Math.round(good / candidates.length * 100) : 0}<span>%</span></strong><small>đạt từ 80 điểm</small></div></div><div className="legend">{[[80, '80–100 điểm', '#188976'], [50, '50–79 điểm', '#e7b563'], [0, 'Dưới 50 điểm', '#b4bdc8']].map(([threshold, label, color], index) => <div key={label}><span><i style={{ background: String(color) }} />{label}</span><strong>{candidates.filter(c => index === 0 ? c.assessment.score >= 80 : index === 1 ? c.assessment.score >= 50 && c.assessment.score < 80 : c.assessment.score < Number(threshold) + 50).length}</strong></div>)}</div></section>
              <section className="method-card"><span className="method-icon"><Sparkles size={21} /></span><h3>Rõ tiêu chí.<br />Minh bạch kết quả.</h3><p>Đối sánh kỹ năng và kinh nghiệm với JD. Bạn luôn có thể xem bằng chứng từ CV gốc.</p><div><ShieldCheck size={15} /> Không dùng tuổi, giới tính hay ảnh</div><button onClick={() => setPage('help')}>Tìm hiểu cách đánh giá <ArrowRight size={15} /></button></section>
            </aside>
          </div>
          <section className="workflow-strip"><div><span className="workflow-number">01</span><div><strong>Chọn vị trí</strong><small>Xác định tiêu chí từ JD</small></div></div><ChevronRight size={17} /><div><span className="workflow-number">02</span><div><strong>Thêm hồ sơ</strong><small>PDF, DOCX hoặc TXT</small></div></div><ChevronRight size={17} /><div><span className="workflow-number">03</span><div><strong>Xem xét bằng chứng</strong><small>Đưa ra quyết định của bạn</small></div></div><FileCheck2 size={28} className="workflow-end" /></section>
        </>}
        <footer className="footer"><span>TalentLens <span>·</span> A clearer view of talent.</span><span><ShieldCheck size={13} /> Điểm đối sánh chỉ hỗ trợ, không thay thế đánh giá của con người.</span></footer>
      </main>
    </div>
    {showJob && <JobModal onClose={() => setShowJob(false)} onCreated={newJob => { setJobs(current => [newJob, ...current]); setJobId(newJob.id); setPage('dashboard'); setShowJob(false); setNotice('Đã tạo vị trí mới. Bạn có thể tải CV để đánh giá.'); }} />}
    {showUpload && job && <UploadModal job={job} onClose={() => setShowUpload(false)} onUploaded={candidate => setCandidates(current => [candidate, ...current])} />}
    {selected && job && <ReviewModal key={selected.id} candidate={selected} job={job} onClose={() => setSelected(null)} onSaved={candidate => { setCandidates(current => current.map(item => item.id === candidate.id ? candidate : item)); setSelected(candidate); setNotice('Đã lưu đánh giá của nhà tuyển dụng.'); }} onDeleted={id => { setCandidates(current => current.filter(item => item.id !== id)); setSelected(null); setNotice('Đã xóa CV và nội dung đánh giá khỏi cơ sở dữ liệu.'); }} />}
  </div>
}

function ScanLogo() {
  return <svg width="25" height="25" viewBox="0 0 25 25" fill="none"><path d="M8 3H4v5M17 3h4v5M4 17v5h4M21 17v5h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="m8 12 3 3 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function Stat({ icon, title, value, caption, suffix, color }: { icon: React.ReactNode; title: string; value: number; caption: string; suffix?: string; color: string }) {
  return <section className="panel stat"><div className="stat-top"><span>{title}</span><span className={`stat-icon ${color}`}>{icon}</span></div><strong className="stat-value">{value}<small>{suffix}</small></strong><p>{caption}</p></section>
}
function Modal({ title, subtitle, children, onClose, wide = false, busy = false }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void; wide?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.body.style.overflow = originalOverflow; previous?.focus() }
  }, [])
  function handleKey(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && !busy) onClose()
    if (event.key === 'Tab') {
      const elements = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]')
      if (!elements?.length) return
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus() }
    }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}><div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={ref} onKeyDown={handleKey}><div className="modal-heading"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Đóng" disabled={busy} onClick={onClose}><X size={20} /></button></div>{children}</div></div>
}
function JobModal({ onClose, onCreated }: { onClose: () => void; onCreated: (job: Job) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [weight, setWeight] = useState(80)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const skills = String(form.get('skills')).split(',').map(value => value.trim()).filter(Boolean)
    if (!skills.length || skills.length > 30 || skills.some(skill => skill.length > 60)) {
      setError('Cần 1–30 kỹ năng, mỗi kỹ năng tối đa 60 ký tự.'); return
    }
    setBusy(true); setError('')
    try {
      const job = await api<Job>('/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        title: form.get('title'), department: form.get('department'), description: form.get('description'),
        skills, min_years: Number(form.get('min_years')), skill_weight: weight,
      }) })
      onCreated(job)
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <Modal title="Tạo vị trí tuyển dụng" subtitle="Xây dựng bộ tiêu chí rõ ràng trước khi xem hồ sơ." onClose={onClose} busy={busy}><form className="form" onSubmit={submit}>
    <label>Tên vị trí<input name="title" required minLength={2} maxLength={120} placeholder="VD: Senior Frontend Developer" /></label>
    <div className="form-row"><label>Phòng ban<input name="department" required minLength={2} maxLength={80} placeholder="VD: Engineering" /></label><label>Kinh nghiệm tối thiểu (năm)<input name="min_years" type="number" min={0} max={50} step={0.5} defaultValue={3} required /></label></div>
    <label>Mô tả công việc<textarea name="description" rows={4} required minLength={20} maxLength={20000} placeholder="Trách nhiệm, yêu cầu và bối cảnh của vị trí..." /></label>
    <label>Kỹ năng cần đối sánh<input name="skills" required placeholder="React, TypeScript, CSS, Git" /><small>Phân cách bằng dấu phẩy. Mỗi kỹ năng có trọng số bằng nhau.</small></label>
    <label>Trọng số kỹ năng: {weight}% · Kinh nghiệm: {100 - weight}%<input type="range" min={0} max={100} value={weight} onChange={e => setWeight(Number(e.target.value))} /></label>
    <div className="info-box"><CircleHelp size={17} /><span>Chấm theo các tiêu chí có cấu trúc ở trên. Nội dung mô tả JD dùng làm ngữ cảnh cho người xem xét, không được phân tích ngữ nghĩa tự động.</span></div>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Hủy</button><button className="button primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}Tạo vị trí</button></div>
  </form></Modal>
}
function UploadModal({ job, onClose, onUploaded }: { job: Job; onClose: () => void; onUploaded: (candidate: Candidate) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<{ name: string; error?: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  function chooseFiles(incoming: File[]) { setFiles(incoming); setResults([]) }
  async function upload() {
    setBusy(true)
    const completed: { name: string; error?: string }[] = []
    const failed: File[] = []
    for (const file of files) {
      try {
        if (!/\.(pdf|docx|txt)$/i.test(file.name)) throw new Error('Chỉ hỗ trợ PDF, DOCX, TXT.')
        if (file.size > 10 * 1024 * 1024) throw new Error('Tệp vượt quá 10 MB.')
        const data = new FormData()
        data.append('file', file)
        const candidate = await api<Candidate>(`/jobs/${job.id}/candidates`, { method: 'POST', body: data })
        onUploaded(candidate)
        completed.push({ name: file.name })
      } catch (err) { completed.push({ name: file.name, error: errorMessage(err) }); failed.push(file) }
      setResults([...completed])
    }
    setFiles(failed)
    if (inputRef.current) inputRef.current.value = ''
    setBusy(false)
  }
  return <Modal title="Thêm hồ sơ ứng viên" subtitle={`Đánh giá cho vị trí ${job.title}`} onClose={onClose} busy={busy}><div className="upload-body">
    <button className={`dropzone ${dragging ? 'dragging' : ''}`} disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) chooseFiles(Array.from(e.dataTransfer.files)) }}><span className="upload-icon"><UploadCloud size={30} /></span><strong>Kéo thả CV vào đây</strong><span>hoặc <b>chọn tệp từ máy tính</b></span><small>PDF, DOCX, TXT · Tối đa 10 MB / tệp</small></button>
    <input className="sr-only" ref={inputRef} type="file" accept=".pdf,.docx,.txt" multiple disabled={busy} onChange={e => chooseFiles(Array.from(e.target.files ?? []))} />
    {files.length > 0 && <div className="file-list">{files.map((file, index) => <div key={`${file.name}-${index}`}><FileText size={17} /><span>{file.name}<small>{(file.size / 1024).toFixed(0)} KB</small></span>{!busy && <button className="icon-button" aria-label={`Bỏ ${file.name}`} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X size={15} /></button>}</div>)}</div>}
    {results.length > 0 && <div aria-live="polite" className="upload-results">{results.map((result, index) => <div className={result.error ? 'inline-error' : 'upload-success'} key={index}>{result.error ? <CircleHelp size={16} /> : <CheckCheck size={16} />}<span>{result.name}: {result.error || 'Đã lưu và đánh giá'}</span></div>)}</div>}
    <div className="info-box"><ShieldCheck size={18} /><span>CV được lưu dưới dạng văn bản trong SQLite trên máy này. Chỉ tải hồ sơ khi bạn có quyền xử lý dữ liệu ứng viên. PDF scan cần OCR trước.</span></div>
    <div className="modal-actions"><button className="button secondary" disabled={busy} onClick={onClose}>{results.length ? 'Hoàn tất' : 'Hủy'}</button><button className="button primary" disabled={busy || !files.length} onClick={upload}>{busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{busy ? `Đang xử lý ${results.length + 1}/${files.length}...` : `Đánh giá ${files.length || ''} CV`}</button></div>
  </div></Modal>
}
function ReviewModal({ candidate, job, onClose, onSaved, onDeleted }: { candidate: Candidate; job: Job; onClose: () => void; onSaved: (candidate: Candidate) => void; onDeleted: (id: number) => void }) {
  const [status, setStatus] = useState<Status>(candidate.status)
  const [notes, setNotes] = useState(candidate.notes)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const assessment = candidate.assessment
  async function save() {
    setBusy(true); setError('')
    try {
      onSaved(await api<Candidate>(`/candidates/${candidate.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, notes }) }))
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError('')
    try { await api<void>(`/candidates/${candidate.id}`, { method: 'DELETE' }); onDeleted(candidate.id) }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <Modal title={candidate.name} subtitle={`${job.title} · ${candidate.filename}`} onClose={onClose} wide busy={busy}><div className="review-body">
    <div className="review-summary"><div className={`big-score ${scoreClass(assessment.score)}`}>{assessment.score}<small>/100</small></div><div><h3>Điểm đối sánh theo quy tắc</h3><p>Kỹ năng {assessment.skill_score} × {job.skill_weight}% + Kinh nghiệm {assessment.experience_score} × {100 - job.skill_weight}%</p><small>Không phải dự đoán năng lực hay khuyến nghị tuyển dụng.</small></div></div>
    <div className="review-columns"><section><h3>Đối chiếu kỹ năng <span className="count-badge">{assessment.matched_skills}/{assessment.total_skills}</span></h3><div className="evidence-list">{assessment.skills.map(skill => <div className="evidence-item" key={skill.skill}><strong>{skill.matched ? <Check size={16} className="green-text" /> : <CircleHelp size={16} className="muted" />}{skill.skill}<span>{skill.matched ? 'Có đề cập' : 'Chưa tìm thấy'}</span></strong>{skill.evidence.map((line, index) => <blockquote key={index}>{line}</blockquote>)}</div>)}</div><h3>Kinh nghiệm khai báo</h3><p className="experience-label">{assessment.years === null ? 'Chưa xác định' : `${assessment.years} năm`} <span> / Yêu cầu: {job.min_years} năm</span></p>{assessment.experience_evidence.map((line, index) => <blockquote key={index}>{line}</blockquote>)}{assessment.warnings.map(warning => <div className="warning-box" key={warning}>{warning}</div>)}</section>
    <section className="human-review"><h3>Đánh giá của nhà tuyển dụng</h3><div className="form"><label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value as Status)}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Ghi chú<textarea rows={7} maxLength={5000} placeholder="Nhận xét, câu hỏi phỏng vấn, điểm cần xác minh..." value={notes} onChange={e => setNotes(e.target.value)} /></label></div><div className="info-box"><CircleHelp size={17} /><span>Từ khóa có thể xuất hiện mà chưa phản ánh năng lực. Kiểm tra bối cảnh và xác nhận trong phỏng vấn.</span></div></section></div>
    <details className="original-text"><summary><FolderOpen size={17} />Xem văn bản trích xuất từ CV</summary><pre>{candidate.text}</pre></details>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {confirmDelete && <div className="delete-confirm" role="alert"><span>Xóa vĩnh viễn văn bản CV và đánh giá?</span><button className="button danger small" disabled={busy} onClick={remove}>Xác nhận xóa</button><button className="button secondary small" disabled={busy} onClick={() => setConfirmDelete(false)}>Hủy</button></div>}
    <div className="modal-actions"><button className="button text-button delete-button" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={16} />Xóa hồ sơ</button><button className="button primary" disabled={busy} onClick={save}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Lưu đánh giá</button></div>
  </div></Modal>
}
function Help() {
  return <div className="help-grid"><section className="panel help-panel"><div className="job-icon"><Target size={24} /></div><h2>Cách tính điểm</h2><p>Kỹ năng được đối sánh bằng từ khóa không phân biệt dấu và chữ hoa/thường. Một số tên phổ biến có bí danh (React.js, ReactJS…). Mỗi kỹ năng có trọng số bằng nhau.</p><p><strong>Điểm kỹ năng</strong> = số kỹ năng có đề cập / tổng kỹ năng × 100.</p><p><strong>Điểm kinh nghiệm</strong> = số năm khai báo / số năm yêu cầu × 100, tối đa 100. Nếu không yêu cầu kinh nghiệm, thành phần này đạt 100.</p><p><strong>Điểm cuối</strong> = tổng hai thành phần theo trọng số được thiết lập trong JD.</p></section><section className="panel help-panel"><div className="job-icon"><ShieldCheck size={24} /></div><h2>Giới hạn & quyền riêng tư</h2><p>Không phân tích ngữ nghĩa JD, không xác minh thông tin và không suy ra số năm từ mốc thời gian. Nếu CV không ghi rõ “3 năm kinh nghiệm” hoặc “3 years of experience”, cần kiểm tra thủ công.</p><p>Không dùng tuổi, giới tính, ảnh, quốc tịch hoặc các thuộc tính nhạy cảm để chấm điểm. Tên hiển thị lấy từ tên tệp, không tự suy đoán danh tính.</p><p>Phiên bản này dành cho máy nội bộ, chưa có đăng nhập hay phân quyền. Không triển khai lên Internet với dữ liệu thật trước khi bổ sung các lớp bảo vệ.</p><p>Bạn có thể xóa CV trong màn hình chi tiết. Bản sao lưu, nếu có, phải được quản lý riêng theo chính sách lưu giữ dữ liệu.</p></section></div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
