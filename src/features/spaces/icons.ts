import {
  BookOpen,
  Briefcase,
  Code2,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  Music,
  Plane,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const SPACE_ICON_OPTIONS = [
  'graduation-cap',
  'dumbbell',
  'users',
  'user',
  'briefcase',
  'heart',
  'home',
  'book-open',
  'music',
  'plane',
  'code',
  'wallet',
] as const;

const ICONS: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  dumbbell: Dumbbell,
  users: Users,
  user: User,
  briefcase: Briefcase,
  heart: Heart,
  home: Home,
  'book-open': BookOpen,
  music: Music,
  plane: Plane,
  code: Code2,
  wallet: Wallet,
};

export const SPACE_COLORS = [
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#A855F7',
  '#EC4899',
  '#EF4444',
  '#14B8A6',
  '#6366F1',
  '#84CC16',
  '#F97316',
] as const;

export function getSpaceIcon(name: string): LucideIcon {
  return ICONS[name] ?? User;
}
