import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Clock, ArrowRight, PlayCircle, Check, ArrowLeft,
  Trophy, Certificate, FilePdf, Download, ListDashes,
  Spinner, Lock, FileText, Image as ImageIcon,
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSignedUrl } from '@/services/storageService';
import { useState, useEffect, useRef, useCallback } from 'react';

type LessonRow = { id: string; title: string; description: string | null; duration: string | null; type: string; content: string | null; video_url: string | null; is_free_preview: boolean | null; sort_order: number | null };
type ModuleRow = { id: string; title: string; lessons: LessonRow[] };
type CourseRow = { id: string; title: string; slug: string; total_lessons: number | null; total_modules: number | null; instructors?: { name: string }[] };
type EnrollmentRow = { id: string; completed_at: string | null; progress: number | null; status: string };
type LessonProgressRow = { id: string; lesson_id: string; completed: boolean | null; completed_at: string | null; time_spent_seconds: number | null; last_position_seconds: number | null; started_at: string | null };

export function StudentLessonPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [allLessons, setAllLessons] = useState<LessonRow[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonRow | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressRow | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [wantsPlay, setWantsPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloadingResource, setDownloadingResource] = useState<string | null>(null);
  const [showResources, setShowResources] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [savingProgress, setSavingProgress] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const flat = modules.flatMap(m => m.lessons).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setAllLessons(flat);
  }, [modules]);

  useEffect(() => {
    if (allLessons.length > 0 && !currentLesson) setCurrentLesson(allLessons[0]);
  }, [allLessons, currentLesson]);

  useEffect(() => {
    async function load() {
      if (!courseId) return;
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Please log in to access lessons'); setLoading(false); return; }

        const [{ data: enrollData }, { data: courseData }] = await Promise.all([
          supabase.from('enrollments').select('*').eq('user_id', user.id).eq('course_id', courseId).single(),
          supabase.from('courses').select('*, instructors:instructor_id(name)').eq('id', courseId).single(),
        ]);
        setEnrollment(enrollData || null);
        setCourse(courseData as unknown as CourseRow);

        const { data: moduleData } = await supabase.from('modules').select('*, lessons(*)').eq('course_id', courseId).order('sort_order', { ascending: true });
        setModules(moduleData as unknown as ModuleRow[]);

        const firstLessonId = (moduleData?.[0]?.lessons?.[0]?.id) || '';
        const { data: progressData } = await supabase.from('lesson_progress').select('*').eq('user_id', user.id).eq('lesson_id', firstLessonId);
        if (progressData?.[0]) setLessonProgress(progressData[0]);

        const { data: resData } = await supabase.from('lesson_resources').select('*').eq('lesson_id', firstLessonId).order('sort_order', { ascending: true });
        setResources(resData || []);
      } catch (err: any) { setError(err.message || 'Failed to load lesson'); }
      finally { setLoading(false); }
    }
    load();
  }, [courseId]);

  // Phase 20: lazy video. We do NOT fetch a signed URL or mount the <video>
  // element until the learner explicitly presses play. This avoids loading all
  // course videos (and their storage round-trips) simultaneously.
  useEffect(() => {
    if (!currentLesson || !currentLesson.video_url) { setVideoSrc(''); return; }
    if (!wantsPlay) { setVideoSrc(''); return; }
    async function loadVideo() {
      try {
        const url = await getSignedUrl('course-videos', currentLesson.video_url!, 3600);
        setVideoSrc(url);
        if (lessonProgress?.last_position_seconds) {
          setTimeout(() => { if (videoRef.current) videoRef.current.currentTime = lessonProgress.last_position_seconds; }, 500);
        }
      } catch { setVideoSrc(''); }
    }
    loadVideo();
  }, [currentLesson?.id, currentLesson?.video_url, lessonProgress?.last_position_seconds, wantsPlay]);

  const saveProgressThrottled = useCallback(async () => {
    if (!currentLesson || savingProgress) return;
    setSavingProgress(true);
    try {
      const pos = videoRef.current?.currentTime || 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('lesson_progress').upsert({
          user_id: user.id, lesson_id: currentLesson.id,
          last_position_seconds: Math.floor(pos), started_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
      }
    } catch { /* silent */ }
    setSavingProgress(false);
  }, [currentLesson?.id, savingProgress]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (Math.floor(videoRef.current.currentTime) % 30 === 0) saveProgressThrottled();
    }
  };

  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration); };
  const handleVideoEnded = async () => { setIsPlaying(false); await markLessonComplete(); };

  const markLessonComplete = async () => {
    if (!currentLesson) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('lesson_progress').upsert({
        user_id: user.id, lesson_id: currentLesson.id,
        completed: true, completed_at: new Date().toISOString(), time_spent_seconds: Math.floor(duration), last_position_seconds: 0,
      }, { onConflict: 'user_id,lesson_id' });
      setLessonProgress(prev => prev ? { ...prev, completed: true, completed_at: new Date().toISOString() } : null);
      toast.success('Lesson marked as complete!');
    } catch (err: any) { toast.error(err.message || 'Failed to save progress'); }
  };

  const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id);
  const nextLesson = allLessons[currentIndex + 1];
  const prevLesson = allLessons[currentIndex - 1];

  const goToLesson = (lesson: LessonRow) => {
    setCurrentLesson(lesson); setVideoSrc(''); setWantsPlay(false); setIsPlaying(false); setCurrentTime(0); setShowResources(false);
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

  const downloadResource = async (resource: any) => {
    if (!resource.storage_path) return;
    setDownloadingResource(resource.id);
    try {
      const url = await getSignedUrl('lesson-resources', resource.storage_path, 3600);
      const a = document.createElement('a'); a.href = url; a.download = resource.title || 'resource'; a.click();
    } catch (err: any) { toast.error(err.message || 'Download failed'); }
    setDownloadingResource(null);
  };

  if (loading) {
    return (
      <motion.div initial="hidden" animate="visible" className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-6 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <Lock size={48} className="mx-auto text-zinc-300 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-white">Access Required</h2>
        <p className="text-sm text-zinc-500 mb-4">{error}</p>
        {courseId && <Link to={`/checkout/${courseId}`}><Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">Enroll Now <ArrowRight size={16} /></Button></Link>}
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="text-center py-16">
        <BookOpen size={48} className="mx-auto text-zinc-300 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-white">Lesson not found</h2>
        <Link to={ROUTES.studentCourses}><Button variant="outline" className="gap-2"><ArrowLeft size={16} /> Back to Courses</Button></Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Link to={ROUTES.studentCourses} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-emerald-600 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to My Courses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {currentLesson.type === 'video' && (
            <div className="aspect-video rounded-xl bg-zinc-900 overflow-hidden relative">
              {videoSrc ? (
                <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain" preload="metadata" autoPlay
                  onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleVideoEnded} onClick={handlePlayPause} controls={!isPlaying} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {wantsPlay
                    ? <Spinner size={48} className="animate-spin text-zinc-500" />
                    : <span className="text-sm text-zinc-400">Press play to load the video</span>}
                </div>
              )}
              {!videoSrc && currentLesson.video_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button onClick={() => setWantsPlay(true)} className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                    <PlayCircle size={32} className="text-white" weight="fill" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reading / Text Content */}
          {(currentLesson.type === 'reading' || currentLesson.type === 'quiz' || currentLesson.type === 'assignment') && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{currentLesson.content || 'Content for this lesson will appear here.'}</p>
              </div>
            </div>
          )}

          {/* Lesson Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="capitalize">{currentLesson.type}</Badge>
              {currentLesson.is_free_preview && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">Free Preview</Badge>}
              {lessonProgress?.completed && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs flex items-center gap-1"><Check size={10} weight="bold" /> Completed</Badge>}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{currentLesson.title}</h1>
            {currentLesson.description && <p className="text-sm text-zinc-500 mb-4">{currentLesson.description}</p>}
            <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
              <span className="flex items-center gap-1"><Clock size={14} />{currentLesson.duration || 'N/A'}</span>
              {lessonProgress?.time_spent_seconds && <span className="flex items-center gap-1"><Clock size={14} />{Math.floor(lessonProgress.time_spent_seconds / 60)}m spent</span>}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Button onClick={markLessonComplete} disabled={!!lessonProgress?.completed}
                className={`gap-2 ${lessonProgress?.completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                <Check size={16} weight="bold" />{lessonProgress?.completed ? 'Completed' : 'Mark Complete'}
              </Button>
              <Button variant="outline" onClick={() => setShowResources(!showResources)} className="gap-2">
                <ListDashes size={16} /> Resources
              </Button>
            </div>

            {/* Resources Panel */}
            <AnimatePresence>
              {showResources && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ ease: 'easeOut' as const }} className="overflow-hidden">
                  <Card className="border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Lesson Resources</CardTitle></CardHeader>
                    <CardContent>
                      {resources.length === 0 ? (
                        <p className="text-sm text-zinc-500">No resources available for this lesson.</p>
                      ) : (
                        <div className="space-y-2">
                          {resources.map((res) => {
                            const ResIcon = res.mime_type?.includes('pdf') ? FilePdf : res.mime_type?.includes('image') ? ImageIcon : FileText;
                            return (
                              <div key={res.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <ResIcon size={20} className="text-emerald-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{res.title}</p>
                                  <p className="text-xs text-zinc-500">{res.mime_type?.split('/')[1]?.toUpperCase() || 'File'}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => downloadResource(res)} disabled={downloadingResource === res.id} className="gap-1 text-emerald-600">
                                  {downloadingResource === res.id ? <Spinner size={14} className="animate-spin" /> : <Download size={14} />}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              {prevLesson ? (
                <button onClick={() => goToLesson(prevLesson)} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-emerald-600 transition-colors">
                  <ArrowLeft size={14} /> Previous: {prevLesson.title}
                </button>
              ) : <div />}
              {nextLesson ? (
                <button onClick={() => goToLesson(nextLesson)} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                  Next: {nextLesson.title} <ArrowRight size={14} />
                </button>
              ) : (
                <Link to={ROUTES.studentCourses}><Button variant="outline" className="gap-2"><Trophy size={16} /> Finish Course</Button></Link>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Curriculum */}
        <div className="lg:col-span-1">
          <Card className="border-zinc-200 dark:border-zinc-800 sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{course.title}</CardTitle>
              <CardDescription className="text-xs">{modules.length} modules · {allLessons.length} lessons</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[calc(100dvh-12rem)] overflow-y-auto">
                {modules.map((mod) => (
                  <div key={mod.id} className="px-4 py-3">
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">{mod.title}</p>
                    <div className="space-y-1">
                      {mod.lessons.map((l) => {
                        const isActive = l.id === currentLesson?.id;
                        const lp = lessonProgress?.lesson_id === l.id && lessonProgress.completed;
                        return (
                          <button key={l.id} onClick={() => goToLesson(l)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                              isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium' : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${lp ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                              {lp ? <Check size={8} weight="bold" /> : <PlayCircle size={10} />}
                            </span>
                            <span className="flex-1 truncate">{l.title}</span>
                            <span className="text-zinc-400 shrink-0">{l.duration}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}