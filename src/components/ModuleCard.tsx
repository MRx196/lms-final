import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretDown, ArrowUp, ArrowDown, DotsThreeVertical, NotePencil,
  Trash, ListDashes, Plus, Video, FileText, Link as LinkIcon,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LessonFormModal } from '@/components/LessonFormModal';
import { deleteLesson, updateLessonsOrder } from '@/services/courseService';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

const LESSON_TYPE_ICONS: Record<string, React.ElementType> = {
  video: Video,
  reading: FileText,
  quiz: FileText,
  assignment: LinkIcon,
};

type ModuleWithLessons = Tables<'modules'> & { lessons: Tables<'lessons'>[] };

interface ModuleCardProps {
  mod: ModuleWithLessons;
  modIndex: number;
  totalModules: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export function ModuleCard({ mod, modIndex, totalModules, onMoveUp, onMoveDown, onEdit, onDelete, onRefresh }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Tables<'lessons'> | null>(null);

  const openCreateLesson = () => {
    setEditingLesson(null);
    setLessonModalOpen(true);
  };

  const openEditLesson = (lesson: Tables<'lessons'>) => {
    setEditingLesson(lesson);
    setLessonModalOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      toast.success('Lesson deleted');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lesson');
    }
  };

  const moveLesson = async (lessonIndex: number, direction: -1 | 1) => {
    const lessons = [...mod.lessons];
    const newIndex = lessonIndex + direction;
    if (newIndex < 0 || newIndex >= lessons.length) return;
    [lessons[lessonIndex], lessons[newIndex]] = [lessons[newIndex], lessons[lessonIndex]];
    try {
      await updateLessonsOrder(
        lessons.map((l, i) => ({ id: l.id, module_id: mod.id, sort_order: i }))
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reorder lessons');
    }
  };

  return (
    <>
      <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Module header */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={modIndex === 0}
              className="p-0.5 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={modIndex === totalModules - 1}
              className="p-0.5 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowDown size={12} />
            </button>
          </div>
          <CaretDown
            size={14}
            weight="bold"
            className={`text-zinc-400 transition-transform shrink-0 ${expanded ? 'rotate-0' : '-rotate-90'}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                {modIndex + 1}
              </span>
              <span className="font-medium text-sm text-zinc-900 dark:text-white truncate">{mod.title}</span>
            </div>
            {mod.description && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">{mod.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-400">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
                >
                  <DotsThreeVertical size={14} weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <NotePencil size={14} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Lessons list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ ease: 'easeOut' as const }}
              className="border-t border-zinc-100 dark:border-zinc-800"
            >
              {mod.lessons.length === 0 ? (
                <div className="px-4 py-6 flex flex-col items-center gap-2 text-zinc-400">
                  <ListDashes size={20} />
                  <p className="text-xs">No lessons in this module</p>
                  <button
                    onClick={openCreateLesson}
                    className="text-xs text-emerald-600 hover:underline font-medium"
                  >
                    Add a lesson
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {mod.lessons.map((lesson, lessonIndex) => {
                    const TypeIcon = LESSON_TYPE_ICONS[lesson.type] || FileText;
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-4 py-2.5 pl-10 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group"
                      >
                        <div className="flex items-center gap-1 text-zinc-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveLesson(lessonIndex, -1)}
                            disabled={lessonIndex === 0}
                            className="p-0.5 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            onClick={() => moveLesson(lessonIndex, 1)}
                            disabled={lessonIndex === mod.lessons.length - 1}
                            className="p-0.5 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                        <TypeIcon size={14} className="text-zinc-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{lesson.title}</span>
                          {lesson.duration && (
                            <span className="text-xs text-zinc-400 ml-2">({lesson.duration})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditLesson(lesson)}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
                          >
                            <NotePencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-red-400"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <button
                  onClick={openCreateLesson}
                  className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Plus size={12} weight="bold" /> Add Lesson
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Lesson Form Modal */}
      <LessonFormModal
        open={lessonModalOpen}
        onClose={() => { setLessonModalOpen(false); setEditingLesson(null); }}
        moduleId={mod.id}
        lesson={editingLesson}
        onSaved={onRefresh}
      />
    </>
  );
}