import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Webhook, Send, Check, Copy, Code, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export function IntegrationsTab() {
  const { tenant, updateTenantInfo } = useAuthStore();
  const currentWebhook = (tenant as any)?.settings?.outbound_webhook_url || '';
  const [webhookUrl, setWebhookUrl] = useState(currentWebhook);
  const [testing, setTesting] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const embedScript = `<script src="https://qwalify.online/widget.js" data-agent="default" async></script>`;

  const handleSaveWebhook = async () => {
    try {
      await updateTenantInfo({
        settings: {
          ...((tenant as any)?.settings || {}),
          outbound_webhook_url: webhookUrl.trim(),
        },
      } as any);
      toast.success('Outbound Webhook URL saved!');
    } catch {
      toast.error('Failed to save webhook settings.');
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      toast.error('Please enter a valid HTTP/HTTPS webhook URL first.');
      return;
    }
    setTesting(true);
    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          event: 'test.ping',
          timestamp: new Date().toISOString(),
          message: 'Qwalify Outbound Webhook Test Dispatch 🚀',
          sample_lead: {
            full_name: 'Alex Mercer',
            contact: '+1234567890',
            score: 85,
            status: 'hot',
            channel: 'whatsapp',
          },
        }),
      });
      toast.success('Test payload sent to your webhook endpoint!');
    } catch (err: any) {
      toast.error('Failed to dispatch test webhook: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(embedScript);
    setCopiedScript(true);
    toast.success('Embed script copied to clipboard!');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Webhook Dispatcher Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Webhook className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Outbound Webhooks (Zapier, Make, Slack, n8n)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically push lead qualification data, hot leads, and bookings to external tools in real-time.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Webhook Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500"
              />
              <Button size="sm" onClick={handleSaveWebhook}>
                Save URL
              </Button>
              <Button size="sm" variant="secondary" onClick={handleTestWebhook} loading={testing}>
                <Send className="w-3.5 h-3.5" /> Test Ping
              </Button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-700/80 space-y-2">
            <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Active Webhook Events
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <span className="px-2 py-1 rounded bg-navy-800 text-[11px] text-slate-400 border border-navy-700 font-mono">
                lead.created
              </span>
              <span className="px-2 py-1 rounded bg-navy-800 text-[11px] text-emerald-400 border border-emerald-500/20 font-mono">
                lead.hot (Score &gt;= 75)
              </span>
              <span className="px-2 py-1 rounded bg-navy-800 text-[11px] text-violet-400 border border-violet-500/20 font-mono">
                booking.confirmed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Website Chat Widget Embed Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Website Live Chat Widget</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Embed your active AI worker directly onto WordPress, Shopify, Wix, Webflow, or custom sites.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          <div className="p-3 bg-navy-900 border border-navy-700 rounded-xl relative">
            <pre className="text-xs font-mono text-violet-300 overflow-x-auto whitespace-pre-wrap">
              {embedScript}
            </pre>
            <button
              onClick={handleCopyScript}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-xs font-medium text-slate-200 border border-navy-600 flex items-center gap-1.5 transition-all"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedScript ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>💡 Place this code before the closing <code className="text-slate-300 font-mono">&lt;/body&gt;</code> tag of your website.</span>
            <a
              href="/embed/default"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
            >
              Preview Widget <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
