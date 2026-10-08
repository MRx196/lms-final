import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  SquaresFour, Plus, Pencil, Trash, MagnifyingGlass, BookOpen, X, Spinner, FolderOpen, Tag, Check,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
}
interface CourseLite {
  id: string;
  title: string;
  category_id: string | null;
  status: string | null;
  level: string | null;
}

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', sort_order: '0' });
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [preview, setPreview] = useState<Category | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, crs] = await Promise.all([
        supabase
          .from('course_categories')
          .select('id,name,slug,description,sort_order')
          .order('sort_order', { ascending: true })
          .order('name'),
        supabase.from('courses').select('id,title,category_id,status,level'),
      ]);
      if (cats.error) throw cats.error;
      setCategories((cats.data as Category[]) || []);
      setCourses((crs.data as CourseLite[]) || []);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const coursesByCat = useMemo(() => {
    const m = new Map<string, CourseLite[]>();
    for (const c of courses) {
      if (!c.category_id) continue;
      const arr = m.get(c.category_id) || [];
      arr.push(c);
      m.set(c.category_id, arr);
    }
    return m;
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q),
    );
  }, [categories, search]);

  const categorized = courses.filter((c) => c.category_id).length;
  const uncategorized = courses.length - categorized;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', sort_order: '0' });
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      sort_order: String(c.sort_order ?? 0),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    const slug = slugify(form.slug || form.name);
    if (!slug) {
      toast.error('Slug could not be generated');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        const { error } = await supabase.from('course_categories').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase.from('course_categories').insert(payload);
        if (error) throw error;
        toast.success('Category added');
      }
      setOpen(false);
      await fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const n = (coursesByCat.get(deleting.id) || []).length;
    if (n > 0) {
      toast.error(`Cannot delete: ${n} course(s) use this category. Reassign them first.`);
      setDeleting(null);
      return;
    }
    try {
      const { error } = await supabase.from('course_categories').delete().eq('id', deleting.id);
      if (error) throw error;
      toast.success('Category deleted');
      setDeleting(null);
      await fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Categories</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organize the catalog by category. Add, edit, reorder and preview the courses under each one.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus size={16} weight="bold" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={<SquaresFour size={20} className="text-emerald-600" />} label="Total Categories" value={categories.length} hint="Active in the catalog" />
        <MetricCard icon={<BookOpen size={20} className="text-emerald-600" />} label="Categorized Courses" value={categorized} hint="Assigned to a category" />
        <MetricCard icon={<FolderOpen size={20} className="text-amber-600" />} label="Uncategorized" value={uncategorized} hint="Need a category" />
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className={`${inputCls} pl-9`}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
              <Spinner size={20} className="animate-spin" /> Loading categories...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Tag size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500">No categories found</p>
              <p className="text-xs text-slate-400">Add your first category to organize the catalog.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Courses</th>
                    <th className="px-4 py-3 font-medium">Sort</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((c) => {
                    const count = (coursesByCat.get(c.id) || []).length;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                          <div className="text-xs text-slate-400">/{c.slug}</div>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-slate-500">
                          <span className="line-clamp-1">{c.description || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setPreview(c)} className="inline-flex items-center gap-1.5">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {count}
                            </Badge>
                            <span className="text-xs text-slate-400 underline-offset-2 hover:underline">view</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.sort_order ?? 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconBtn onClick={() => openEdit(c)} title="Edit"><Pencil size={15} /></IconBtn>
                            <IconBtn onClick={() => setDeleting(c)} title="Delete" danger><Trash size={15} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>Categories group courses across the catalog and storefront filters.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Name">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                placeholder="e.g. Web Development"
              />
            </Field>
            <Field label="Slug">
              <input className={inputCls} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} placeholder="web-development" />
            </Field>
            <Field label="Description">
              <textarea className={`${inputCls} min-h-[72px] resize-none`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short summary of this category" />
            </Field>
            <Field label="Sort Order">
              <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
              {saving ? <Spinner size={16} className="animate-spin" /> : <Check size={16} />} {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              This will permanently remove "{deleting?.name}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button onClick={confirmDelete} className="gap-1.5 bg-red-600 text-white hover:bg-red-700">
              <Trash size={16} /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview courses */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen size={18} className="text-emerald-600" /> {preview?.name}</DialogTitle>
            <DialogDescription>Courses assigned to this category.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
            {preview && (coursesByCat.get(preview.id) || []).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No courses in this category yet.</p>
            ) : (
              (preview ? coursesByCat.get(preview.id) || [] : []).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                  <span className="text-sm text-slate-700 dark:text-slate-200">{c.title}</span>
                  <div className="flex items-center gap-2">
                    {c.level && <Badge variant="outline" className="text-xs capitalize">{c.level}</Badge>}
                    <Badge variant="secondary" className="text-xs capitalize">{c.status || 'draft'}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)} className="gap-1.5"><X size={16} /> Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint: string }) {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">{icon}</div>
        <div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="text-[11px] text-slate-400">{hint}</div>
        </div>
      </CardContent>
    </Card>
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

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 transition dark:border-slate-700 ${
        danger ? 'text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-800 dark:hover:bg-red-950/40' : 'text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40'
      }`}
    >
      {children}
    </button>
  );
}