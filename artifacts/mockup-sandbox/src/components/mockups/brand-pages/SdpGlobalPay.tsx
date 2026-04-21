import { ArrowRight, CheckCircle2, Globe2, ShieldCheck, FileText, Users, BarChart3, ChevronRight, Building2, Landmark, Briefcase, Lock } from "lucide-react";

export function SdpGlobalPay() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f2244, #1e3a6e)" }}>
              <span className="text-white font-bold text-xs">SDP</span>
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "#0f2244" }}>
              SDP <span style={{ color: "#b8922a" }}>Global Pay</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Solutions", "Pricing", "Resources", "Country Guide"].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                {item}
                <ChevronRight className="w-3 h-3 opacity-40" />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log In</a>
            <button className="px-4 py-2 rounded text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "#0f2244" }}>
              Book a Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, #0a1628 0%, #0f2244 50%, #1e3a6e 100%)" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute border border-white rounded-full" style={{ width: `${(i + 1) * 180}px`, height: `${(i + 1) * 180}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 1 - i * 0.1 }} />
          ))}
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full blur-3xl" style={{ background: "#b8922a" }} />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold mb-8 border" style={{ background: "rgba(184,146,42,0.1)", color: "#d4a843", borderColor: "rgba(184,146,42,0.25)" }}>
              <Globe2 className="w-3.5 h-3.5" />
              Employer of Record, Payroll & BGV across 50+ countries
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              The Global Workforce<br />
              <span style={{ color: "#d4a843" }}>Operating System</span>
            </h1>
            <p className="text-lg mb-10 max-w-2xl leading-relaxed" style={{ color: "#94b0d4" }}>
              Hire, pay, and manage workers in any country. Contracts, payroll, compliance, and background verification — in one platform. No legal entities required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded text-base font-semibold text-white transition-all hover:opacity-90" style={{ background: "#b8922a" }}>
                Book a Demo
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded text-base font-semibold border border-white/20 text-white hover:bg-white/10 transition-all">
                Start Free Trial
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap gap-10">
              {[
                { value: "50+", label: "Countries covered" },
                { value: "4,200+", label: "Workers managed" },
                { value: "380+", label: "Businesses onboarded" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-extrabold text-white mb-0.5">{stat.value}</div>
                  <div className="text-sm" style={{ color: "#6b90b8" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#0f2244" }}>
              One platform. Every workforce need.
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From a single contractor in Singapore to 500 workers across 20 countries — SDP Global Pay handles the complexity so you don't have to.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Building2,
                color: "#0f2244",
                bg: "#eef2f8",
                title: "Employer of Record",
                desc: "SDP becomes the legal employer in each country. We handle employment contracts, statutory compliance, and local labour law obligations — you retain full operational control.",
                tags: ["Legal employer", "Statutory compliance", "Worker contracts"],
              },
              {
                icon: Globe2,
                color: "#b8922a",
                bg: "#fdf8ee",
                title: "Global Payroll",
                desc: "Multi-currency payroll across all supported countries. Timesheets, remuneration, deductions, and payslip generation — built for every employment type.",
                tags: ["Multi-currency", "All worker types", "Automated payslips"],
              },
              {
                icon: ShieldCheck,
                color: "#1e6b3c",
                bg: "#edf7f2",
                title: "Background Verification",
                desc: "Run police checks, right-to-work, identity verification, credit checks, and document compliance — all through Certn. Billed as a cost-plus service.",
                tags: ["Certn integration", "BGV packs", "Compliance docs"],
              },
              {
                icon: FileText,
                color: "#7c3aed",
                bg: "#f5f0ff",
                title: "Contracts & Compliance",
                desc: "Country-specific employment contract templates, digital signing, and a built-in contract gate that blocks sending until BGV and compliance requirements are met.",
                tags: ["e-Signing", "Country templates", "Contract gate"],
              },
              {
                icon: Briefcase,
                color: "#0f2244",
                bg: "#eef2f8",
                title: "HRMS Add-On",
                desc: "Hiring requests, structured onboarding, performance management, leave, and employee records — available as a subscription add-on for qualifying accounts.",
                tags: ["Onboarding", "Leave management", "Performance reviews"],
              },
              {
                icon: BarChart3,
                color: "#b8922a",
                bg: "#fdf8ee",
                title: "Reporting & Insights",
                desc: "Natural language reporting across your entire workforce. Headcount, payroll spend, contract expirations, and BGV status — surfaced without building reports manually.",
                tags: ["AI reporting", "Real-time data", "Custom exports"],
              },
            ].map((feat) => (
              <div key={feat.title} className="p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: feat.bg }}>
                  <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{feat.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {feat.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: feat.bg, color: feat.color }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EOR explainer strip */}
      <section style={{ background: "#f4f7fb" }} className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#b8922a" }}>
                Employer of Record
              </div>
              <h2 className="text-3xl font-bold leading-tight mb-6" style={{ color: "#0f2244" }}>
                Hire anyone, anywhere.<br />Without a local entity.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                When you hire a worker in Australia, the UK, Singapore, or 47 other countries, SDP becomes the legal employer in that jurisdiction. You pay us — we handle contracts, payroll taxes, statutory contributions, and compliance.
              </p>
              <div className="space-y-3">
                {[
                  "No local entity or subsidiary required",
                  "Full employment law compliance in every supported country",
                  "Workers onboarded in hours, not weeks",
                  "SDP entity name on payslips and legal documents",
                  "Your operational control is completely preserved",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#1e6b3c" }} />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Jurisdiction list mockup */}
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between" style={{ background: "#f8fafc" }}>
                <span className="text-sm font-semibold text-gray-700">Supported Countries</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: "#1e6b3c" }}>50+ active</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { flag: "🇦🇺", country: "Australia", type: "EOR + Payroll", status: "Full" },
                  { flag: "🇬🇧", country: "United Kingdom", type: "EOR + Payroll", status: "Full" },
                  { flag: "🇸🇬", country: "Singapore", type: "EOR + Payroll", status: "Full" },
                  { flag: "🇳🇿", country: "New Zealand", type: "EOR + Payroll", status: "Full" },
                  { flag: "🇵🇭", country: "Philippines", type: "EOR", status: "Full" },
                  { flag: "🇩🇪", country: "Germany", type: "EOR + Payroll", status: "Full" },
                  { flag: "🇮🇳", country: "India", type: "EOR", status: "Full" },
                ].map((row) => (
                  <div key={row.country} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-xl mr-3">{row.flag}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800">{row.country}</span>
                    </div>
                    <span className="text-xs text-gray-400 mr-4">{row.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#edf7f2", color: "#1e6b3c" }}>
                      {row.status}
                    </span>
                  </div>
                ))}
                <div className="px-5 py-3 text-center">
                  <a href="#" className="text-sm font-medium flex items-center justify-center gap-1" style={{ color: "#b8922a" }}>
                    View all 50+ countries <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Model comparison */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#0f2244" }}>
              PaaS or SaaS — your choice
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Use SDP as your employer of record globally, or bring your own legal entities in the countries where you already operate.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                badge: "PaaS",
                title: "Managed EOR",
                subtitle: "SDP is the employer",
                desc: "You hire through SDP. We handle legal employer obligations in every country — contracts, taxes, contributions, compliance. No entities needed.",
                features: ["No local entity required", "SDP entity on employment documents", "Per-contract pricing", "Full compliance outsourced to SDP"],
                color: "#0f2244",
                bg: "#eef2f8",
              },
              {
                badge: "SaaS",
                title: "Own Entity",
                subtitle: "You are the employer",
                desc: "Register your own legal entities on the platform. Use SDP as the HR and payroll software — you are the employer of record in your home market.",
                features: ["Your entity on employment documents", "Platform fee only — no per-worker EOR charge", "Full payroll and HRMS tooling", "SDP EOR still available for other countries"],
                color: "#b8922a",
                bg: "#fdf8ee",
              },
            ].map((model) => (
              <div key={model.badge} className="rounded-xl p-7 border" style={{ borderColor: model.bg === "#eef2f8" ? "#dbe4f0" : "#f0e0b8" }}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: model.color }}>
                    {model.badge}
                  </span>
                  <h3 className="font-bold text-gray-900">{model.title}</h3>
                  <span className="text-xs text-gray-400">{model.subtitle}</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{model.desc}</p>
                <ul className="space-y-2.5">
                  {model.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: model.color }} />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security / trust bar */}
      <section className="py-12 border-t border-b border-gray-100" style={{ background: "#f4f7fb" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Lock, label: "SOC 2 Type II", sub: "In progress" },
              { icon: ShieldCheck, label: "GDPR Compliant", sub: "EU data residency" },
              { icon: Globe2, label: "50+ Jurisdictions", sub: "Ongoing compliance" },
              { icon: Landmark, label: "Regulated Payments", sub: "AML/KYC compliant" },
            ].map((trust) => (
              <div key={trust.label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#eef2f8" }}>
                  <trust.icon className="w-5 h-5" style={{ color: "#0f2244" }} />
                </div>
                <div className="font-semibold text-sm text-gray-800">{trust.label}</div>
                <div className="text-xs text-gray-400">{trust.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(160deg, #0a1628, #1e3a6e)" }} className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-5">
            Ready to build your global workforce?
          </h2>
          <p className="text-lg mb-10" style={{ color: "#94b0d4" }}>
            Talk to our team and get a tailored walkthrough for your company's headcount, countries, and worker types.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="flex items-center justify-center gap-2 px-7 py-4 rounded text-base font-semibold text-white" style={{ background: "#b8922a" }}>
              Book a Demo <ArrowRight className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-center gap-2 px-7 py-4 rounded text-base font-semibold border border-white/20 text-white hover:bg-white/10 transition-all">
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#0f2244" }}>
              <span className="text-white font-bold text-xs">SDP</span>
            </div>
            <span className="font-bold text-sm" style={{ color: "#0f2244" }}>SDP <span style={{ color: "#b8922a" }}>Global Pay</span></span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            {["Solutions", "Pricing", "Country Guide", "Privacy", "Terms", "Contact Sales"].map((item) => (
              <a key={item} href="#" className="hover:text-gray-600 transition-colors">{item}</a>
            ))}
          </div>
          <p className="text-xs text-gray-400">© 2026 SDP Solutions Ltd.</p>
        </div>
      </footer>

    </div>
  );
}
