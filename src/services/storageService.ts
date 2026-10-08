import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Bucket Definitions ──────────────────────────────────────────────
export const STORAGE_BUCKETS = {
  'course-thumbnails': { public: true, maxBytes: 5_000_000, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'] },
  'course-videos': { public: false, maxBytes: 524_288_000, mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'] },
  'course-documents': { public: false, maxBytes: 52_428_800, mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  'lesson-resources': { public: false, maxBytes: 52_428_800, mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'application/zip', 'image/jpeg', 'image/png', 'image/webp'] },
  'assignment-submissions': { public: false, maxBytes: 52_428_800, mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'application/zip', 'image/jpeg', 'image/png', 'image/webp'] },
  'certificates': { public: false, maxBytes: 10_000_000, mimeTypes: ['application/pdf', 'image/png', 'image/jpeg'] },
  'profile-images': { public: true, maxBytes: 5_000_000, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
} as const;

export type BucketName = keyof typeof STORAGE_BUCKETS;

// ─── Helpers ─────────────────────────────────────────────────────────
function getBucket(name: BucketName) {
  return supabase.storage.from(name);
}

function validateFile(file: File, bucket: BucketName): string | null {
  const config = STORAGE_BUCKETS[bucket];
  if (!config) return `Unknown bucket: ${bucket}`;
  const allowedMimeTypes = Object.values(STORAGE_BUCKETS).flatMap(b => b.mimeTypes);
  if (!allowedMimeTypes.includes(file.type as any)) {
    return `Invalid file type. Allowed: ${config.mimeTypes.map(m => m.split('/')[1].toUpperCase()).join(', ')}`;
  }
  if (file.size > config.maxBytes) {
    const limitMB = (config.maxBytes / 1_048_576).toFixed(0);
    return `File too large. Max ${limitMB}MB`;
  }
  return null;
}

// ─── Upload ──────────────────────────────────────────────────────────
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const error = validateFile(file, bucket);
  if (error) throw new Error(error);

  const { data, error: uploadError } = await getBucket(bucket).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    duplex: 'half',
  } as any);

  if (uploadError) throw uploadError;
  return data;
}

// ─── Signed URL (private buckets) ────────────────────────────────────
// Phase 20: in-memory cache so repeated accesses to the same asset (e.g. a
// video re-mounted on lesson navigation, or a resource list) don't each fire a
// fresh createSignedUrl round-trip. Entries expire slightly before the real
// token TTL so we never serve an expired URL.
type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

export async function getSignedUrl(bucket: BucketName, path: string, expiresIn = 3600) {
  const key = `${bucket}:${path}`;
  const now = Date.now();
  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > now) return cached.url;

  const { data, error } = await getBucket(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;

  // Cache for a hair less than the real TTL so we never hand back an expired URL.
  const ttlMs = Math.max(60_000, expiresIn * 1000 - 60_000);
  signedUrlCache.set(key, { url: data.signedUrl, expiresAt: now + ttlMs });
  return data.signedUrl;
}

export function clearSignedUrlCache() {
  signedUrlCache.clear();
}

// ─── Public URL ──────────────────────────────────────────────────────
export function getPublicUrl(bucket: BucketName, path: string) {
  const { data } = getBucket(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Delete ──────────────────────────────────────────────────────────
export async function deleteFile(bucket: BucketName, path: string) {
  const { error } = await getBucket(bucket).remove([path]);
  if (error) throw error;
}

// ─── Bulk Download ───────────────────────────────────────────────────
export async function getSignedUrls(bucket: BucketName, paths: string[], expiresIn = 3600) {
  const results = await Promise.all(paths.map(p => getSignedUrl(bucket, p, expiresIn)));
  return results;
}

// ─── Enrollment-based Access Check ───────────────────────────────────
export async function checkEnrollmentAccess(userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc('is_enrolled', { p_course_id: courseId });
  if (error) {
    console.error('enrollment check error:', error);
    return false;
  }
  return !!data;
}

// ─── Storage Path Helpers ────────────────────────────────────────────
export function makePath(bucket: BucketName, userId: string, fileName: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${userId}/${date}/${fileName.replace(/\s+/g, '-').toLowerCase()}`;
}

// ─── Admin Upload Wrapper ────────────────────────────────────────────
export interface UploadResult {
  path: string;
  url: string;
  bucket: BucketName;
  size: number;
  mimeType: string;
}

export async function adminUpload(
  bucket: BucketName,
  file: File,
  customPath?: string,
) {
  const userId = 'admin'; // Will be replaced by edge function in production
  const path = customPath || makePath(bucket, userId, file.name);
  
  try {
    await uploadFile(bucket, path, file);
    const url = STORAGE_BUCKETS[bucket].public 
      ? getPublicUrl(bucket, path) 
      : await getSignedUrl(bucket, path);
    
    return { path, url, bucket, size: file.size, mimeType: file.type };
  } catch (err: any) {
    toast.error(err.message || 'Upload failed');
    throw err;
  }
}