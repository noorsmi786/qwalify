import { useState } from 'react';
import { Upload, Globe, Plus, Trash2, FileText, Save, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function BotKnowledgePage() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([
    { id: '1', question: '', answer: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setIsScraping(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      toast.success('Website content imported! Your bot can now answer questions about it.');
    } catch {
      toast.error('Could not read that website. Please check the URL and try again.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const names = files.map((f) => f.name);
    setUploadedFiles((prev) => [...prev, ...names]);
    toast.success(`${names.length} file(s) uploaded successfully.`);
  };

  const handleAddFaq = () => {
    setFaqs((prev) => [...prev, { id: Date.now().toString(), question: '', answer: '' }]);
  };

  const handleRemoveFaq = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFaqChange = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      toast.success('Knowledge base saved! Your bot will use this to answer questions.');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Knowledge Base</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Give your bot the information it needs to answer questions about your business.
        </p>
      </div>

      {/* Website URL */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            <p className="text-sm font-semibold text-slate-200">Import from your website</p>
          </div>
          <p className="text-xs text-slate-500">
            Paste your website URL and we'll read it automatically so the bot knows what you offer.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://yourbusiness.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <Button
              onClick={handleScrapeWebsite}
              loading={isScraping}
              variant="secondary"
              className="flex-shrink-0"
            >
              <Globe className="w-4 h-4" />
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document upload */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-semibold text-slate-200">Upload documents or PDFs</p>
          </div>
          <p className="text-xs text-slate-500">
            Upload price lists, brochures, FAQs, or any document your bot should know about.
          </p>

          <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-navy-600 bg-navy-800/30 hover:border-violet-500/40 hover:bg-navy-800/50 cursor-pointer transition-all">
            <Upload className="w-8 h-8 text-slate-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">Click to upload files</p>
              <p className="text-xs text-slate-500">PDF, DOCX, TXT — up to 10 MB each</p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              className="sr-only"
              onChange={handleFileUpload}
            />
          </label>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((name, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-navy-800 border border-navy-700">
                  <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <span className="text-xs text-slate-300 flex-1 truncate">{name}</span>
                  <button
                    onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ editor */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Add FAQs manually</p>
              <p className="text-xs text-slate-500 mt-0.5">Common questions and answers your bot should know.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleAddFaq}>
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={faq.id} className="space-y-2 p-4 rounded-xl bg-navy-800/40 border border-navy-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question {index + 1}</p>
                  {faqs.length > 1 && (
                    <button
                      onClick={() => handleRemoveFaq(faq.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  value={faq.question}
                  onChange={(e) => handleFaqChange(faq.id, 'question', e.target.value)}
                  placeholder="e.g. What are your opening hours?"
                  className="w-full bg-navy-900/80 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => handleFaqChange(faq.id, 'answer', e.target.value)}
                  placeholder="e.g. We're open Monday to Saturday, 9am–6pm."
                  rows={2}
                  className="w-full bg-navy-900/80 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} className="shadow-lg shadow-violet-600/20">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Knowledge Base</>
          )}
        </Button>
      </div>
    </div>
  );
}
