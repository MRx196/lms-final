import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House, BookOpen, Info, Envelope, User, Users, GearSix,
  SignOut, GraduationCap, X, ChartLine, Wallet, Exam, Certificate, ClipboardText
} from '@phosphor-icons/react';
import { BRAND_NAME } from '@/constants/navigation';

const IconMap: Record<string, React.ElementType> = {
  House, BookOpen, Info, Envelope, User, Users, GearSix,
  ChartLine, Wallet, Exam, Certificate, ClipboardText, GraduationCap
};

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  items: { label: string; path: string; icon: string }[];
  user: { name: string; email: string; avatar?: string } | null;
  role: string;
  onLogout: () => void;
}

export function MobileDrawer({ open, onClose, items, user, role, onLogout }: MobileDrawerProps) {
  const location = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 left-0 bottom-0 w-72 z-50 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <Link to="/" className="flex items-center gap-2 font-bold text-lg text-emerald-600" onClick={onClose}>
                <GraduationCap size={24} weight="fill" />
                <span>{BRAND_NAME}</span>
              </Link>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={20} />
              </button>
            </div>
            {user && (
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-zinc-500">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">
                  {role}
                </span>
              </div>
            )}
            <nav className="p-3 space-y-1">
              {items.map((item) => {
                const Icon = IconMap[item.icon] || House;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={onLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              >
                <SignOut size={18} />
                Sign Out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}