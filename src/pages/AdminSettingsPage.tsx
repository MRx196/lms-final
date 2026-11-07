import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { GearSix, CircleNotch, CurrencyDollar, TextAa } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { CURRENCIES } from '@/components/AdminCourseFormTabs';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

export function AdminSettingsPage() {
  const [currency, setCurrency] = useState('GHS');
  const [siteName, setSiteName] = useState('LMS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('platform_settings').select('key, value');
      if (error) throw error;
      for (const row of data || []) {
        if (row.key === 'default_currency') setCurrency(String(row.value));
        if (row.key === 'site_name') setSiteName(String(row.value));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('platform_settings').upsert([
        { key: 'default_currency', value: currency, updated_by: user?.id ?? null },
        { key: 'site_name', value: siteName, updated_by: user?.id ?? null },
      ], { onConflict: 'key' });
      if (error) throw error;
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-400">
        <CircleNotch size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Platform Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Global configuration for the learning platform.</p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CurrencyDollar size={18} className="text-emerald-600" /> Payments</CardTitle>
          <CardDescription>Default currency used across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-10 w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="mt-1 text-xs text-zinc-400">Individual courses can override this with their own currency.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TextAa size={18} className="text-emerald-600" /> Branding</CardTitle>
          <CardDescription>Platform display name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Site name</label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="max-w-xs" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving ? <CircleNotch size={16} className="animate-spin" /> : <GearSix size={16} />}
          Save settings
        </Button>
      </div>
    </motion.div>
  );
}
