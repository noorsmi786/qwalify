import { ChannelsTab } from '@/components/settings/ChannelsTab';
import { HandoffSettingsPanel } from '@/components/settings/HandoffSettingsPanel';

export default function BotChannelsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Channels & Handoff</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Connect the messaging channels your leads use and configure instant human rep notifications.
        </p>
      </div>

      {/* Inbound Customer Channels */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-200">1. Customer Inbound Channels</h2>
        <ChannelsTab />
      </div>

      {/* Human Handoff Rep Alert Section */}
      <div className="space-y-4 pt-4 border-t border-navy-700/80">
        <h2 className="text-base font-semibold text-slate-200">2. Human Handoff & Rep Alerts</h2>
        <HandoffSettingsPanel />
      </div>
    </div>
  );
}
