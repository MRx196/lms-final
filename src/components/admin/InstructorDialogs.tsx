import {
  UserPlus, X, Spinner, Check, LinkSimple, Users, Trash, MagnifyingGlass,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export const initials = (name?: string | null, email?: string | null) => {
  const src = name?.trim() || email?.split('@')[0] || '?';
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';
};

export function Avatar({ name, email, url }: { name?: string | null; email?: string | null; url?: string | null }) {
  if (url) return <img src={url} alt={name || ''} className="h-9 w-9 rounded-full object-cover" />;
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      {initials(name, email)}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export interface InstructorLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function PromoteDialog({
  open, onOpenChange, candidates, query, setQuery, onPromote,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidates: { id: string; full_name: string | null; email: string | null; username: string | null }[];
  query: string;
  setQuery: (v: string) => void;
  onPromote: (c: { id: string; full_name: string | null; email: string | null }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Instructor</DialogTitle>
          <DialogDescription>
            Promote an existing registered user to the instructor role. New staff must sign up first, then appear here.
          </DialogDescription>
        </DialogHeader>
        <div className="relative py-2">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." className={`${inputCls} pl-9`} />
        </div>
        <div className="max-h-[45vh] space-y-2 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No eligible users found.</p>
          ) : (
            candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar name={c.full_name} email={c.email} />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{c.full_name || 'Unnamed'}</div>
                    <div className="text-xs text-slate-400">{c.email}</div>
                  </div>
                </div>
                <Button size="sm" onClick={() => onPromote(c)} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
                  <UserPlus size={14} /> Promote
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditDialog({
  open, onOpenChange, form, setForm, saving, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: { full_name: string; headline: string; bio: string; phone: string; website: string; linkedin_url: string };
  setForm: React.Dispatch<React.SetStateAction<{ full_name: string; headline: string; bio: string; phone: string; website: string; linkedin_url: string }>>;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Instructor</DialogTitle>
          <DialogDescription>Update the public profile shown on course pages.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Full Name"><input className={inputCls} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Headline"><input className={inputCls} value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} placeholder="e.g. Senior Frontend Engineer" /></Field>
          <Field label="Bio"><textarea className={`${inputCls} min-h-[72px] resize-none`} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
            <Field label="Website"><input className={inputCls} value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></Field>
          </div>
          <Field label="LinkedIn URL"><input className={inputCls} value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Spinner size={16} className="animate-spin" /> : <Check size={16} />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignDialog({
  open, onOpenChange, target, courses, selected, onToggle, saving, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: InstructorLite | null;
  courses: { id: string; title: string; status: string | null }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LinkSimple size={18} className="text-emerald-600" /> Assign Courses</DialogTitle>
          <DialogDescription>Select the courses this instructor teaches ({target?.full_name || target?.email}).</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto py-2">
          {courses.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No courses available yet.</p>
          ) : (
            courses.map((c) => {
              const checked = selected.has(c.id);
              return (
                <label key={c.id} className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition ${checked ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50'}`}>
                  <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={checked} onChange={() => onToggle(c.id)} className="h-4 w-4 accent-emerald-600" />
                    {c.title}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">{c.status || 'draft'}</Badge>
                </label>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Spinner size={16} className="animate-spin" /> : <Check size={16} />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ViewDialog({
  open, onOpenChange, target, linked,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: InstructorLite | null;
  linked: { id: string; title: string; status: string | null }[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users size={18} className="text-emerald-600" /> {target?.full_name || target?.email}</DialogTitle>
          <DialogDescription>Courses this instructor is assigned to.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
          {linked.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Not assigned to any courses yet.</p>
          ) : (
            linked.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <span className="text-sm text-slate-700 dark:text-slate-200">{c.title}</span>
                <Badge variant="secondary" className="text-xs capitalize">{c.status || 'draft'}</Badge>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5"><X size={16} /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveDialog({
  open, onOpenChange, target, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: InstructorLite | null;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove instructor role?</DialogTitle>
          <DialogDescription>
            This moves {target?.full_name || target?.email} back to the student role. Their course assignments stay in place.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} className="gap-1.5 bg-red-600 text-white hover:bg-red-700">
            <Trash size={16} /> Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
