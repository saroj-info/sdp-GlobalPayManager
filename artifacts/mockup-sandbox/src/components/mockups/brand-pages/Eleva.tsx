import { ArrowRight, CheckCircle2, Smartphone, TrendingUp, Users, Star, ChevronRight, Wallet, BookOpen, Bell, Shield, Zap, Award, Clock } from "lucide-react";

export function Eleva() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              <span className="text-white font-bold text-sm">e</span>
            </div>
            <span className="text-xl font-bold" style={{ color: "#2e1065" }}>eleva</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Community", "Financial Tools", "Independence", "Download App"].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log In</a>
            <button className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              Join Eleva
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #1e0754 0%, #4c1d95 50%, #7c3aed 100%)" }}>
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-10 left-10 w-80 h-80 rounded-full blur-3xl" style={{ background: "#f97316" }} />
          <div className="absolute bottom-0 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: "#a855f7" }} />
        </div>

        {/* Floating worker cards */}
        <div className="absolute top-16 right-8 hidden lg:flex flex-col gap-3">
          {[
            { name: "Priya M.", role: "Healthcare — Sydney", note: "Paid Friday ✓", color: "#f97316" },
            { name: "James T.", role: "IT Contractor — London", note: "Pay in 2 days", color: "#a855f7" },
            { name: "Maria C.", role: "Nurse — Auckland", note: "Paid Friday ✓", color: "#ec4899" },
          ].map((card) => (
            <div key={card.name} className="flex items-center gap-2.5 px-3 py-2 rounded-xl backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: card.color }}>
                {card.name[0]}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{card.name}</div>
                <div className="text-xs text-white/60">{card.role}</div>
              </div>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium text-white/90" style={{ background: "rgba(255,255,255,0.15)" }}>
                {card.note}
              </span>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto px-6 py-24 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ background: "rgba(249,115,22,0.2)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)" }}>
              <Zap className="w-3.5 h-3.5" />
              The platform built for working on your own terms
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              Your work.<br />
              Your pay.<br />
              <span style={{ color: "#f97316" }}>Your independence.</span>
            </h1>
            <p className="text-lg mb-10 max-w-lg leading-relaxed" style={{ color: "#d8b4fe" }}>
              See your pay, sign contracts, manage your career, and build financial independence — all in one place. Built by the people behind SDP Global Pay, for the workers who power it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-base font-semibold text-white transition-all hover:opacity-90" style={{ background: "#f97316" }}>
                Join Eleva Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-base font-semibold text-white border border-white/20 hover:bg-white/10 transition-all">
                <Smartphone className="w-4 h-4" />
                Download the App
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["#f97316", "#7c3aed", "#ec4899", "#a855f7", "#10b981"].map((color, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>
                    {["P", "J", "M", "A", "S"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current text-yellow-400" />)}
                </div>
                <span className="text-xs" style={{ color: "#c4b5fd" }}>Trusted by 4,200+ workers globally</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Independence section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#7c3aed" }}>
                Financial Independence
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#2e1065" }}>
                Contract work can<br />build real wealth.<br />
                <span style={{ color: "#7c3aed" }}>Eleva shows you how.</span>
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Working independently shouldn't mean working blind. Eleva gives you the same financial clarity and tools that full-time employees take for granted — and more. Know what you earn, where it goes, and how to make it work harder.
              </p>
              <div className="space-y-3">
                {[
                  "See your exact pay date from the moment your timesheet is approved",
                  "Estimate your annual tax before it's due — never be caught short",
                  "Track earnings week by week and see your trajectory",
                  "Benchmark your pay against market rates for your role",
                  "Set savings goals and watch them grow against your income",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#7c3aed" }} />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial dashboard mockup */}
            <div className="rounded-2xl overflow-hidden border shadow-xl" style={{ borderColor: "#e9d5ff" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "#c4b5fd" }}>Your financial snapshot</div>
                  <div className="text-xl font-bold text-white">$3,840.00 this week</div>
                </div>
                <TrendingUp className="w-6 h-6" style={{ color: "#c4b5fd" }} />
              </div>
              <div className="p-5 bg-white space-y-3">
                {[
                  { label: "YTD Earnings", value: "$84,320", change: "+12% vs last year", positive: true },
                  { label: "Tax Estimate (FY)", value: "$19,840", change: "Based on current rate", positive: null },
                  { label: "Savings Goal", value: "67% complete", change: "Emergency fund — $10k", positive: true },
                  { label: "Market Rate", value: "You're 8% above", change: "For your role in Sydney", positive: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#faf5ff" }}>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">{row.label}</div>
                      <div className="text-sm font-bold" style={{ color: "#2e1065" }}>{row.value}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={row.positive === true ? { background: "#d1fae5", color: "#065f46" } : row.positive === false ? { background: "#fee2e2", color: "#991b1b" } : { background: "#f3f4f6", color: "#6b7280" }}>
                      {row.change}
                    </span>
                  </div>
                ))}
                <div className="pt-1 pb-1 px-3 rounded-xl text-center text-sm font-semibold" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                  Next pay: Friday 18 Apr — $3,840.00
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value pillars */}
      <section className="py-20" style={{ background: "#faf5ff" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#2e1065" }}>
              Everything a worker needs —<br />in one place
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From your first contract to financial independence and a connected community — Eleva is built for the long game.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Wallet, color: "#7c3aed", bg: "#ede9fe", title: "Pay Visibility", desc: "Know exactly when you'll be paid and why — full payslip breakdown, every period." },
              { icon: BookOpen, color: "#a855f7", bg: "#f5f3ff", title: "Contracts & Leave", desc: "Sign contracts and manage leave from your phone. No printing, no chasing." },
              { icon: TrendingUp, color: "#f97316", bg: "#ffedd5", title: "Financial Freedom", desc: "Tax estimator, earnings tracker, savings goals, and salary benchmarking — all free." },
              { icon: Users, color: "#ec4899", bg: "#fce7f3", title: "Worker Community", desc: "Connect with 4,200+ workers. Share advice, find opportunities, grow together." },
            ].map((feat) => (
              <div key={feat.title} className="bg-white rounded-2xl p-6 border hover:shadow-md transition-shadow" style={{ borderColor: "#e9d5ff" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: feat.bg }}>
                  <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pay transparency */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#7c3aed" }}>
                No more chasing
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#2e1065" }}>
                Always know<br />where your pay is
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Your pay timeline is always live. See every step — from submitted timesheet to approved to processing to paid — with exact dates and amounts.
              </p>
              <div className="space-y-3">
                {[
                  "Pay date shown the moment your timesheet is approved",
                  "Push notification when your payment is sent",
                  "Full payslip breakdown — gross, tax, net, super",
                  "12-month earnings history with trends",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#7c3aed" }} />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pay timeline */}
            <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ borderColor: "#e9d5ff" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "#c4b5fd" }}>Current pay period</div>
                  <div className="text-lg font-bold text-white">$3,840.00 net</div>
                </div>
                <Bell className="w-5 h-5" style={{ color: "#c4b5fd" }} />
              </div>
              <div className="p-5 bg-white">
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />
                  {[
                    { label: "Timesheet submitted", date: "Mon 14 Apr", done: true },
                    { label: "Manager approved", date: "Tue 15 Apr — 9:42am", done: true },
                    { label: "Payroll processing", date: "Thu 17 Apr — 3pm cutoff", done: true },
                    { label: "Payment sent", date: "Fri 18 Apr — 6am", done: true },
                    { label: "In your account", date: "Fri 18 Apr — by 11am", done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4 mb-4 relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ background: step.done ? "#7c3aed" : "#f3f4f6", border: step.done ? "none" : "2px solid #e5e7eb" }}>
                        {step.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                      <div className="pt-1">
                        <div className="text-sm font-medium" style={{ color: step.done ? "#1f2937" : "#9ca3af" }}>{step.label}</div>
                        <div className="text-xs" style={{ color: step.done ? "#6b7280" : "#d1d5db" }}>{step.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-3 rounded-xl text-center text-sm font-semibold" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                  $3,840.00 arriving Friday by 11am
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="py-20" style={{ background: "#faf5ff" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Community feed */}
            <div className="rounded-2xl overflow-hidden border shadow-lg bg-white" style={{ borderColor: "#e9d5ff" }}>
              <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ background: "#faf5ff", borderColor: "#e9d5ff" }}>
                <Users className="w-4 h-4" style={{ color: "#7c3aed" }} />
                <span className="text-sm font-semibold" style={{ color: "#2e1065" }}>Eleva Community</span>
                <span className="ml-auto text-xs text-gray-400">4,200+ members</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { name: "Priya M.", role: "Healthcare · Sydney", text: "Two years contracting through Eleva. The financial tools helped me save more than I ever did on a salary — the tax estimator alone was worth it.", reactions: "❤️ 47", color: "#f97316" },
                  { name: "James T.", role: "IT Contractor · London", text: "The independence dashboard is genuinely eye-opening. Seeing my YTD earnings against my savings goals in one place changed how I think about contracts.", reactions: "👍 31", color: "#7c3aed" },
                  { name: "Maria C.", role: "Nurse · Auckland", text: "I used to email every week asking about my pay. Now I just check the timeline and know exactly where things are. Life-changing honestly.", reactions: "🙌 22", color: "#ec4899" },
                ].map((post) => (
                  <div key={post.name} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ background: post.color }}>
                        {post.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800">{post.name}</span>
                          <span className="text-xs text-gray-400">{post.role}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">{post.text}</p>
                        <span className="text-xs text-gray-400">{post.reactions}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#f97316" }}>
                You're not alone
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#2e1065" }}>
                Independent work<br />is better with<br />a community
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Eleva connects you with thousands of workers who've chosen to work on their own terms. Share knowledge, find opportunities, and build the career — and the life — you want.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, color: "#7c3aed", label: "Industry groups", sub: "Connect by sector and location" },
                  { icon: TrendingUp, color: "#f97316", label: "Salary benchmarks", sub: "Know what you're worth" },
                  { icon: Award, color: "#ec4899", label: "Career tracking", sub: "Skills, roles, growth over time" },
                  { icon: Shield, color: "#a855f7", label: "Financial products", sub: "Loans, insurance, super — for members" },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-white border hover:shadow-sm transition-shadow" style={{ borderColor: "#e9d5ff" }}>
                    <item.icon className="w-5 h-5 mb-2" style={{ color: item.color }} />
                    <div className="text-sm font-semibold text-gray-800 mb-0.5">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "linear-gradient(160deg, #1e0754, #7c3aed)" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-5">
            Join 4,200+ workers building independence with Eleva
          </h2>
          <p className="text-lg mb-10" style={{ color: "#d8b4fe" }}>
            Free to join. Your pay, your career, your terms.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button className="flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base font-semibold text-white" style={{ background: "#f97316" }}>
              Join Eleva Free <ArrowRight className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base font-semibold text-white border border-white/20 hover:bg-white/10 transition-all">
              <Smartphone className="w-4 h-4" /> Download the App
            </button>
          </div>
          <p className="text-sm" style={{ color: "#c4b5fd" }}>Already a member? <a href="#" className="text-white underline">Log in</a></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#7c3aed" }}>
              <span className="text-white font-bold text-xs">e</span>
            </div>
            <span className="font-bold text-sm" style={{ color: "#2e1065" }}>eleva</span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            {["Features", "Community", "Financial Tools", "Privacy", "Terms", "Contact"].map((item) => (
              <a key={item} href="#" className="hover:text-gray-600 transition-colors">{item}</a>
            ))}
          </div>
          <p className="text-xs text-gray-400">© 2026 Eleva · Powered by SDP Solutions Ltd.</p>
        </div>
      </footer>

    </div>
  );
}
