import { ArrowRight, CheckCircle2, Globe2, ShieldCheck, FileText, Users, BarChart3, ChevronRight, Building2, Landmark, Briefcase, Lock, Phone, Mail, Award, TrendingUp } from "lucide-react";

export function SdpGlobalPay() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <div className="border-b border-gray-200 py-2 hidden md:block" style={{ background: "#0f2244" }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs" style={{ color: "#94b0d4" }}>
            <span className="flex items-center gap-1.5"><Globe2 className="w-3 h-3" /> sdpglobalpay.com</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> +1 800 SDP GLOBAL</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> enterprise@sdpglobalpay.com</span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "#94b0d4" }}>
            <a href="#" className="hover:text-white transition-colors">Country Guide</a>
            <a href="#" className="hover:text-white transition-colors">Resources</a>
            <a href="#" className="hover:text-white transition-colors">Partner Portal</a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center px-2 py-1 rounded" style={{ background: "#0f2244" }}>
              <span className="text-white font-bold text-xs tracking-widest">SDP</span>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight" style={{ color: "#0f2244" }}>Global Pay</span>
              <div className="text-xs leading-none mt-0.5" style={{ color: "#b8922a" }}>Workforce Operating System</div>
            </div>
          </div>
          <div className="hidden md:flex items-center">
            {[
              { label: "Solutions", items: ["Employer of Record", "Global Payroll", "BGV", "HRMS"] },
              { label: "By Industry", items: [] },
              { label: "Pricing", items: [] },
              { label: "Resources", items: [] },
            ].map((nav) => (
              <a key={nav.label} href="#" className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {nav.label}
                {nav.items.length > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-40 rotate-90" />}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded border border-gray-200 hover:border-gray-300 transition-all">Client Log In</a>
            <button className="px-4 py-2 rounded text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "#0f2244" }}>
              Book a Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "#0a1628" }}>
        {/* Geometric grid overlay */}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="absolute right-0 top-0 w-1/2 h-full overflow-hidden opacity-20">
          <div className="absolute top-10 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: "#b8922a" }} />
          <div className="absolute bottom-10 right-40 w-64 h-64 rounded-full blur-3xl" style={{ background: "#1e3a6e" }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-28 relative">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 max-w-8" style={{ background: "#b8922a" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#b8922a" }}>Global Workforce Platform</span>
              </div>
              <h1 className="text-5xl font-extrabold text-white leading-tight mb-6" style={{ letterSpacing: "-0.02em" }}>
                The Global<br />Workforce<br />
                <span style={{ color: "#d4a843" }}>Operating System</span>
              </h1>
              <p className="text-lg mb-10 leading-relaxed" style={{ color: "#94b0d4" }}>
                Hire, pay, and manage workers in any country. Employer of record, global payroll, compliance, and background verification — governed by our people, powered by our platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-12">
                <button className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "#b8922a" }}>
                  Book a Demo
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10 transition-all">
                  View Solutions
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {[
                  { value: "50+", label: "Countries" },
                  { value: "4,200+", label: "Workers Managed" },
                  { value: "380+", label: "Business Clients" },
                  { value: "12+", label: "Years Operating" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#6b90b8" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corporate dashboard widget */}
            <div className="hidden md:block">
              <div className="rounded-sm overflow-hidden border" style={{ borderColor: "#1e3a6e", background: "#0d1f3c" }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e3a6e" }}>
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#94b0d4" }}>Workforce Summary — Q2 2026</span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: "#1e3a6e", color: "#94b0d4" }}>Live</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Active Workers", value: "4,218", delta: "+127 this quarter", color: "#10b981" },
                    { label: "Countries Active", value: "38", delta: "+4 this quarter", color: "#3b82f6" },
                    { label: "Contracts Signed", value: "1,840", delta: "This financial year", color: "#b8922a" },
                    { label: "BGV Checks Run", value: "3,290", delta: "100% pass rate", color: "#a855f7" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-sm p-3 border" style={{ border: "1px solid #1e3a6e" }}>
                      <div className="text-xs mb-2" style={{ color: "#6b90b8" }}>{card.label}</div>
                      <div className="text-2xl font-bold text-white mb-0.5">{card.value}</div>
                      <div className="text-xs" style={{ color: card.color }}>{card.delta}</div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-sm p-3 border" style={{ border: "1px solid #1e3a6e" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "#6b90b8" }}>Country Coverage</span>
                      <span className="text-xs font-medium" style={{ color: "#b8922a" }}>50 of 195 — expanding</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {["AU", "NZ", "UK", "US", "SG", "MY", "PH", "IN", "DE", "IE", "JP", "CA"].map((code) => (
                        <span key={code} className="text-xs px-1.5 py-0.5 rounded font-mono font-semibold text-white" style={{ background: "#1e3a6e" }}>{code}</span>
                      ))}
                      <span className="text-xs px-1.5 py-0.5 rounded text-white/40" style={{ background: "#1e3a6e" }}>+38 more</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client logos bar */}
      <div className="border-y border-gray-200 py-6" style={{ background: "#f4f7fb" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: "#e0e8f0" }} />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Trusted by leading organisations globally</span>
            <div className="h-px flex-1" style={{ background: "#e0e8f0" }} />
          </div>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {["Financial Services", "Healthcare", "Technology", "Engineering", "Professional Services", "Logistics"].map((sector) => (
              <div key={sector} className="text-sm font-semibold text-gray-300 tracking-wide uppercase text-xs">{sector}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Solutions grid */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 mb-16 items-end">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8" style={{ background: "#b8922a" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#b8922a" }}>Platform Solutions</span>
              </div>
              <h2 className="text-4xl font-extrabold leading-tight" style={{ color: "#0f2244", letterSpacing: "-0.01em" }}>
                One platform.<br />Every workforce need.
              </h2>
            </div>
            <p className="text-gray-500 leading-relaxed">
              From a single cross-border hire to a 5,000-person global workforce — SDP Global Pay manages the full employment lifecycle in every supported jurisdiction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-0 border border-gray-200 rounded-sm overflow-hidden">
            {[
              {
                icon: Building2,
                color: "#0f2244",
                title: "Employer of Record",
                desc: "SDP becomes the legal employer in each country. We hold the employment contracts, manage statutory obligations, and assume employer liability — you retain full operational control of your people.",
                tags: ["Legal employer", "Statutory compliance", "50+ countries"],
              },
              {
                icon: Globe2,
                color: "#b8922a",
                title: "Global Payroll",
                desc: "Multi-currency payroll for every worker type — permanent, contractor, casual, fixed-term, gig. Tax calculation, super/pension contributions, and payslip generation built per jurisdiction.",
                tags: ["Multi-currency", "All worker types", "In-house tax engine"],
              },
              {
                icon: ShieldCheck,
                color: "#1e6b3c",
                title: "Background Verification",
                desc: "Criminal history, right to work, identity verification, credit, and bankruptcy checks — all through Certn. Managed via BGV Packs. Billed at cost plus SDP margin.",
                tags: ["Certn integration", "Custom BGV Packs", "Compliance docs"],
              },
              {
                icon: FileText,
                color: "#7c3aed",
                title: "Contracts & Compliance",
                desc: "Country-specific employment contract templates, digital signing, and a contract gate that prevents issuance until all BGV and compliance requirements are satisfied.",
                tags: ["e-Signing", "Jurisdiction templates", "Contract gate"],
              },
              {
                icon: Briefcase,
                color: "#0f2244",
                title: "HRMS Add-On",
                desc: "Hiring requisitions, structured onboarding, performance management, leave, and full HR records — available as an add-on for enterprise accounts managing their own entities.",
                tags: ["Onboarding", "Performance", "Leave management"],
              },
              {
                icon: BarChart3,
                color: "#b8922a",
                title: "Workforce Intelligence",
                desc: "Natural language reporting across headcount, payroll spend, contract expiry, and BGV status. AI-powered insights surfaced at the point of decision — not in a report you have to build.",
                tags: ["AI reporting", "Real-time", "Decision-ready"],
              },
            ].map((feat, i) => (
              <div key={feat.title} className="p-7 border-gray-200" style={{ borderRight: i % 3 !== 2 ? "1px solid #e5e7eb" : "none", borderBottom: i < 3 ? "1px solid #e5e7eb" : "none" }}>
                <div className="flex items-center gap-3 mb-4">
                  <feat.icon className="w-5 h-5 flex-shrink-0" style={{ color: feat.color }} />
                  <h3 className="font-bold text-gray-900">{feat.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{feat.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {feat.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-sm font-medium border" style={{ color: feat.color, borderColor: "currentColor", borderOpacity: 0.2 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EOR model */}
      <section className="py-20" style={{ background: "#f4f7fb" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8" style={{ background: "#b8922a" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#b8922a" }}>Service Model</span>
              </div>
              <h2 className="text-3xl font-extrabold leading-tight mb-6" style={{ color: "#0f2244" }}>
                PaaS or SaaS —<br />your choice
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                Use SDP as your employer of record globally, or bring your own entities where you already operate. Both models run on the same platform — pricing and obligations differ by model.
              </p>
              <div className="space-y-4">
                {[
                  { badge: "PaaS", label: "Managed EOR", desc: "SDP is the employer. We manage all legal, compliance, and payroll obligations across 50+ countries.", color: "#0f2244" },
                  { badge: "SaaS", label: "Own Entity", desc: "Register your own entities. Use SDP as payroll and HR software for your home markets — SDP EOR for the rest.", color: "#b8922a" },
                ].map((model) => (
                  <div key={model.badge} className="flex gap-4 p-4 rounded-sm bg-white border border-gray-200">
                    <span className="text-xs font-bold px-2 py-1 rounded-sm text-white flex-shrink-0 h-fit mt-0.5" style={{ background: model.color }}>{model.badge}</span>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm mb-1">{model.label}</div>
                      <div className="text-sm text-gray-500">{model.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Country table */}
            <div className="border border-gray-200 rounded-sm overflow-hidden bg-white">
              <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between" style={{ background: "#f4f7fb" }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0f2244" }}>Active Jurisdictions</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-sm text-white" style={{ background: "#1e6b3c" }}>50+ active</span>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { flag: "🇦🇺", country: "Australia", model: "EOR + Payroll", detail: "PAYG · Super 11.5%" },
                  { flag: "🇬🇧", country: "United Kingdom", model: "EOR + Payroll", detail: "PAYE · NI · Auto-enrol" },
                  { flag: "🇸🇬", country: "Singapore", model: "EOR + Payroll", detail: "CPF · IR8A filing" },
                  { flag: "🇳🇿", country: "New Zealand", model: "EOR + Payroll", detail: "PAYE · KiwiSaver" },
                  { flag: "🇵🇭", country: "Philippines", model: "EOR", detail: "BIR · SSS · PhilHealth" },
                  { flag: "🇩🇪", country: "Germany", model: "EOR + Payroll", detail: "Lohnsteuer · SV" },
                  { flag: "🇮🇳", country: "India", model: "EOR", detail: "TDS · PF · ESI" },
                ].map((row) => (
                  <div key={row.country} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-xl mr-3">{row.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{row.country}</div>
                      <div className="text-xs text-gray-400">{row.detail}</div>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-sm border" style={{ color: "#0f2244", borderColor: "#cbd5e1" }}>{row.model}</span>
                  </div>
                ))}
                <div className="px-5 py-3 text-center">
                  <a href="#" className="text-xs font-semibold flex items-center justify-center gap-1 uppercase tracking-wide" style={{ color: "#b8922a" }}>
                    View full country guide <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/compliance bar */}
      <section className="py-12 border-y border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Lock, label: "SOC 2 Type II", sub: "In progress" },
              { icon: ShieldCheck, label: "GDPR Compliant", sub: "EU data residency" },
              { icon: Globe2, label: "50+ Jurisdictions", sub: "Ongoing compliance" },
              { icon: Award, label: "ISO 27001", sub: "Information security" },
            ].map((trust) => (
              <div key={trust.label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center border border-gray-200">
                  <trust.icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="font-semibold text-sm text-gray-800">{trust.label}</div>
                <div className="text-xs text-gray-400">{trust.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "#0a1628" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="border border-gray-700 rounded-sm p-12 text-center" style={{ background: "#0f2244" }}>
            <div className="flex items-center gap-3 justify-center mb-6">
              <div className="h-px w-12" style={{ background: "#b8922a" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#b8922a" }}>Get Started</span>
              <div className="h-px w-12" style={{ background: "#b8922a" }} />
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-5" style={{ letterSpacing: "-0.01em" }}>
              Ready to build your global workforce?
            </h2>
            <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: "#94b0d4" }}>
              Speak with our team for a tailored walkthrough based on your headcount, countries, and worker types. No generic demos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="flex items-center justify-center gap-2 px-7 py-4 text-sm font-semibold text-white" style={{ background: "#b8922a" }}>
                Book a Demo <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center gap-2 px-7 py-4 text-sm font-semibold border border-white/20 text-white hover:bg-white/10 transition-all">
                Download Solution Brief
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-800" style={{ background: "#07101f" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="px-2 py-0.5 rounded-sm" style={{ background: "#1e3a6e" }}>
              <span className="text-white font-bold text-xs tracking-widest">SDP</span>
            </div>
            <span className="font-semibold text-sm text-white">Global Pay</span>
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            {["Solutions", "Pricing", "Country Guide", "Privacy", "Terms", "Contact Sales"].map((item) => (
              <a key={item} href="#" className="hover:text-gray-300 transition-colors">{item}</a>
            ))}
          </div>
          <p className="text-xs text-gray-600">© 2026 SDP Solutions Ltd.</p>
        </div>
      </footer>

    </div>
  );
}
