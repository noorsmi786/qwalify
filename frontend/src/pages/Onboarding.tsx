import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { BotSetupWizard } from '@/components/onboarding/BotSetupWizard';

export default function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden text-slate-100 font-sans">
      {/* Background ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-violet-300 bg-clip-text text-transparent">
            Qwalify
          </span>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
        >
          Skip to Dashboard ➔
        </button>
      </header>

      {/* Main Wizard Area */}
      <main className="flex-1 flex items-center justify-center py-6 relative z-10 w-full">
        <BotSetupWizard
          isStandalonePage={true}
          onComplete={() => {
            navigate('/dashboard');
          }}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center py-2 text-[11px] text-slate-500 relative z-10">
        ⚡ Qwalify Autonomous AI Workforce Engine • 5-minute zero-code setup
      </footer>
    </div>
  );
}
