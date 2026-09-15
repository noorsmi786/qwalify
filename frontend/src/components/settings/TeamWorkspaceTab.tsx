import { useState } from 'react';
import {
  Building2,
  Users,
  UserPlus,
  Shield,
  Trash2,
  Copy,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import { useTeamData } from '@/hooks/useTeamData';
import { toast } from 'sonner';

export function TeamWorkspaceTab() {
  const { tenant, updateTenantInfo } = useAuthStore();
  const { members, invitations, inviteMember, isInviting, revokeInvitation, updateRole } = useTeamData();

  const [name, setName] = useState(tenant?.name || 'Acme Corp');
  const [timezone, setTimezone] = useState(tenant?.timezone || 'America/New_York');
  const [isSaving, setIsSaving] = useState(false);

  // Invite modal/form state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('agent');

  const handleSaveWorkspace = async () => {
    setIsSaving(true);
    await updateTenantInfo({ name, timezone });
    await new Promise((r) => setTimeout(r, 400));
    setIsSaving(false);
    toast.success('Workspace updated successfully.');
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMember(
      { email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail('');
          setShowInviteModal(false);
        },
      }
    );
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Workspace Profile & Plan */}
      <Card>
        <CardHeader className="pb-3 border-b border-navy-700/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-100">Workspace Settings</h3>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gradient-to-r from-violet-600/30 to-teal-500/20 text-teal-300 border border-teal-500/30">
              {tenant?.plan || 'pro'} plan
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Workspace Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
            />
            <Select
              label="Default Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="America/New_York">America/New_York (UTC-5)</option>
              <option value="America/Chicago">America/Chicago (UTC-6)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
              <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
              <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
              <option value="Asia/Karachi">Asia/Karachi (UTC+5)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
            </Select>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={handleSaveWorkspace} loading={isSaving}>
              Save Workspace
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Usage & Quota Metering */}
      <Card className="border-teal-500/20 bg-navy-800/40">
        <CardHeader className="pb-3 border-b border-navy-700/60">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-100">Monthly Usage & Quotas</h3>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-navy-900/80 border border-navy-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Leads Processed</span>
              <span className="font-mono text-slate-200">128 / 500</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full w-[25%]" />
            </div>
            <p className="text-[10px] text-slate-500">25% of monthly lead capacity</p>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900/80 border border-navy-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>AI Qualification Turns</span>
              <span className="font-mono text-slate-200">642 / 2,500</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
              <div className="h-full bg-violet-400 rounded-full w-[26%]" />
            </div>
            <p className="text-[10px] text-slate-500">Direct via BYO-API key</p>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900/80 border border-navy-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active Channels</span>
              <span className="font-mono text-slate-200">2 Connected</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full w-[50%]" />
            </div>
            <p className="text-[10px] text-slate-500">WhatsApp & Telegram live</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Team Members */}
      <Card>
        <CardHeader className="pb-3 border-b border-navy-700/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-100">Team Members ({members.length})</h3>
            </div>
            <Button size="sm" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Invite Teammate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 divide-y divide-navy-700/60 space-y-0">
          {members.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-teal-500 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                  {member.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{member.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {member.role === 'owner' ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Owner
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) => updateRole({ memberId: member.id, role: e.target.value as 'admin' | 'agent' })}
                    className="bg-navy-900 border border-navy-600 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="agent">Agent (Sales Rep)</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b border-navy-700/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Pending Invitations ({invitations.length})</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-navy-700/60 space-y-0">
            {invitations.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{inv.email}</p>
                  <p className="text-[10px] text-slate-500">
                    Invited as <span className="capitalize text-slate-400">{inv.role}</span> · Expires in 7 days
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const link = `${window.location.origin}/signup?invite=${inv.token}`;
                      navigator.clipboard.writeText(link);
                      toast.success('Invite link copied to clipboard!');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy Link
                  </Button>
                  <button
                    type="button"
                    onClick={() => revokeInvitation(inv.id)}
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-navy-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-navy-900 border border-navy-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-400" /> Invite Team Member
              </h4>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-500 hover:text-slate-300 text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />

              <Select
                label="Role Permissions"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'agent')}
              >
                <option value="agent">Agent — Can manage leads, chat, and take handoffs</option>
                <option value="admin">Admin — Can manage settings, channels, and team</option>
              </Select>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" loading={isInviting}>
                  Generate Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
