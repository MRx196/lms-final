export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ── Row types ──
export interface CourseRow { id: string; title: string; slug: string; subtitle: string | null; description: string | null; long_description: string | null; image: string | null; price: number; currency: string; original_price: number | null; level: string; status: string; category_id: string | null; instructor_id: string | null; duration_hours: number | null; total_lessons: number | null; total_modules: number | null; student_count: number | null; rating: number | null; featured: boolean | null; published_at: string | null; created_at: string | null; updated_at: string | null; learning_objectives: Json | null; requirements: Json | null; skills: string[] | null; tags: string[] | null }
export interface ModuleRow { id: string; course_id: string; title: string; description: string | null; duration: string | null; sort_order: number | null; created_at: string | null }
export interface LessonRow { id: string; module_id: string; title: string; type: string; content: string | null; description: string | null; video_url: string | null; video_storage_path: string | null; duration: string | null; sort_order: number | null; is_free_preview: boolean | null; created_at: string | null; updated_at: string | null }
export interface EnrollmentRow { id: string; user_id: string; course_id: string; payment_id: string | null; status: string; progress: number | null; enrolled_at: string; completed_at: string | null; certificate_url: string | null }
export interface ProfileRow { id: string; user_id: string; username: string | null; email: string | null; full_name: string | null; phone: string | null; avatar_url: string | null; role: "student" | "instructor" | "admin" | "super_admin"; status: "active" | "suspended" | "pending"; created_at: string; updated_at: string }
export interface CategoryRow { id: string; name: string; slug: string; description: string | null; created_at: string | null }
export interface InstructorRow { id: string; name: string; title: string | null; bio: string | null; avatar: string | null; created_at: string | null }
export interface TestimonialRow { id: string; name: string; quote: string; avatar: string | null; rating: number | null; role: string | null; featured: boolean | null; sort_order: number | null; created_at: string | null }
export interface LessonProgressRow { id: string; user_id: string; lesson_id: string; completed: boolean | null; started_at: string | null; completed_at: string | null; time_spent_seconds: number | null; last_position_seconds: number | null; created_at: string; updated_at: string }
export interface LessonResourceRow { id: string; lesson_id: string; title: string; type: string; url: string; bucket_name: string; storage_path: string | null; mime_type: string | null; size_bytes: number | null; sort_order: number | null; created_at: string }
export interface PaymentRow { id: string; user_id: string; course_id: string; amount: number; currency: string; status: string; provider: string | null; provider_reference: string | null; transaction_reference: string | null; transaction_id: string | null; customer_email: string | null; gateway_response: Json | null; metadata: Json | null; method: string | null; paid_at: string | null; created_at: string; updated_at: string }

// ── Table map with Insert/Update variants ──
type _R = { courses: CourseRow; modules: ModuleRow; lessons: LessonRow; enrollments: EnrollmentRow; profiles: ProfileRow; categories: CategoryRow; instructors: InstructorRow; testimonials: TestimonialRow; lesson_progress: LessonProgressRow; lesson_resources: LessonResourceRow; payments: PaymentRow }
export type Tables<K extends keyof _R> = _R[K]
export type TablesInsert<K extends keyof _R> = Partial<_R[K]>
export type TablesUpdate<K extends keyof _R> = Partial<_R[K]>

// ── Minimal Database for client.ts ──
export type Database = { public: { Tables: _R; Functions: {}; Enums: {} } }
