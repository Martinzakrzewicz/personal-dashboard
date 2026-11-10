import { CalendarDays, GraduationCap, Package, Star, Trophy, type LucideIcon } from 'lucide-react';
import type { MilestoneType } from '../../db/types';

export const MILESTONE_ICONS: Record<MilestoneType, LucideIcon> = {
  exam: GraduationCap,
  match: Trophy,
  delivery: Package,
  event: CalendarDays,
  other: Star,
};

export const MILESTONE_TYPES_ORDER: MilestoneType[] = ['exam', 'match', 'delivery', 'event', 'other'];
