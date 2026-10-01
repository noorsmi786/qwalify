import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap,
  ArrowRight,
  MessageSquare,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Flame,
  Globe,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  const features = [
    {
      icon: <MessageSquare className="w-6 h-6 text-violet-400" />,
      title: 'WhatsApp-Native AI SDR',
      description:
        'Engage incoming WhatsApp leads 24/7 in under 3 seconds. The AI texts like a top-tier human rep with short, natural messages.',
      tag: 'Core Engine',
      glow: 'from-violet-600/20 to-transparent',
    },
    {
      icon: <Flame className="w-6 h-6 text-red-400" />,
      title: 'Intelligent Lead Scoring (0-100)',
      description:
        'Automatically identifies buying intent, budget, team size, and urgency. Classifies prospects dynamically as Cold, Warm, or Hot.',
      tag: 'Real-Time',
      glow: 'from-red-600/20 to-transparent',
    },
    {
      icon: <Calendar className="w-6 h-6 text-teal-400" />,
      title: 'Autonomous Demo Booking',
      description:
        'Once a lead qualifies as high-intent, the AI sends your Calendly, Cal.com, or custom meeting link and creates a booking record instantly.',
      tag: 'Conversion',
      glow: 'from-teal-600/20 to-transparent',
    },
    {
      icon: <Cpu className="w-6 h-6 text-amber-400" />,
      title: 'Bring Your Own AI (BYOK)',
      description:
        'Zero vendor lock-in. Connect Google Gemini (Free), OpenAI GPT-4o, Groq Llama 3.3, Claude, or OpenRouter with your own API keys.',
      tag: 'Flexible',
      glow: 'from-amber-600/20 to-transparent',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
      title: 'Live Conversation Transcripts',
      description:
        'View complete chat histories, extracted prospect budget/timeline data, and take over chats manually at any point.',
      tag: 'Visibility',
      glow: 'from-blue-600/20 to-transparent',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Isolated Multi-Tenant Security',
      description:
        'Strict Row-Level Security (RLS) guarantees complete data privacy between workspaces. Your leads belong strictly to you.',
      tag: 'Enterprise Ready',
      glow: 'from-emerald-600/20 to-transparent',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Scan QR to Link WhatsApp',
      desc: 'Connect your business or personal WhatsApp number in 5 seconds via standard QR scan.',
    },
    {
      number: '02',
      title: 'Set Qualification Rules',
      desc: 'Define what questions matter (budget, timeline, scale) and connect your meeting link.',
    },
    {
      number: '03',
      title: 'Convert Leads on Autopilot',
      desc: 'The AI qualifies inbound prospects 24/7 and books qualified calls straight onto your calendar.',
    },
  ];

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      {/* ─── Top Glow Background ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-violet-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[400px] bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-0 w-[500px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      {/* ─── Header / Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-navy-950/70 border-b border-navy-800/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold gradient-brand-text tracking-tight">Qwalify</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-200 transition-colors">
              How It Works
            </a>
            <a href="#providers" className="hover:text-slate-200 transition-colors">
              AI Engines
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-600/25 hover:shadow-violet-500/35 transition-all flex items-center gap-1.5"
              >
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-navy-800/60 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-600/25 hover:shadow-violet-500/35 transition-all flex items-center gap-1.5"
                >
                  Start Free <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Tag badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-300"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>AI Sales Development Representative for WhatsApp</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.15]"
          >
            Turn WhatsApp Inquiries into{' '}
            <span className="gradient-brand-text">Booked Sales Calls</span> on Autopilot
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed"
          >
            Qwalify answers WhatsApp prospects in seconds, politely qualifies their budget and timeline with natural human conversation, and schedules meetings straight into your calendar.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base shadow-xl shadow-violet-600/30 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              Get Started for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-navy-700 bg-navy-800/60 hover:bg-navy-800 text-slate-300 hover:text-white font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Trust points */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" /> Free to start
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" /> Connects in 1 minute
            </span>
          </div>

          {/* ─── Interactive Mockup UI Preview ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-12 rounded-2xl border border-navy-700 bg-navy-900/90 shadow-2xl shadow-violet-900/10 p-4 md:p-6 backdrop-blur-xl text-left max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-teal-500/80" />
                <span className="text-xs text-slate-500 font-mono ml-2">Live WhatsApp Qualification Session</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span className="text-xs font-mono font-semibold text-teal-400">AI SDR Active</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Chat Simulation */}
              <div className="md:col-span-2 space-y-3.5 bg-navy-950/60 p-4 rounded-xl border border-navy-800/80">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] text-slate-500 ml-1">Prospect · +1 (555) 019-2831</span>
                  <div className="bg-navy-800 text-slate-200 text-xs px-3.5 py-2 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed border border-navy-700">
                    Hi! We are looking for an automated sales solution for our 15-person team. What is your pricing?
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-violet-400 mr-1">Qwalify AI · Just now</span>
                  <div className="bg-violet-600/20 border border-violet-500/30 text-violet-100 text-xs px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed">
                    Hey Sarah! 👋 We'd love to help your 15-person team scale. What is your target timeline for launching this?
                  </div>
                </div>

                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] text-slate-500 ml-1">Prospect</span>
                  <div className="bg-navy-800 text-slate-200 text-xs px-3.5 py-2 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed border border-navy-700">
                    We want to get started by next Monday. We have a budget around $2,500/mo.
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-violet-400 mr-1">Qwalify AI · Instant reply</span>
                  <div className="bg-violet-600/20 border border-violet-500/30 text-violet-100 text-xs px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed">
                    That fits perfectly. Let's get you set up — pick a 15-min intro slot that works for you: <span className="underline font-mono text-teal-300">calendly.com/acme/demo</span> 📅
                  </div>
                </div>
              </div>

              {/* Real-time Lead Card Assessment */}
              <div className="bg-navy-800/40 border border-navy-700/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300">Lead Intelligence</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider">
                      🔥 Hot Lead
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-navy-700/60">
                      <span className="text-slate-500">Qualification Score</span>
                      <span className="font-mono font-bold text-teal-400">88 / 100</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-navy-700/60">
                      <span className="text-slate-500">Team Size</span>
                      <span className="font-medium text-slate-200">15 people</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-navy-700/60">
                      <span className="text-slate-500">Timeline</span>
                      <span className="font-medium text-slate-200">Next Monday</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-navy-700/60">
                      <span className="text-slate-500">Budget Range</span>
                      <span className="font-medium text-slate-200">$2,500 / mo</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Booking Status</span>
                      <span className="font-semibold text-teal-300">Link Sent ✅</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-center">
                  <p className="text-[11px] text-teal-300 font-medium">✨ Automatically added to Appointments</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Metric Strip ───────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-navy-800 bg-navy-900/40 py-10 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl md:text-4xl font-extrabold text-violet-400 font-mono">&lt; 3s</p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">Average Response Time</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-extrabold text-teal-400 font-mono">24/7</p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">Non-Stop Qualification</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-extrabold text-amber-400 font-mono">4.2x</p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">More Booked Demos</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-extrabold text-red-400 font-mono">0</p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">Lost Late-Night Leads</p>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Built for High Conversion</h2>
            <p className="text-3xl md:text-4xl font-bold text-slate-100">
              Everything you need to turn chat traffic into paying customers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-navy-700/80 bg-navy-900/50 p-6 hover:border-violet-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/10 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-navy-800 border border-navy-700 group-hover:scale-105 transition-transform">
                      {f.icon}
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-navy-800 text-slate-400 border border-navy-700">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 group-hover:text-violet-300 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-20 bg-navy-900/30 border-t border-navy-800 px-6">
        <div className="max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-semibold text-teal-400 uppercase tracking-widest">Fast Setup</h2>
            <p className="text-3xl md:text-4xl font-bold text-slate-100">Live in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative rounded-2xl border border-navy-700 bg-navy-900/60 p-6 space-y-4">
                <span className="text-4xl font-extrabold font-mono text-violet-500/30">{step.number}</span>
                <h3 className="text-lg font-semibold text-slate-100">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Providers Banner ────────────────────────────────────────── */}
      <section id="providers" className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-600/10 to-navy-900 p-8 md:p-12 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
            <Globe className="w-6 h-6" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100">
            Plug in your favorite AI Model in 1-Click
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            Support for Google Gemini (Flash & Pro), OpenAI GPT-4o, Groq Llama 3.3, Anthropic Claude, and OpenRouter. Use our built-in engine or bring your own keys.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {['Google Gemini', 'OpenAI GPT-4o', 'Groq (Ultra-Fast)', 'Anthropic Claude', 'OpenRouter'].map((p) => (
              <span key={p} className="px-3 py-1 rounded-lg bg-navy-800/80 border border-navy-600 text-xs font-medium text-slate-300">
                ⚡ {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 border-t border-navy-800">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100">
            Start qualifying your WhatsApp leads today
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Create your free workspace in 30 seconds. No credit card needed.
          </p>
          <div className="pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base shadow-xl shadow-violet-600/30 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all"
            >
              Create Free Workspace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-navy-800 bg-navy-950 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-300">Qwalify</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-300 transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-slate-300 transition-colors">
              Sign Up
            </Link>
            <Link to="/features" className="hover:text-slate-300 transition-colors">
              Features & Guide
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
