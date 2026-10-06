import { ChannelsTab } from '@/components/settings/ChannelsTab';

export default function BotChannelsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Channels</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Connect the messaging channels your leads use — WhatsApp, Telegram, and more.
        </p>
      </div>
      <ChannelsTab />
    </div>
  );
}
