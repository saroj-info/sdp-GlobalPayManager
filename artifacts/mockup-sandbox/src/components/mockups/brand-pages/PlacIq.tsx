import { ArrowRight, CheckCircle2, Clock, AlertTriangle, TrendingUp, Users, DollarSign, Zap, ChevronRight, BarChart3, Shield, Bell, Phone, Globe2, HeadphonesIcon, Building2 } from "lucide-react";

export function PlacIq() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1d6ab5, #1a56a0)" }}>
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold" style={{ color: "#1a2e4a" }}>
              Plac<span style={{ color: "#f97316" }}>Iq</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "For Agencies", "Contact"].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log In</a>
            <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "#f97316" }}>
              Talk to Us
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0f1e35 0%, #1d4070 60%, #1d6ab5 100%)" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "#f97316" }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl" style={{ background: "#1d6ab5" }} />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-24 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)" }}>
              <Building2 className="w-3.5 h-3.5" />
              For recruitment agencies placing 1–50 contractors, temps &amp; gig workers
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              The Back Office Your<br />
              <span style={{ color: "#fb923c" }}>Agency Actually Needs</span>
            </h1>
            <p className="text-lg text-blue-100 mb-6 max-w-2xl leading-relaxed">
              A smart platform backed by real people. PlacIq combines structured EOR and payroll software with the hands-on support of SDP Global Pay — so your agency runs smoothly without the back-office burden.
            </p>
            <div className="flex items-center gap-3 mb-10 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f97316" }}>
                <HeadphonesIcon className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-blue-100">
                <span className="font-semibold text-white">Not just software.</span> Behind every PlacIq account is the SDP Global Pay team — handling employer of record, payroll compliance, and worker support when you need it.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90" style={{ background: "#f97316" }}>
                Talk to Us
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white border border-white/20 hover:bg-white/10 transition-all">
                See How It Works
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-blue-200">
              {["Full EOR service included", "Global payroll covered", "Real people when you need them"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard preview strip */}
        <div className="max-w-6xl mx-auto px-6 pb-0">
          <div className="rounded-t-2xl overflow-hidden shadow-2xl border border-white/10" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
              <span className="ml-4 text-xs text-white/40">PlacIq Agency Dashboard</span>
            </div>
            <div className="p-5 grid grid-cols-4 gap-3">
              {[
                { label: "Next Pay Run", value: "Friday 3pm", sub: "Timesheets due Thu 5pm", icon: Clock, color: "#3b82f6" },
                { label: "Active Workers", value: "31", sub: "Contractors, temps & gig", icon: Users, color: "#10b981" },
                { label: "Outstanding Invoices", value: "$94,200", sub: "8 clients", icon: DollarSign, color: "#f97316" },
                { label: "Exceptions", value: "2", sub: "Require attention", icon: AlertTriangle, color: "#f59e0b" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50">{card.label}</span>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: card.color + "22" }}>
                      <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white mb-0.5">{card.value}</div>
                  <div className="text-xs text-white/40">{card.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service model: light-touch system + human wave */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold mb-4 uppercase tracking-widest" style={{ color: "#f97316" }}>
                How PlacIq Works
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#1a2e4a" }}>
                Light-touch for you.<br />
                Heavy-lift behind<br />the scenes.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                PlacIq is structured and self-serve by design — but it runs on SDP Global Pay's full EOR and global payroll infrastructure. You get the simplicity of software with the compliance and people-power of a managed service.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Globe2, color: "#1d6ab5", bg: "#eff6ff", title: "Employer of Record — fully managed", desc: "SDP is the legal employer for your workers in every country. Contracts, statutory compliance, and tax obligations handled end to end." },
                  { icon: DollarSign, color: "#10b981", bg: "#ecfdf5", title: "Global payroll — we run it", desc: "Multi-currency payroll for contractors, temps, and gig workers. Your people get paid correctly and on time, every time." },
                  { icon: HeadphonesIcon, color: "#f97316", bg: "#fff7ed", title: "Real people in your corner", desc: "Questions, exceptions, urgent payroll needs — the SDP team picks up. You are never on your own with a support ticket queue." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: item.bg }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-0.5">{item.title}</div>
                      <div className="text-sm text-gray-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Human team callout */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-xl">
              <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, #0f1e35, #1d4070)" }}>
                <div className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-2">The SDP Global Pay Team</div>
                <h3 className="text-xl font-bold text-white mb-1">People behind the platform</h3>
                <p className="text-sm text-blue-200">Available when the platform can't answer — and that's rare.</p>
              </div>
              <div className="p-5 bg-white space-y-3">
                {[
                  { name: "Payroll Operations", desc: "Runs your pay cycle, resolves exceptions, and ensures every worker is paid correctly", tag: "Managed service", color: "#1d6ab5" },
                  { name: "Compliance & EOR", desc: "Keeps your contracts, employment obligations, and country-specific rules up to date", tag: "Fully handled", color: "#10b981" },
                  { name: "Worker Support", desc: "Handles worker queries about pay, contracts, and onboarding — so you don't have to", tag: "On your behalf", color: "#f97316" },
                  { name: "Account Management", desc: "A named contact at SDP Global Pay who knows your agency and escalates when needed", tag: "Light touch", color: "#8b5cf6" },
                ].map((team) => (
                  <div key={team.name} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: team.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-gray-800">{team.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: team.color }}>{team.tag}</span>
                      </div>
                      <span className="text-xs text-gray-500">{team.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#1a2e4a" }}>
              Running an agency is messy.<br />
              <span style={{ color: "#f97316" }}>We built the structure you're missing.</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every agency we talk to faces the same four problems. PlacIq — backed by SDP Global Pay — was built to solve them.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: AlertTriangle,
                color: "#ef4444",
                bg: "#fef2f2",
                title: "\"Where's my pay?\" — every Friday",
                desc: "Workers chase you because they can't see status. PlacIq gives every contractor, temp, and gig worker a live dashboard showing exactly when their pay is processing — and the SDP team handles worker queries directly.",
              },
              {
                icon: DollarSign,
                color: "#f97316",
                bg: "#fff7ed",
                title: "Cashflow crunch between invoice and payroll",
                desc: "Clients pay in 30–45 days. You pay workers weekly. PlacIq's cashflow panel shows your funding gap in real time so you're never caught short.",
              },
              {
                icon: BarChart3,
                color: "#8b5cf6",
                bg: "#f5f3ff",
                title: "Custom rates and billing exceptions",
                desc: "You said yes to five different billing arrangements. PlacIq enforces structure — rate mismatches and inconsistencies are flagged before they become invoicing errors.",
              },
              {
                icon: Clock,
                color: "#1d6ab5",
                bg: "#eff6ff",
                title: "Timesheet approvals holding up payroll",
                desc: "Unapproved timesheets block your pay run. PlacIq automatically flags missing and overdue timesheets — and the SDP payroll team follows up when needed.",
              },
            ].map((pain) => (
              <div key={pain.title} className="flex gap-5 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: pain.bg }}>
                  <pain.icon className="w-6 h-6" style={{ color: pain.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{pain.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{pain.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visibility section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold mb-4 uppercase tracking-widest" style={{ color: "#f97316" }}>
                Platform Design
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#1a2e4a" }}>
                Visibility replaces<br />conversations
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Agencies are urgent by nature. PlacIq doesn't fight that — it channels urgency into the platform, so the answer is always visible before anyone picks up the phone.
              </p>
              <div className="space-y-5">
                {[
                  { before: "\"Can you check this urgently?\"", after: "Dashboard: Approved — Processing Friday 3pm" },
                  { before: "\"When will contractor X be paid?\"", after: "AI answers instantly from live payroll data" },
                  { before: "\"Why is this invoice different?\"", after: "Rate mismatch flagged and explained automatically" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ background: "#fef2f2" }}>
                      <span className="text-xs font-bold" style={{ color: "#ef4444" }}>✕</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 line-through mb-1">{item.before}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#ecfdf5" }}>
                          <span className="text-xs font-bold" style={{ color: "#10b981" }}>✓</span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: "#1a2e4a" }}>{item.after}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live status mockup */}
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100" style={{ background: "#f8fafc" }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#1d6ab5" }}>
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Worker Status Feed</span>
                </div>
                <Bell className="w-4 h-4 text-gray-400" />
              </div>
              <div className="p-4 space-y-3 bg-white">
                {[
                  { name: "James T.", role: "IT Contractor", status: "Timesheet Approved", sub: "Updated 12 mins ago", badge: "approved", next: "Payroll runs Friday" },
                  { name: "Maria C.", role: "Temp — Healthcare", status: "Missing Timesheet", sub: "Due 2 days ago", badge: "warning", next: "Approve to unlock pay run" },
                  { name: "Alex W.", role: "Gig — Security", status: "BGV Check Complete", sub: "Updated 1 hour ago", badge: "complete", next: "Contract ready to send" },
                  { name: "Priya M.", role: "Contractor — Finance", status: "Paid", sub: "Processed Thursday", badge: "paid", next: "Payslip available" },
                ].map((row) => {
                  const colors: Record<string, { bg: string; text: string }> = {
                    approved: { bg: "#d1fae5", text: "#065f46" },
                    warning: { bg: "#fef3c7", text: "#92400e" },
                    complete: { bg: "#dbeafe", text: "#1e40af" },
                    paid: { bg: "#ede9fe", text: "#4c1d95" },
                  };
                  const c = colors[row.badge];
                  return (
                    <div key={row.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: "#1d6ab5" }}>
                        {row.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-800">{row.name}</span>
                          <span className="text-xs text-gray-400">{row.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: c.bg, color: c.text }}>{row.status}</span>
                          <span className="text-xs text-gray-400">{row.sub}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-gray-400">{row.next}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#1a2e4a" }}>
              Everything your agency needs — nothing it doesn't
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              EOR, global payroll, contracts, timesheets, BGV, and invoicing — structured around how agencies actually operate, backed by a team that knows the work.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Globe2, color: "#1d6ab5", bg: "#eff6ff", title: "Employer of Record", desc: "SDP is the legal employer in every country. Contracts, statutory compliance, and payroll tax — all managed by our team on your behalf." },
              { icon: Clock, color: "#10b981", bg: "#ecfdf5", title: "Payroll Schedule Dashboard", desc: "Every agency user sees the next payroll run date, cutoff time, and pending timesheets — managed end to end by SDP." },
              { icon: Bell, color: "#f97316", bg: "#fff7ed", title: "Proactive Exception Flags", desc: "Missing timesheets, rate mismatches, and approval blocks surfaced automatically — before they affect your pay run." },
              { icon: Zap, color: "#8b5cf6", bg: "#f5f3ff", title: "AI Instant Answers", desc: "Ask any question about your workers, pay runs, or invoices in plain English — answered instantly from live data." },
              { icon: Shield, color: "#10b981", bg: "#ecfdf5", title: "BGV & Compliance Packs", desc: "Police checks, right to work, licences — all tracked per worker type. Managed through the platform, escalated to the team when needed." },
              { icon: TrendingUp, color: "#ef4444", bg: "#fef2f2", title: "Cashflow Panel", desc: "Outstanding client invoices vs upcoming payroll obligations side by side — so you always know your funding position." },
            ].map((feat) => (
              <div key={feat.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: feat.bg }}>
                  <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Escalation path to SDP Global Pay */}
      <section className="py-16" style={{ background: "#0f1e35" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-sm font-semibold mb-3 uppercase tracking-widest" style={{ color: "#fb923c" }}>
            Growing fast?
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Running 50+ contractors or need a fully managed service?
          </h2>
          <p className="text-blue-200 mb-8 text-lg">
            PlacIq is built for agencies that want a structured, self-serve system with EOR and payroll support behind it.
            When you need dedicated account management, custom SLAs, or a fully bespoke service — step up to SDP Global Pay.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90" style={{ background: "#f97316" }}>
            Talk to SDP Global Pay
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-blue-300/50 text-sm mt-4">No disruption to your workers or data when you move up</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#1d6ab5" }}>
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-bold" style={{ color: "#1a2e4a" }}>
              Plac<span style={{ color: "#f97316" }}>Iq</span>
            </span>
            <span className="text-gray-300 mx-2">·</span>
            <span className="text-xs text-gray-400">Powered by SDP Global Pay</span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            {["Privacy", "Terms", "Security", "Contact"].map((item) => (
              <a key={item} href="#" className="hover:text-gray-600 transition-colors">{item}</a>
            ))}
          </div>
          <p className="text-xs text-gray-400">© 2026 SDP Solutions Ltd. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
