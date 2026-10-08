import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plus, BookOpen, CheckCircle, FileText, SquaresFour,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/navigation';
import {
  getAdminCourseById,
  getCourseModulesWithLessons,
  createModule,
  updateModule,
  deleteModule,
  updateModulesOrder,
} from '@/services/courseService';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ModuleCard } from '@/components/ModuleCard';

type ModuleWithLessons = Tables<'modules'> & { lessons: Tables<'lessons'>[] };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

export function CourseBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Tables<'courses'> | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Module form state
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState<Tables<'modules'> | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [courseData, modulesData] = await Promise.all([
        getAdminCourseById(courseId),
        getCourseModulesWithLessons(courseId),
      ]);
      setCourse(courseData as Tables<'courses'>);
      setModules(modulesData as ModuleWithLessons[]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);

  const openCreateForm = () => {
    setEditingModule(null);
    setFormTitle('');
    setFormDescription('');
    setShowForm(true);
  };

  const openEditForm = (mod: Tables<'modules'>) => {
    setEditingModule(mod);
    setFormTitle(mod.title || '');
    setFormDescription(mod.description || '');
    setShowForm(true);
  };

  const handleSaveModule = async () => {
    if (!courseId) return;
    if (!formTitle.trim()) { toast.error('Module title is required'); return; }
    setSaving(true);
    try {
      if (editingModule) {
        await updateModule(editingModule.id, {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
        });
        toast.success('Module updated');
      } else {
        await createModule({
          course_id: courseId,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          sort_order: modules.length,
        });
        toast.success('Module created');
      }
      setShowForm(false);
      setEditingModule(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (modId: string) => {
    try {
      await deleteModule(modId);
      toast.success('Module deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete module');
    }
  };

  const handleMoveModule = async (index: number, direction: -1 | 1) => {
    const newModules = [...modules];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newModules.length) return;
    [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];
    try {
      await updateModulesOrder(
        newModules.map((m, i) => ({ id: m.id, sort_order: i }))
      );
      setModules(newModules);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reorder modules');
    }
  };

  if (loading) {
    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </motion.div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <BookOpen size={40} />
        <p className="mt-4 text-sm">Course not found</p>
        <Link to={ROUTES.adminCourses} className="mt-2 text-sm text-emerald-600 hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.adminCourses}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Course Builder
              </h1>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                {course.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{course.title}</p>
          </div>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus size={16} weight="bold" /> Add Module
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <SquaresFour size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{modules.length}</p>
              <p className="text-xs text-zinc-500">Modules</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-amber-600 bg-amber-50 dark:bg-amber-900/20">
              <FileText size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{totalLessons}</p>
              <p className="text-xs text-zinc-500">Lessons</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{course.status === 'published' ? 'Live' : 'Draft'}</p>
              <p className="text-xs text-zinc-500">Status</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Module Form */}
      {showForm && (
        <motion.div variants={itemVariants}>
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{formTitle}</CardTitle>
              <CardDescription>{formDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Module Title</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter module title"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Description (optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this module"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSaveModule} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {saving ? 'Saving...' : editingModule ? 'Update Module' : 'Create Module'}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingModule(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Module List */}
      <motion.div variants={itemVariants} className="space-y-4">
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <SquaresFour size={40} />
            <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">No modules yet</p>
            <p className="text-xs text-zinc-400 mt-1 mb-4">Start building your course by adding your first module</p>
            <Button
              onClick={openCreateForm}
              variant="outline"
              className="gap-2"
            >
              <Plus size={16} weight="bold" /> Create First Module
            </Button>
          </div>
        ) : (
          modules.map((mod, index) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              modIndex={index}
              totalModules={modules.length}
              onMoveUp={() => handleMoveModule(index, -1)}
              onMoveDown={() => handleMoveModule(index, 1)}
              onEdit={() => openEditForm(mod)}
              onDelete={() => handleDeleteModule(mod.id)}
              onRefresh={fetchData}
            />
          ))
        )}
      </motion.div>

      {/* Bottom actions */}
      <motion.div variants={itemVariants} className="mt-8 flex items-center justify-between">
        <Link
          to={ROUTES.adminCourses}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          &larr; Back to courses
        </Link>
        {modules.length > 0 && (
          <Button
            onClick={openCreateForm}
            variant="outline"
            className="gap-2"
          >
            <Plus size={16} weight="bold" /> Add Module
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}