'use client'

import {
  GraduationCap, Shield, Briefcase, Shirt, Dumbbell, Sparkles, Star, Award, Scan,
  Sword, Hand, Wand2, Dog, Moon, ShieldAlert, HeartPulse, Bot, Dna, FlaskConical, Target,
  Zap, Trophy, Ghost, Laugh, Heart, Search, Mountain, Coffee, Rocket, Scroll, BookOpen, Globe, Music,
  Maximize2, Minimize2, Droplet, Sparkle, Circle, Eye, GitFork, ArrowUp, ArrowDown,
  Cloud, Sun, EyeOff, PartyPopper, Link, Snowflake, Smile, Activity, Shuffle,
  Glasses, PenTool, Scissors, CircleDashed, Gem, Armchair, Mars, Venus,
  Wind, PawPrint, AlignJustify, Cat, Crown, Flame, LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  'shield': Shield,
  'briefcase': Briefcase,
  'shirt': Shirt,
  'dumbbell': Dumbbell,
  'sparkles': Sparkles,
  'star': Star,
  'award': Award,
  'scan': Scan,
  'sword': Sword,
  'hand': Hand,
  'wand-2': Wand2,
  'dog': Dog,
  'moon': Moon,
  'shield-alert': ShieldAlert,
  'heart-pulse': HeartPulse,
  'bot': Bot,
  'dna': Dna,
  'flask-conical': FlaskConical,
  'target': Target,
  'zap': Zap,
  'trophy': Trophy,
  'ghost': Ghost,
  'laugh': Laugh,
  'heart': Heart,
  'search': Search,
  'mountain': Mountain,
  'coffee': Coffee,
  'rocket': Rocket,
  'scroll': Scroll,
  'book-open': BookOpen,
  'globe': Globe,
  'music': Music,
  'maximize-2': Maximize2,
  'minimize-2': Minimize2,
  'droplet': Droplet,
  'sparkle': Sparkle,
  'circle': Circle,
  'eye': Eye,
  'git-fork': GitFork,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'cloud': Cloud,
  'sun': Sun,
  'eye-off': EyeOff,
  'party-popper': PartyPopper,
  'link': Link,
  'snowflake': Snowflake,
  'smile': Smile,
  'activity': Activity,
  'shuffle': Shuffle,
  'glasses': Glasses,
  'pen-tool': PenTool,
  'scissors': Scissors,
  'circle-dashed': CircleDashed,
  'gem': Gem,
  'mask': Eye,        // lucide-react에 Mask 없음 - Eye로 대체
  'armchair': Armchair,
  'mars': Mars,
  'venus': Venus,
  'wind': Wind,
  'paw-print': PawPrint,
  'align-justify': AlignJustify,
  'cat': Cat,
  'crown': Crown,
  'flame': Flame,
}

interface Props {
  name: string
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export default function GameIcon({ name, size = 20, color, strokeWidth = 1.5, className }: Props) {
  const Icon = ICON_MAP[name]
  if (!Icon) return null
  return <Icon size={size} color={color} strokeWidth={strokeWidth} className={className} />
}
