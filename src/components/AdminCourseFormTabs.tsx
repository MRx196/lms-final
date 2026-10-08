import { Plus, Check, X, BookOpen, CurrencyCircleDollar, SquaresFour, FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { Tables } from '@/integrations/supabase/types';

const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'all_levels'];
const STATUSES = ['draft', 'published', 'archived'] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export interface FormData {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  long_description: string;
  category_id: string;
  instructor_id: string;
  level: string;
  price: number;
  original_price: number;
  currency: string;
  duration_hours: number;
  image: string;
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  requirements: string[];
  learning_objectives: string[];
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface TabProps {
  form: FormData;
  categories: Tables<'categories'>[];
  instructors: Tables<'instructors'>[];
  newReq: string;
  newObj: string;
  onUpdateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  onTitleChange: (title: string) => void;
  onSlugEdit: (slug: string) => void;
  onStatusChange: (status: 'draft' | 'published' | 'archived') => void;
  onSetNewReq: (v: string) => void;
  onAddReq: () => void;
  onRemoveReq: (i: number) => void;
  onSetNewObj: (v: string) => void;
  onAddObj: () => void;
  onRemoveObj: (i: number) => void;
}

function Input({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label} {required && <span className="text-red-400">*</span>}</label>
      <input className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" {...props} />
    </div>
  );
}

function Textarea({ label, required, ...props }: { label: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label} {required && <span className="text-red-400">*</span>}</label>
      <textarea className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" {...props} />
    </div>
  );
}

function Select({ label, required, value, onChange, options, placeholder }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label} {required && <span className="text-red-400">*</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function BasicInfoTab({ form, onTitleChange, onSlugEdit, onUpdateField }: TabProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Basic Information</CardTitle>
        <CardDescription>Course title, description, and slug</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input label="Title" required value={form.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="e.g. Introduction to Web Development" />
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Slug *</label>
          <input type="text" value={form.slug} onChange={(e) => onSlugEdit(e.target.value)} placeholder="intro-to-web-development" className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono" />
          <p className="text-xs text-zinc-400 mt-1">URL-friendly identifier. Auto-generated from title.</p>
        </div>
        <Textarea label="Short Description" required value={form.description} onChange={(e) => onUpdateField('description', e.target.value)} placeholder="Brief summary of the course (2-3 sentences)" rows={3} />
        <Textarea label="Full Description" value={form.long_description} onChange={(e) => onUpdateField('long_description', e.target.value)} placeholder="Detailed course description with syllabus highlights..." rows={6} />
        <Input label="Subtitle" value={form.subtitle} onChange={(e) => onUpdateField('subtitle', e.target.value)} placeholder="Optional subtitle" />
      </CardContent>
    </Card>
  );
}

export function PricingTab({ form, onUpdateField }: TabProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Pricing & Course Details</CardTitle>
        <CardDescription>Set the price, currency, duration, and difficulty</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Price" required type="number" min={0} step={0.01} value={form.price} onChange={(e) => onUpdateField('price', parseFloat(e.target.value) || 0)} placeholder="0" />
          <Select label="Currency" value={form.currency} onChange={(v) => onUpdateField('currency', v)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          <Input label="Original Price" type="number" min={0} step={0.01} value={form.original_price} onChange={(e) => onUpdateField('original_price', parseFloat(e.target.value) || 0)} placeholder="Discount reference" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Duration (hours)" type="number" min={0} value={form.duration_hours} onChange={(e) => onUpdateField('duration_hours', parseInt(e.target.value) || 0)} placeholder="e.g. 12" />
          <Select label="Difficulty" value={form.level} onChange={(v) => onUpdateField('level', v)} options={DIFFICULTIES.map((d) => ({ value: d, label: d.replace('_', ' ') }))} />
        </div>
      </CardContent>
    </Card>
  );
}

export function OrganizationTab({ form, categories, instructors, onUpdateField, onStatusChange }: TabProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Organization & Media</CardTitle>
        <CardDescription>Category, instructor, thumbnail, and featured status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Category" required value={form.category_id} onChange={(v) => onUpdateField('category_id', v)} placeholder="Select category" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Instructor" required value={form.instructor_id} onChange={(v) => onUpdateField('instructor_id', v)} placeholder="Select instructor" options={instructors.map((i) => ({ value: i.id, label: i.name }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Thumbnail URL *</label>
          <input type="text" value={form.image} onChange={(e) => onUpdateField('image', e.target.value)} placeholder="https://example.com/course-thumbnail.jpg" className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          {form.image && (
            <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <img src={form.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Featured</label>
            <p className="text-xs text-zinc-400">Display this course on the homepage</p>
          </div>
          <Switch checked={form.featured} onCheckedChange={(v) => onUpdateField('featured', v)} />
        </div>
        <Separator />
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Status</label>
          <div className="flex items-center gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.status === s
                    ? STATUS_STYLES[s] + ' ring-2 ring-emerald-500/40'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CurriculumTab({ form, newReq, newObj, onSetNewReq, onAddReq, onRemoveReq, onSetNewObj, onAddObj, onRemoveObj }: TabProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Prerequisites</CardTitle>
        <CardDescription>Requirements and learning objectives</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Requirements</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={newReq} onChange={(e) => onSetNewReq(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddReq(); } }} placeholder="e.g. Basic HTML knowledge" className="flex-1 h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            <Button variant="outline" onClick={onAddReq} className="gap-1 shrink-0"><Plus size={16} /> Add</Button>
          </div>
          <div className="space-y-1.5">
            {form.requirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                <span className="flex-1 text-zinc-700 dark:text-zinc-300">{req}</span>
                <button onClick={() => onRemoveReq(i)} className="text-zinc-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
            {form.requirements.length === 0 && <p className="text-xs text-zinc-400 italic">No requirements added yet</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Learning Objectives</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={newObj} onChange={(e) => onSetNewObj(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddObj(); } }} placeholder="e.g. Build a responsive website" className="flex-1 h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            <Button variant="outline" onClick={onAddObj} className="gap-1 shrink-0"><Plus size={16} /> Add</Button>
          </div>
          <div className="space-y-1.5">
            {form.learning_objectives.map((obj, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                <Check size={14} className="text-emerald-500 shrink-0" />
                <span className="flex-1 text-zinc-700 dark:text-zinc-300">{obj}</span>
                <button onClick={() => onRemoveObj(i)} className="text-zinc-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
            {form.learning_objectives.length === 0 && <p className="text-xs text-zinc-400 italic">No objectives added yet</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}