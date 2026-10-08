// Rich fallback data so the homepage is never blank when Supabase tables
// are empty or queries fail (RLS, network, missing relations).

export interface MockCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  price: number;
  original_price: number | null;
  level: string;
  duration_hours: number;
  total_lessons: number;
  featured: boolean;
  category_id: string;
  rating: number;
  category: { id: string; name: string };
  instructor: { id: string; name: string };
}

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface MockTestimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  avatar: string;
}

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/450`;

export const MOCK_CATEGORIES: MockCategory[] = [
  { id: "cat-dev", name: "Development", slug: "development", description: "Code, architecture and modern web engineering." },
  { id: "cat-design", name: "Design", slug: "design", description: "UI, UX and visual craft from fundamentals to pro." },
  { id: "cat-data", name: "Data Science", slug: "data-science", description: "Analytics, machine learning and data storytelling." },
  { id: "cat-business", name: "Business", slug: "business", description: "Strategy, product and leadership essentials." },
  { id: "cat-marketing", name: "Marketing", slug: "marketing", description: "Growth, content and performance marketing." },
  { id: "cat-photo", name: "Photography", slug: "photography", description: "Camera craft, editing and visual narrative." },
];

export const MOCK_COURSES: MockCourse[] = [
  {
    id: "m1", slug: "modern-react-mastery", title: "Modern React Mastery", subtitle: "Hooks, patterns and performance for production apps",
    description: "Build fast, accessible React applications with hooks, suspense and modern tooling.",
    image: img("react-course"), price: 49, original_price: 129, level: "intermediate",
    duration_hours: 18, total_lessons: 42, featured: true, category_id: "cat-dev", rating: 4.9,
    category: { id: "cat-dev", name: "Development" }, instructor: { id: "i1", name: "Amara Okafor" },
  },
  {
    id: "m2", slug: "ui-design-foundations", title: "UI Design Foundations", subtitle: "Type, color and layout systems that scale",
    description: "A hands-on path through visual hierarchy, grids and design tokens.",
    image: img("ui-design"), price: 39, original_price: 99, level: "beginner",
    duration_hours: 12, total_lessons: 30, featured: true, category_id: "cat-design", rating: 4.8,
    category: { id: "cat-design", name: "Design" }, instructor: { id: "i2", name: "Liam Chen" },
  },
  {
    id: "m3", slug: "python-for-data-science", title: "Python for Data Science", subtitle: "From pandas to predictive models",
    description: "Clean, analyze and model real datasets with the modern Python stack.",
    image: img("data-science"), price: 59, original_price: 149, level: "intermediate",
    duration_hours: 24, total_lessons: 58, featured: true, category_id: "cat-data", rating: 4.9,
    category: { id: "cat-data", name: "Data Science" }, instructor: { id: "i3", name: "Sofia Martinez" },
  },
  {
    id: "m4", slug: "product-strategy-essentials", title: "Product Strategy Essentials", subtitle: "Ship the right thing at the right time",
    description: "Discovery, roadmapping and metrics frameworks used by top product teams.",
    image: img("product"), price: 45, original_price: null, level: "advanced",
    duration_hours: 10, total_lessons: 24, featured: false, category_id: "cat-business", rating: 4.7,
    category: { id: "cat-business", name: "Business" }, instructor: { id: "i4", name: "David Kim" },
  },
  {
    id: "m5", slug: "growth-marketing-playbook", title: "Growth Marketing Playbook", subtitle: "Acquire, activate and retain customers",
    description: "Practical channels, funnels and experiments that compound over time.",
    image: img("marketing"), price: 35, original_price: 89, level: "beginner",
    duration_hours: 9, total_lessons: 21, featured: true, category_id: "cat-marketing", rating: 4.6,
    category: { id: "cat-marketing", name: "Marketing" }, instructor: { id: "i5", name: "Nadia Haddad" },
  },
  {
    id: "m6", slug: "photography-masterclass", title: "Photography Masterclass", subtitle: "Light, composition and editing craft",
    description: "Tell visual stories with confidence, from first frame to final edit.",
    image: img("photography"), price: 42, original_price: 109, level: "beginner",
    duration_hours: 14, total_lessons: 33, featured: false, category_id: "cat-photo", rating: 4.8,
    category: { id: "cat-photo", name: "Photography" }, instructor: { id: "i6", name: "Tom Becker" },
  },
];

export const MOCK_TESTIMONIALS: MockTestimonial[] = [
  {
    id: "t1", name: "Grace Adeyemi", role: "Frontend Engineer",
    quote: "The projects are real and the mentors actually answer. I went from tutorials to shipping production code in three months.",
    rating: 5, avatar: "https://i.pravatar.cc/100?img=47",
  },
  {
    id: "t2", name: "Marcus Webb", role: "Product Designer",
    quote: "Best learning platform I have used. The design track is structured, honest and packed with portfolio-worthy work.",
    rating: 5, avatar: "https://i.pravatar.cc/100?img=12",
  },
  {
    id: "t3", name: "Priya Sharma", role: "Data Analyst",
    quote: "The data science course got me interview ready. Clear lessons, great pacing and certificates that mean something.",
    rating: 4.8, avatar: "https://i.pravatar.cc/100?img=32",
  },
];
