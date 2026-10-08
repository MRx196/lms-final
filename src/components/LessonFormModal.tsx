import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, FileText, Headphones, Link as LinkIcon, Lock, LockOpen } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createLesson, updateLesson } from '@/services/courseService';
import type { Tables } from '@/integrations/supabase/types';

const LESSON_TYPES = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'reading', label: 'Reading', icon: FileText },
  { value: 'quiz', label: 'Quiz', icon: FileText },
  { value: 'assignment', label: 'Assignment', icon: LinkIcon },
] as const;

interface LessonFormModalProps {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  lesson?: Tables<'lessons'> | null;
  onSaved: () => void;
}

export function LessonFormModal({ open, onClose, moduleId, lesson, onSaved }: LessonFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('video');
  const [duration, setDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [content, setContent] = useState('');
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setDescription(lesson.description || '');
      setType(lesson.type || 'video');
      setDuration(lesson.duration || '');
      setVideoUrl(lesson.video_url || '');
      setContent(lesson.content || '');
      setIsFreePreview(lesson.is_free_preview || false);
    } else {
      setTitle('');
      setDescription('');
      setType('video');
      setDuration('');
      setVideoUrl('');
      setContent('');
      setIsFreePreview(false);
    }
  }, [lesson, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Lesson title is required');
      return;
    }
    setSaving(true);
    try {
      if (lesson) {
        await updateLesson(lesson.id, {
          title: title.trim(),
          description: description.trim() || null,
          type,
          duration: duration || null,
          video_url: videoUrl || null,
          content: content || null,
          is_free_preview: isFreePreview,
        });
        toast.success('Lesson updated');
      } else {
        await createLesson({
          module_id: moduleId,
          title: title.trim(),
          description: description.trim() || null,
          type,
          duration: duration || null,
          video_url: videoUrl || null,
          content: content || null,
          is_free_preview: isFreePreview,
        });
        toast.success('Lesson created');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ ease: 'easeOut' as const }}
            className="relative w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {lesson ? 'Edit Lesson' : 'New Lesson'}
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Variables"
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of this lesson"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Lesson Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {LESSON_TYPES.map((lt) => {
                    const Icon = lt.icon;
                    const isActive = type === lt.value;
                    return (
                      <button
                        key={lt.value}
                        type="button"
                        onClick={() => setType(lt.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon size={16} />
                        {lt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 15 min"
                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Video URL</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Content (Markdown / Text)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Lesson content..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none font-mono"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFreePreview(!isFreePreview)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    isFreePreview
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isFreePreview ? <LockOpen size={16} /> : <Lock size={16} />}
                  {isFreePreview ? 'Free Preview' : 'Paid Only'}
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {saving ? 'Saving...' : lesson ? 'Update Lesson' : 'Create Lesson'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}