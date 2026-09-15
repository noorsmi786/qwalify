import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Zap,
  MessageSquare,
  Clock,
  Calendar,
  Users,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Sliders,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ─── Feature Modules Data for Non-Technical Users ─────────────────────────────

interface FeatureModule {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  tagline: string;
  whatItDoes: string;
  howItHelpsYou: string;
  stepByStep: { step: string; title: string; desc: string }[];
  configureRoute: string;
  configureButtonText: string;
  tips: string[];
}

const FEATURE_MODULES: FeatureModule[] = [
  {
    id: 'ai-engine',
    title: '1. AI Conversational Qualification',
    badge: 'Core Engine',
    badgeColor: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    icon: <Bot className="w-5 h-5 text-violet-400" />,
    tagline: 'Never lose a lead while you sleep — AI replies in seconds & qualifies buying intent.',
    whatItDoes:
      'When a prospect messages your business on WhatsApp or Telegram, Qwalify’s AI immediately answers like a top sales rep. It asks about their budget, timeline, and company size, extracts structured answers, and scores them from 0 to 100.',
    howItHelpsYou:
      'You only spend time talking to ready-to-buy customers instead of wasting hours asking repetitive questions to tire-kickers.',
    stepByStep: [
      {
        step: '1',
        title: 'Choose an AI Provider',
        desc: 'Pick Google Gemini (Free), Groq (Free & Fast), OpenAI, Claude, or OpenRouter in Settings.',
      },
      {
        step: '2',
        title: 'Paste your API Key',
        desc: 'Qwalify automatically fetches the latest live models for you with zero manual setup.',
      },
      {
        step: '3',
        title: 'Customize Questions',
        desc: 'Under Settings → Qualification, choose the exact questions the AI asks your prospects.',
      },
    ],
    configureRoute: '/settings',
    configureButtonText: 'Configure AI Provider',
    tips: [
      'Want 100% free AI? Choose Google Gemini or Groq — both offer generous free tiers.',
      'Test your prompt anytime using the Live Simulator on the AI Providers settings tab.',
    ],
  },
  {
    id: 'lead-scoring',
    title: '2. Smart Lead Scoring (Cold / Warm / Hot)',
    badge: 'Pipeline Intelligence',
    badgeColor: 'bg-red-500/10 text-red-300 border-red-500/20',
    icon: <Zap className="w-5 h-5 text-red-400" />,
    tagline: 'Automatic classification from 0 to 100 based on prospect answers.',
    whatItDoes:
      'As the conversation progresses, the AI assigns points based on budget approval, urgent timeline, and decision-maker status. Leads are automatically categorized as Hot (75+), Warm (45-74), or Cold (<45).',
    howItHelpsYou:
      'Your sales team receives instant notifications when a "Hot" lead is identified so you can jump in and close the deal immediately.',
    stepByStep: [
      {
        step: '1',
        title: 'Review Score Thresholds',
        desc: 'Go to Settings → Qualification to adjust the Hot and Warm score cutoffs.',
      },
      {
        step: '2',
        title: 'Assign Question Weights',
        desc: 'Give higher points to high-value criteria (e.g. Budget = 30 pts, Timeline = 20 pts).',
      },
      {
        step: '3',
        title: 'Track Lead Gauges',
        desc: 'Open any lead in the Leads tab to see their visual gauge and score progression timeline.',
      },
    ],
    configureRoute: '/settings',
    configureButtonText: 'Set Qualification Rules',
    tips: [
      'Hot leads can automatically trigger the appointment booking link.',
      'Any human rep can override the AI score or status with 1 click.',
    ],
  },
  {
    id: 'channels',
    title: '3. Multi-Channel Inbound (WhatsApp & Telegram)',
    badge: 'Omnichannel',
    badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    icon: <MessageSquare className="w-5 h-5 text-teal-400" />,
    tagline: 'Connect the apps your customers already use every day.',
    whatItDoes:
      'Connect WhatsApp via Evolution API (QR code or API key) or Telegram via your Bot Token. All messages flow into one unified inbox where AI handles qualification.',
    howItHelpsYou:
      'No need to manage multiple messaging apps on your phone. Everything is centralized, logged, and organized in Qwalify.',
    stepByStep: [
      {
        step: '1',
        title: 'For Telegram',
        desc: 'Create a free bot with @BotFather on Telegram, paste your token, and click "Register Webhook".',
      },
      {
        step: '2',
        title: 'For WhatsApp',
        desc: 'Enter your Evolution API URL and instance key under Settings → Channels.',
      },
      {
        step: '3',
        title: 'Start Receiving Leads',
        desc: 'Share your WhatsApp number or Telegram link — incoming messages will show up in real-time!',
      },
    ],
    configureRoute: '/settings',
    configureButtonText: 'Connect Channels',
    tips: [
      'Telegram setup takes under 30 seconds and requires no phone verification.',
      'Email & Slack integrations are coming in upcoming updates.',
    ],
  },
  {
    id: 'followups',
    title: '4. Automated Follow-Up Sequences',
    badge: 'Revenue Recovery',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    icon: <Clock className="w-5 h-5 text-amber-400" />,
    tagline: '80% of sales require 5+ follow-ups. Qwalify does them automatically.',
    whatItDoes:
      'If a lead stops replying after initial chat, Qwalify enters them into a customizable follow-up sequence: daily check-ins for Week 1, weekly nurture messages through Week 8, and a final cooling message.',
    howItHelpsYou:
      'Stops leads from falling through the cracks. As soon as a lead replies, the sequence pauses automatically so a human or AI can continue the chat.',
    stepByStep: [
      {
        step: '1',
        title: 'Set Durations',
        desc: 'Choose how many days of daily messages and how many weeks of weekly messages you want.',
      },
      {
        step: '2',
        title: 'Personalize Templates',
        desc: 'Edit message templates with {{lead_name}} and {{company_name}} variables.',
      },
      {
        step: '3',
        title: 'Monitor Countdowns',
        desc: 'Check each lead’s detail page to see their live countdown until the next message.',
      },
    ],
    configureRoute: '/settings',
    configureButtonText: 'Customize Cadence',
    tips: [
      'You can manually pause or resume follow-ups for any individual lead at any time.',
      'If a lead books a call, the sequence stops automatically.',
    ],
  },
  {
    id: 'booking',
    title: '5. Appointment & Calendar Booking',
    badge: 'Conversion Engine',
    badgeColor: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    icon: <Calendar className="w-5 h-5 text-sky-400" />,
    tagline: 'Turn qualified conversations into booked calendar demos automatically.',
    whatItDoes:
      'Connect your Calendly, Cal.com, or custom meeting link. When a prospect reaches a Hot score, Qwalify sends a friendly message inviting them to pick a meeting time on your calendar.',
    howItHelpsYou:
      'Eliminates back-and-forth emails trying to find a meeting time. Prospects book when their buying interest is highest.',
    stepByStep: [
      {
        step: '1',
        title: 'Pick Provider',
        desc: 'Select Calendly (Free), Cal.com (Free & Open Source), or any custom booking link.',
      },
      {
        step: '2',
        title: 'Paste Meeting Link',
        desc: 'Add your link (e.g. https://calendly.com/your-name/demo).',
      },
      {
        step: '3',
        title: 'View Appointments',
        desc: 'Track upcoming, completed, and rescheduled calls in the Appointments tab.',
      },
    ],
    configureRoute: '/settings',
    configureButtonText: 'Set Booking Link',
    tips: [
      'Cal.com is 100% free and open source with unlimited bookings.',
      'Sales reps can also manually send the booking link with one click during live chat.',
    ],
  },
  {
    id: 'teams',
    title: '6. Team Workspaces & Roles',
    badge: 'Collaboration',
    badgeColor: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
    icon: <Users className="w-5 h-5 text-pink-400" />,
    tagline: 'Invite sales reps, assign leads, and monitor monthly quotas together.',
    whatItDoes:
      'Manage multiple teammates under one workspace. Owners and Admins control settings and channels, while Agents can chat with prospects and manage assigned leads.',
    howItHelpsYou:
      'Seamlessly scale your sales team with role-based access control and invitation links.',
    stepByStep: [
      {
        step: '1',
        title: 'Open Workspace Settings',
        desc: 'Go to Settings → Workspace to see your team roster.',
      },
      {
        step: '2',
        title: 'Invite Teammates',
        desc: 'Click "Invite Teammate", enter their email, and select their role (Admin or Agent).',
      },
      {
        step: '3',
        title: 'Share Invite Link',
        desc: 'Copy the secure link and send it to your team member to sign up.',
      },
    ],
    configureRoute: '/settings',
    configureButtonText: 'Manage Team',
    tips: [
      'Owners have full billing and deletion authority.',
      'Usage meters show leads processed and AI turns used each month.',
    ],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeaturesGuidePage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState<string>(FEATURE_MODULES[0].id);

  const current = FEATURE_MODULES.find((f) => f.id === activeFeature) || FEATURE_MODULES[0];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-900/40 via-navy-900 to-teal-900/30 border border-violet-500/30 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-violet-400" /> Non-Technical User Guide
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            How Qwalify Works & Setup Guide
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Qwalify is designed to be simple, automated, and powerful. Explore each feature below to understand what it does, how it helps your business grow, and how to configure it in minutes.
          </p>
          <div className="pt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/onboarding')}>
              <Sparkles className="w-3.5 h-3.5" /> Run 60-Second Setup Wizard
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/settings')}>
              <Sliders className="w-3.5 h-3.5" /> Open Full Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Feature Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {FEATURE_MODULES.map((feat) => {
          const isSelected = feat.id === activeFeature;
          return (
            <button
              key={feat.id}
              type="button"
              onClick={() => setActiveFeature(feat.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'border-violet-500/60 bg-violet-600/15 shadow-[0_0_20px_rgba(124,58,237,0.15)] ring-1 ring-violet-500/40'
                  : 'border-navy-700 bg-navy-800/40 hover:border-navy-600 hover:bg-navy-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-lg bg-navy-900 border border-navy-700">
                  {feat.icon}
                </div>
                {isSelected && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
              </div>
              <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                {feat.title.replace(/^\d+\.\s*/, '')}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Feature Deep-Dive Card */}
      <Card className="border-navy-700/90 bg-navy-800/70 shadow-xl">
        <CardHeader className="border-b border-navy-700/80 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-600/15 border border-violet-500/30">
                {current.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-100">{current.title}</h2>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${current.badgeColor}`}>
                    {current.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">{current.tagline}</p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => navigate(current.configureRoute)}
              className="flex-shrink-0"
            >
              {current.configureButtonText} <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Explanation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700 space-y-1.5">
              <p className="text-xs font-semibold text-teal-400 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" /> What this feature does
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{current.whatItDoes}</p>
            </div>

            <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700 space-y-1.5">
              <p className="text-xs font-semibold text-violet-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Why it helps your business
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{current.howItHelpsYou}</p>
            </div>
          </div>

          {/* Step-by-Step Setup Guide */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-400" /> How to Set It Up (3 Easy Steps)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {current.stepByStep.map((s) => (
                <div
                  key={s.step}
                  className="p-4 rounded-xl bg-navy-900/60 border border-navy-700/80 space-y-1 relative"
                >
                  <span className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-300 font-bold text-xs flex items-center justify-center border border-violet-500/30 mb-2">
                    {s.step}
                  </span>
                  <p className="text-xs font-semibold text-slate-200">{s.title}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tips for Non-Technical Users */}
          <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-2">
            <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
              💡 Pro Tips & Best Practices
            </p>
            <ul className="space-y-1 text-xs text-slate-400">
              {current.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick FAQ / Help Section */}
      <Card className="border-navy-700/80">
        <CardHeader className="pb-3 border-b border-navy-700/60">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">Frequently Asked Questions</h3>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-300">Do I need coding skills to use Qwalify?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              No! Everything is configured through buttons, dropdowns, and text fields in Settings. No technical knowledge or server setup is required to run the dashboard.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-300">Can I use free AI providers?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yes! Both Google Gemini and Groq offer 100% free API access that you can generate in 1 click and paste into Settings.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-300">What happens when a human rep replies?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              The AI automatically detects human intervention or status changes to "Handed Off", and pauses automated follow-ups immediately so there are no conflicting messages.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-300">How do leads receive appointment links?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Once a lead’s score reaches the Hot threshold (75+), the AI naturally weaves your Calendly or Cal.com booking link into the conversation so the customer can pick a time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
