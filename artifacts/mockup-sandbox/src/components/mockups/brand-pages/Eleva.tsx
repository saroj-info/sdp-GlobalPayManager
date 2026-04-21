import { ArrowRight, CheckCircle2, Smartphone, TrendingUp, Users, Heart, Star, ChevronRight, Wallet, BookOpen, Bell, Shield } from "lucide-react";

export function Eleva() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
              <span className="text-white font-bold text-sm">e</span>
            </div>
            <span className="text-xl font-bold" style={{ color: "#0f3d3a" }}>
              eleva
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Community", "Financial Tools", "Download App"].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log In</a>
            <button className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
              Join Eleva
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0f3d3a 0%, #0d6e68 50%, #0891b2 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-80 h-80 rounded-full blur-3xl" style={{ background: "#f97316" }} />
          <div className="absolute bottom-0 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: "#0891b2" }} />
        </div>

        {/* Floating community avatars */}
        <div className="absolute top-16 right-8 hidden lg:flex flex-col gap-3">
          {[
            { name: "Priya M.", role: "Healthcare — Sydney", pay: "Paid Friday ✓", color: "#f97316" },
            { name: "James T.", role: "IT Contractor — London", pay: "Pay in 2 days", color: "#0d9488" },
            { name: "Maria C.", role: "Nurse — Auckland", pay: "Paid Friday ✓", color: "#8b5cf6" },
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
                {card.pay}
              </span>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto px-6 py-24 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.25)" }}>
              <Heart className="w-3.5 h-3.5" />
              The worker community built for people like you
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              Your work.<br />
              Your pay.<br />
              <span style={{ color: "#f97316" }}>Your community.</span>
            </h1>
            <p className="text-lg text-teal-100 mb-10 max-w-lg leading-relaxed">
              See your pay, sign your contracts, manage your leave, and connect with thousands of workers across industries — all in one place. Built by workers, for workers.
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
                {["#f97316", "#0d9488", "#8b5cf6", "#0891b2", "#10b981"].map((color, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>
                    {["P", "J", "M", "A", "S"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current text-yellow-400" />)}
                </div>
                <span className="text-xs text-teal-200">Trusted by 4,200+ workers globally</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value pillars */}
      <section className="py-20" style={{ background: "#f0fdf9" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "#0f3d3a" }}>
              Everything a worker needs —<br />in one place
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From your first contract to building a career, financial security, and a community — Eleva is with you every step.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Wallet,
                color: "#0d9488",
                bg: "#ccfbf1",
                title: "Pay Visibility",
                desc: "See exactly when you'll be paid, how much, and a full breakdown of your payslip — no more guessing.",
              },
              {
                icon: BookOpen,
                color: "#0891b2",
                bg: "#e0f2fe",
                title: "Contracts & Leave",
                desc: "Sign contracts, check your leave balance, and request time off — from your phone in seconds.",
              },
              {
                icon: TrendingUp,
                color: "#f97316",
                bg: "#ffedd5",
                title: "Financial Wellbeing",
                desc: "Track earnings, estimate your tax, set savings goals, and benchmark your pay against the market.",
              },
              {
                icon: Users,
                color: "#8b5cf6",
                bg: "#ede9fe",
                title: "Worker Community",
                desc: "Connect with others in your industry, share advice, find opportunities, and grow your career together.",
              },
            ].map((feat) => (
              <div key={feat.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
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

      {/* Pay transparency section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#0d9488" }}>
                No more chasing
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#0f3d3a" }}>
                Always know<br />where your pay is
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Your pay timeline is always live. See every step — from submitted timesheet to approved to processing to paid — with exact dates and amounts. No more emails asking "where's my pay?"
              </p>
              <div className="space-y-3">
                {[
                  "Pay date shown the moment your timesheet is approved",
                  "Push notification when your pay is on its way",
                  "Full payslip breakdown — gross, tax, net, super",
                  "12-month earnings history with trend charts",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#0d9488" }} />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pay timeline mockup */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-lg">
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
                <div>
                  <div className="text-xs text-teal-200 mb-0.5">Current pay period</div>
                  <div className="text-lg font-bold text-white">$3,840.00 net</div>
                </div>
                <Bell className="w-5 h-5 text-white/70" />
              </div>
              <div className="p-5 bg-white">
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5" style={{ background: "#e5e7eb" }} />
                  {[
                    { label: "Timesheet submitted", date: "Mon 14 Apr", done: true, color: "#10b981" },
                    { label: "Manager approved", date: "Tue 15 Apr — 9:42am", done: true, color: "#10b981" },
                    { label: "Payroll processing", date: "Thu 17 Apr — 3pm cutoff", done: true, color: "#10b981" },
                    { label: "Payment sent", date: "Fri 18 Apr — 6am", done: true, color: "#0d9488" },
                    { label: "In your account", date: "Fri 18 Apr — by 11am", done: false, color: "#f97316" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4 mb-4 relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ background: step.done ? step.color : "#f3f4f6", border: step.done ? "none" : "2px solid #e5e7eb" }}>
                        {step.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                      <div className="pt-1">
                        <div className="text-sm font-medium" style={{ color: step.done ? "#1f2937" : "#9ca3af" }}>{step.label}</div>
                        <div className="text-xs" style={{ color: step.done ? "#6b7280" : "#d1d5db" }}>{step.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-xl text-center text-sm font-semibold" style={{ background: "#f0fdf9", color: "#0d9488" }}>
                  $3,840.00 arriving Friday by 11am
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community section */}
      <section className="py-20" style={{ background: "#f0fdf9" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Community feed mockup */}
            <div className="rounded-2xl overflow-hidden border border-teal-100 shadow-lg bg-white">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2" style={{ background: "#f0fdf9" }}>
                <Users className="w-4 h-4" style={{ color: "#0d9488" }} />
                <span className="text-sm font-semibold" style={{ color: "#0f3d3a" }}>Eleva Community</span>
                <span className="ml-auto text-xs text-gray-400">4,200+ members</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { name: "Priya M.", role: "Healthcare · Sydney", text: "Just hit my 2-year contracting anniversary through Eleva. The financial tools have genuinely helped me save more than I ever did on PAYG.", reactions: "❤️ 47", color: "#f97316" },
                  { name: "James T.", role: "IT Contractor · London", text: "Anyone else using the tax estimator? Saved me from a nasty surprise at end of year. Really useful for contractors.", reactions: "👍 31", color: "#0891b2" },
                  { name: "Maria C.", role: "Nurse · Auckland", text: "The geo check-in on the app is so much better than the paper sheets we used to use. My agency loves it too.", reactions: "🙌 22", color: "#8b5cf6" },
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
                The community is the moat
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: "#0f3d3a" }}>
                You're not alone in<br />contract work
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Eleva connects you with thousands of workers in your industry. Share knowledge, find opportunities, get advice — and build a career, not just a job.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, label: "Industry groups", sub: "Connect by sector and location" },
                  { icon: TrendingUp, label: "Salary benchmarks", sub: "See how your pay compares" },
                  { icon: BookOpen, label: "Career advice", sub: "From people who've been there" },
                  { icon: Heart, label: "Referral rewards", sub: "Earn when you bring others in" },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-white border border-gray-100 hover:shadow-sm transition-shadow">
                    <item.icon className="w-5 h-5 mb-2" style={{ color: "#0d9488" }} />
                    <div className="text-sm font-semibold text-gray-800 mb-0.5">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Financial tools strip */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#0d9488" }}>Financial Wellbeing</div>
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#0f3d3a" }}>
            Your money, working harder for you
          </h2>
          <p className="text-gray-500 mb-12 max-w-xl mx-auto">
            Free financial tools designed specifically for contractors and workers — not employees on a fixed salary.
          </p>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { icon: TrendingUp, color: "#0d9488", bg: "#ccfbf1", title: "Earnings Tracker", desc: "Week-by-week pay history, trends, and projections based on your contract rate." },
              { icon: Shield, color: "#0891b2", bg: "#e0f2fe", title: "Tax Estimator", desc: "Know your estimated annual tax before it's due — especially useful for contractors." },
              { icon: Wallet, color: "#f97316", bg: "#ffedd5", title: "Budget Planner", desc: "Set a monthly budget, track income vs spending, stay on top of your finances." },
              { icon: Star, color: "#8b5cf6", bg: "#ede9fe", title: "Financial Products", desc: "Personal loans, income protection, super consolidation — negotiated for Eleva members." },
            ].map((tool) => (
              <div key={tool.title} className="p-5 rounded-2xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: tool.bg }}>
                  <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                </div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{tool.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "linear-gradient(160deg, #0f3d3a, #0891b2)" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-5">
            Join 4,200+ workers already on Eleva
          </h2>
          <p className="text-lg mb-10 text-teal-100">
            Free to join. No credit card. Available on iOS and Android.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button className="flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base font-semibold text-white" style={{ background: "#f97316" }}>
              Join Eleva Free <ArrowRight className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base font-semibold text-white border border-white/20 hover:bg-white/10 transition-all">
              <Smartphone className="w-4 h-4" /> Download the App
            </button>
          </div>
          <p className="text-sm text-teal-300">Already a member? <a href="#" className="text-white underline">Log in</a></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#0d9488" }}>
              <span className="text-white font-bold text-xs">e</span>
            </div>
            <span className="font-bold text-sm" style={{ color: "#0f3d3a" }}>eleva</span>
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
