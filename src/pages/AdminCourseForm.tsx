import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FloppyDisk, Eye, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/navigation';
import { getCourseCategories, getInstructors, getAdminCourseById, createCourse, updateCourse } from '@/services/courseService';
import {
  BasicInfoTab,
  PricingTab,
  OrganizationTab,
  CurriculumTab,
  FormData,
  slugify,
} from '@/components/AdminCourseFormTabs';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const defaultForm: FormData = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  long_description: '',
  category_id: '',
  instructor_id: '',
  level: 'beginner',
  price: 0,
  original_price: 0,
  currency: 'GHS',
  duration_hours: 0,
  image: '',
  featured: false,
  status: 'draft',
  requirements: [],
  learning_objectives: [],
};

export function AdminCourseForm() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!courseId;

  const [form, setForm] = useState<FormData>(defaultForm);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [instructors, setInstructors] = useState<Tables<'instructors'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [newReq, setNewReq] = useState('');
  const [newObj, setNewObj] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, insts] = await Promise.all([
        getCourseCategories(),
        getInstructors(),
      ]);
      setCategories(cats || []);
      setInstructors(insts || []);

      if (isEditing && courseId) {
        const course = await getAdminCourseById(courseId);
        if (course) {
          setForm({
            title: course.title || '',
            slug: course.slug || '',
            subtitle: course.subtitle || '',
            description: course.description || '',
            long_description: course.long_description || '',
            category_id: course.category_id || '',
            instructor_id: course.instructor_id || '',
            level: course.level || 'beginner',
            price: course.price ?? 0,
            original_price: course.original_price ?? 0,
            currency: course.currency || 'GHS',
            duration_hours: course.duration_hours ?? 0,
            image: course.image || '',
            featured: course.featured ?? false,
            status: course.status || 'draft',
            requirements: Array.isArray(course.requirements) ? course.requirements : [],
            learning_objectives: Array.isArray(course.learning_objectives) ? course.learning_objectives : [],
          });
          setSlugEdited(true);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  }, [isEditing, courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: slugEdited ? prev.slug : slugify(title),
    }));
  };

  const handleSlugEdit = (slug: string) => {
    setSlugEdited(true);
    setForm((prev) => ({ ...prev, slug }));
  };

  const handleStatusChange = (status: 'draft' | 'published' | 'archived') => {
    updateField('status', status);
  };

  const handleAddReq = () => {
    if (!newReq.trim()) return;
    setForm((prev) => ({ ...prev, requirements: [...prev.requirements, newReq.trim()] }));
    setNewReq('');
  };

  const handleRemoveReq = (i: number) => {
    setForm((prev) => ({ ...prev, requirements: prev.requirements.filter((_, idx) => idx !== i) }));
  };

  const handleAddObj = () => {
    if (!newObj.trim()) return;
    setForm((prev) => ({ ...prev, learning_objectives: [...prev.learning_objectives, newObj.trim()] }));
    setNewObj('');
  };

  const handleRemoveObj = (i: number) => {
    setForm((prev) => ({ ...prev, learning_objectives: prev.learning_objectives.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async (statusOverride?: string) => {
    const targetStatus = statusOverride || form.status;

    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.slug.trim()) { toast.error('Slug is required'); return; }

    if (targetStatus === 'published') {
      const missing: string[] = [];
      if (!form.description) missing.push('Short Description');
      if (!form.category_id) missing.push('Category');
      if (!form.instructor_id) missing.push('Instructor');
      if (form.price <= 0) missing.push('Price');
      if (missing.length > 0) {
        toast.error(`Cannot publish. Missing: ${missing.join(', ')}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        subtitle: form.subtitle || null,
        description: form.description || null,
        long_description: form.long_description || null,
        category_id: form.category_id || null,
        instructor_id: form.instructor_id || null,
        level: form.level,
        price: form.price,
        original_price: form.original_price || null,
        currency: form.currency,
        duration_hours: form.duration_hours || null,
        image: form.image || null,
        featured: form.featured,
        status: targetStatus as 'draft' | 'published' | 'archived',
        requirements: form.requirements.length > 0 ? form.requirements : null,
        learning_objectives: form.learning_objectives.length > 0 ? form.learning_objectives : null,
      };

      if (isEditing && courseId) {
        await updateCourse(courseId, payload);
        toast.success('Course updated successfully');
      } else {
        const created = await createCourse(payload as any);
        toast.success('Course created successfully');
        navigate(`/admin/courses/${created.id}`, { replace: true });
        return;
      }
      navigate(ROUTES.adminCourses);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-4 w-72 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </motion.div>
    );
  }

  const tabProps = {
    form,
    categories,
    instructors,
    newReq,
    newObj,
    onUpdateField: updateField,
    onTitleChange: handleTitleChange,
    onSlugEdit: handleSlugEdit,
    onStatusChange: handleStatusChange,
    onSetNewReq: setNewReq,
    onAddReq: handleAddReq,
    onRemoveReq: handleRemoveReq,
    onSetNewObj: setNewObj,
    onAddObj: handleAddObj,
    onRemoveObj: handleRemoveObj,
  };

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
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {isEditing ? 'Edit Course' : 'Create Course'}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {isEditing ? `Editing: ${form.title || 'Untitled'}` : 'Fill in the details to create a new course'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="gap-2"
          >
            <FloppyDisk size={16} />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {saving ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <CheckCircle size={16} weight="bold" />
            )}
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </motion.div>

      {/* Form summary card */}
      <motion.div variants={itemVariants} className="mb-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-zinc-500">
              <CheckCircle size={16} className={form.title ? 'text-emerald-500' : 'text-zinc-300'} />
              <span className={form.title ? 'text-zinc-900 dark:text-white' : ''}>Title</span>
            </div>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2 text-zinc-500">
              <CheckCircle size={16} className={form.description ? 'text-emerald-500' : 'text-zinc-300'} />
              <span className={form.description ? 'text-zinc-900 dark:text-white' : ''}>Description</span>
            </div>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2 text-zinc-500">
              <CheckCircle size={16} className={form.category_id ? 'text-emerald-500' : 'text-zinc-300'} />
              <span className={form.category_id ? 'text-zinc-900 dark:text-white' : ''}>Category</span>
            </div>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2 text-zinc-500">
              <CheckCircle size={16} className={form.instructor_id ? 'text-emerald-500' : 'text-zinc-300'} />
              <span className={form.instructor_id ? 'text-zinc-900 dark:text-white' : ''}>Instructor</span>
            </div>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2 text-zinc-500">
              <CheckCircle size={16} className={form.price > 0 ? 'text-emerald-500' : 'text-zinc-300'} />
              <span className={form.price > 0 ? 'text-zinc-900 dark:text-white' : ''}>Price</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg overflow-x-auto">
            <TabsTrigger value="basic" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              Pricing & Details
            </TabsTrigger>
            <TabsTrigger value="organization" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              Organization & Media
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              Prerequisites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicInfoTab {...tabProps} />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingTab {...tabProps} />
          </TabsContent>

          <TabsContent value="organization">
            <OrganizationTab {...tabProps} />
          </TabsContent>

          <TabsContent value="curriculum">
            <CurriculumTab {...tabProps} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Bottom actions */}
      <motion.div variants={itemVariants} className="mt-8 flex items-center justify-between">
        <Link
          to={ROUTES.adminCourses}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          &larr; Back to courses
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="gap-2"
          >
            <FloppyDisk size={16} />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {saving ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <CheckCircle size={16} weight="bold" />
            )}
            {isEditing ? 'Update Course' : 'Create Course'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}