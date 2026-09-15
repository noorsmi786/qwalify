import { X, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLeadsStore } from '@/store/leadsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Lead, ChannelType } from '@/types';

const schema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  contact: z.string().min(3, 'Contact is required'),
  source_channel: z.enum(['whatsapp', 'telegram', 'email', 'slack', 'manual']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddLeadDrawer({ open, onClose }: Props) {
  const addLead = useLeadsStore((s) => s.addLead);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source_channel: 'manual' },
  });

  const onSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 500));
    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      tenant_id: 'tenant_acme_001',
      full_name: data.full_name,
      contact: data.contact,
      source_channel: data.source_channel as ChannelType,
      status: 'new',
      score: 0,
      tags: [],
      notes: data.notes ?? '',
      created_at: new Date().toISOString(),
      last_contact_at: new Date().toISOString(),
      is_handoff_ready: false,
    };
    addLead(newLead);
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-navy-900 border-l border-navy-700 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Add Lead</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manually add a new lead to the pipeline</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg border border-navy-600 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <Input
                label="Full Name"
                placeholder="Sarah Mitchell"
                error={errors.full_name?.message}
                icon={<User className="w-4 h-4" />}
                {...register('full_name')}
              />
              <Input
                label="Contact (phone or email)"
                placeholder="+1 555 123 4567"
                error={errors.contact?.message}
                icon={<Phone className="w-4 h-4" />}
                {...register('contact')}
              />
              <Select label="Source Channel" {...register('source_channel')}>
                <option value="manual">Manual</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
              </Select>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                <textarea
                  placeholder="Any context about this lead…"
                  rows={4}
                  className="w-full bg-navy-900/80 border border-navy-600 text-slate-100 placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none"
                  {...register('notes')}
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-navy-700 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={isSubmitting}
                onClick={handleSubmit(onSubmit)}
              >
                Add Lead
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
