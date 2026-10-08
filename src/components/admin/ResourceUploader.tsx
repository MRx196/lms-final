import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadSimple, X, Video, FilePdf, Image, Spinner, CheckCircle, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { adminUpload, STORAGE_BUCKETS, type BucketName } from '@/services/storageService';

interface ResourceUploaderProps {
  bucket: BucketName;
  onUploaded?: (result: { path: string; url: string }) => void;
  onClose?: () => void;
}

const BUCKET_LABELS: Record<BucketName, string> = {
  'course-thumbnails': 'Course Thumbnail',
  'course-videos': 'Course Video',
  'course-documents': 'Course Document',
  'lesson-resources': 'Lesson Resource',
  'assignment-submissions': 'Assignment Submission',
  'certificates': 'Certificate',
  'profile-images': 'Profile Image',
};

export function ResourceUploader({ bucket, onUploaded, onClose }: ResourceUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const maxSizeMB = (STORAGE_BUCKETS[bucket].maxBytes / 1_048_576).toFixed(0);
  const allowedTypes = STORAGE_BUCKETS[bucket].mimeTypes.map(m => m.split('/')[1].toUpperCase()).join(', ');

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);

    const bucketName = bucket as keyof typeof STORAGE_BUCKETS;
    if (!(STORAGE_BUCKETS as any)[bucketName].mimeTypes.includes(selected.type)) {
      setError(`Invalid file type. Allowed: ${allowedTypes}`);
      setFile(null);
      return;
    }
    if (selected.size > STORAGE_BUCKETS[bucket].maxBytes) {
      setError(`File too large. Max ${maxSizeMB}MB`);
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await adminUpload(bucket, file, undefined);
      setProgress(100);
      toast.success('File uploaded successfully');
      onUploaded?.({ path: result.path, url: result.url });
      onClose?.();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return UploadSimple;
    const type = file.type;
    if (type.startsWith('video')) return Video;
    if (type === 'application/pdf') return FilePdf;
    if (type.startsWith('image')) return Image;
    return FilePdf;
  };

  const Icon = getFileIcon();

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-md mx-4"
        >
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Upload {BUCKET_LABELS[bucket]}
                </h2>
                {onClose && (
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Drop Zone */}
              {!file ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all">
                  <UploadSimple size={32} className="text-zinc-400 mb-3" />
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-zinc-500">
                    {allowedTypes} • Max {maxSizeMB}MB
                  </p>
                  <input
                    type="file"
                    accept={STORAGE_BUCKETS[bucket].mimeTypes.join(',')}
                    onChange={handleSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  {/* File Preview */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => { setFile(null); setError(null); }}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Progress */}
                  {(uploading || progress > 0) && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>{uploading ? 'Uploading...' : progress === 100 ? 'Complete!' : 'Processing...'}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ ease: 'easeOut' as const }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      <Warning size={16} />
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => { setFile(null); setError(null); }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {uploading ? (
                        <>
                          <Spinner size={16} className="animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <UploadSimple size={16} /> Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}