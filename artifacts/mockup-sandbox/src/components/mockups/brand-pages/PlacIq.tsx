import { ArrowRight, CheckCircle2, Clock, AlertTriangle, TrendingUp, Users, DollarSign, Zap, ChevronRight, BarChart3, Shield, Bell } from "lucide-react";

export function PlacIq() {
  return (
    <div className="min-h-screen bg-white font-['Inter']" style={{ fontFamily: "'Inter', sans-serif" }}>

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
            {["Features", "Pricing", "For Agencies", "Resources"].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log In</a>
            <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: "#f97316" }}>
              Get Started Free
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
              <Zap className="w-3.5 h-3.5" />
              Built for recruitment agencies running 5–200 contractors
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              The Back Office Your<br />
              <span style={{ color: "#fb923c" }}>Agency Actually Needs</span>
            </h1>
            <p className="text-lg text-blue-100 mb-10 max-w-2xl leading-relaxed">
              Stop chasing timesheets, fielding "where's my pay?" calls, and firefighting cash flow.
              PlacIq gives your agency a structured operating system so the platform answers — not you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90" style={{ background: "#f97316" }}>
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white border border-white/20 hover:bg-white/10 transition-all">
                Book a Demo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-blue-200">
              {["No setup fee", "Free 30-day trial", "Cancel anytime"].map((item) => (
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
                { label: "Active Contractors", value: "47", sub: "+3 this week", icon: Users, color: "#10b981" },
                { label: "Outstanding Invoices", value: "$183,400", sub: "12 clients", icon: DollarSign, color: "#f97316" },
                { label: "Exceptions", value: "3", sub: "Require attention", icon: AlertTriangle, color: "#f59e0b" },
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

      {/* Pain Points */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#1a2e4a" }}>
              Running an agency is messy.<br />
              <span style={{ color: "#f97316" }}>We built the structure you're missing.</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every agency we talk to faces the same four problems. PlacIq was built specifically to solve them.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: AlertTriangle,
                color: "#ef4444",
                bg: "#fef2f2",
                title: "\"Where's my pay?\" — every Friday",
                desc: "Contractors chase you because they can't see status. PlacIq gives every contractor a live dashboard showing exactly when their pay is processing and why.",
              },
              {
                icon: DollarSign,
                color: "#f97316",
                bg: "#fff7ed",
                title: "Cashflow crunch between invoice and payroll",
                desc: "Clients pay in 30–45 days. You pay contractors weekly. PlacIq's cashflow panel shows your funding gap in real time so you're never caught short.",
              },
              {
                icon: BarChart3,
                color: "#8b5cf6",
                bg: "#f5f3ff",
                title: "Custom rates and exceptions piling up",
                desc: "You said yes to six different billing arrangements. PlacIq enforces structure — rate mismatches and billing inconsistencies are flagged before they become invoicing errors.",
              },
              {
                icon: Clock,
                color: "#1d6ab5",
                bg: "#eff6ff",
                title: "Timesheet approvals holding up payroll",
                desc: "Unapproved timesheets block your pay run. PlacIq automatically flags missing and overdue timesheets to the right people, days before the deadline.",
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

      {/* Core concept: Controlled Flexibility */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold mb-4 uppercase tracking-widest" style={{ color: "#f97316" }}>
                Our Philosophy
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#1a2e4a" }}>
                Visibility replaces<br />conversations
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Agencies are urgent by nature — your contractors expect instant answers. PlacIq doesn't fight that. It channels it into the platform.
              </p>
              <div className="space-y-5">
                {[
                  { before: "\"Can you check this urgently?\"", after: "Dashboard shows: Approved — Processing Friday 3pm" },
                  { before: "\"When will contractor X be paid?\"", after: "AI instantly answers from live payroll data" },
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
                  <span className="text-sm font-semibold text-gray-700">Contractor Status Feed</span>
                </div>
                <Bell className="w-4 h-4 text-gray-400" />
              </div>
              <div className="p-4 space-y-3 bg-white">
                {[
                  { name: "James T.", role: "IT Contractor", status: "Timesheet Approved", sub: "Updated 12 mins ago", badge: "approved", next: "Payroll runs Friday" },
                  { name: "Maria C.", role: "Healthcare — RN", status: "Missing Timesheet", sub: "Due 2 days ago", badge: "warning", next: "Approve to unlock pay run" },
                  { name: "Alex W.", role: "Security Consultant", status: "BGV Check Complete", sub: "Updated 1 hour ago", badge: "complete", next: "Contract ready to send" },
                  { name: "Priya M.", role: "Finance Analyst", status: "Paid", sub: "Processed Thursday", badge: "paid", next: "Payslip available" },
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
              Everything your agency needs in one place
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Contracts, timesheets, BGV checks, invoicing, and payroll — all structured around how agencies actually operate.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Clock, color: "#1d6ab5", bg: "#eff6ff", title: "Payroll Schedule Dashboard", desc: "Every agency user sees the next payroll run date, cutoff time, and how many timesheets are still pending — in big, clear numbers." },
              { icon: Bell, color: "#f97316", bg: "#fff7ed", title: "Proactive Exception Flags", desc: "Missing timesheets, rate mismatches, pending approvals, and document expiries are surfaced automatically — before they block your pay run." },
              { icon: Zap, color: "#8b5cf6", bg: "#f5f3ff", title: "AI Instant Answers", desc: 'Ask "When will contractor X be paid?" in plain English. PlacIq pulls live data and answers instantly — no digging through menus.' },
              { icon: Shield, color: "#10b981", bg: "#ecfdf5", title: "BGV & Compliance Packs", desc: "Select the compliance requirements for each contractor type — police checks, right to work, licences — all tracked in one place." },
              { icon: TrendingUp, color: "#ef4444", bg: "#fef2f2", title: "Cashflow Panel", desc: "See outstanding client invoices vs upcoming payroll obligations side by side. Know your funding gap before it becomes a crisis." },
              { icon: BarChart3, color: "#f59e0b", bg: "#fffbeb", title: "Margin & Contractor Summary", desc: "Active contractors this week, total margin this pay period, and headcount changes — everything you need to manage your book of business." },
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

      {/* Pricing teaser */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#1a2e4a" }}>Simple pricing. No surprises.</h2>
            <p className="text-gray-500">Start free. Scale as your agency grows.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$149",
                period: "/month",
                desc: "Up to 15 active contractors",
                features: ["Payroll schedule dashboard", "Contractor status feed", "Timesheet management", "Standard compliance docs", "Email support"],
                cta: "Start Free Trial",
                highlight: false,
              },
              {
                name: "Agency",
                price: "$349",
                period: "/month",
                desc: "Up to 75 active contractors",
                features: ["Everything in Starter", "AI Instant Answers", "Proactive exception flags", "Cashflow panel", "BGV packs (Certn)", "Priority support"],
                cta: "Start Free Trial",
                highlight: true,
              },
              {
                name: "Scale",
                price: "Custom",
                period: "",
                desc: "75+ contractors or bespoke needs",
                features: ["Everything in Agency", "Dedicated account manager", "Custom invoicing rules", "SDP Global Pay managed tier", "SLA guarantee"],
                cta: "Talk to Us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl p-6 flex flex-col"
                style={plan.highlight ? {
                  background: "linear-gradient(160deg, #1d4070, #1d6ab5)",
                  border: "none",
                  boxShadow: "0 20px 60px rgba(29,106,181,0.35)",
                } : {
                  border: "1.5px solid #e5e7eb",
                  background: "white",
                }}
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${plan.highlight ? "text-blue-200" : "text-gray-500"}`}>{plan.name}</span>
                    {plan.highlight && <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: "#f97316" }}>Most Popular</span>}
                  </div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>{plan.price}</span>
                    {plan.period && <span className={`text-sm pb-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>{plan.period}</span>}
                  </div>
                  <p className={`text-xs ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? "text-emerald-300" : "text-emerald-500"}`} />
                      <span className={plan.highlight ? "text-blue-100" : "text-gray-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={plan.highlight ? {
                    background: "#f97316",
                    color: "white",
                  } : {
                    border: "1.5px solid #1d6ab5",
                    color: "#1d6ab5",
                    background: "white",
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Escalation path to SDP Global Pay */}
      <section className="py-16" style={{ background: "#0f1e35" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-sm font-semibold mb-3 uppercase tracking-widest" style={{ color: "#fb923c" }}>
            Growing beyond self-serve?
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Running 50+ contractors or need dedicated support?
          </h2>
          <p className="text-blue-200 mb-8 text-lg">
            PlacIq is built for agencies that want structure and self-serve.
            When you need a dedicated account manager, custom SLAs, or managed EOR services — step up to SDP Global Pay.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90" style={{ background: "#f97316" }}>
            Talk to SDP Global Pay
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-blue-300/50 text-sm mt-4">No disruption to your contractors or data when you upgrade</p>
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
