"use client";

import {
  Code, Palette, GraduationCap, BookOpen, Briefcase, Laptop,
  Pencil, Stethoscope, BarChart3, Music, Camera, Dumbbell,
  Globe, Wrench, FlaskConical, Layers, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Map icon name strings → Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Code,
  Palette,
  GraduationCap,
  BookOpen,
  Briefcase,
  Laptop,
  Pencil,
  Stethoscope,
  BarChart3,
  Music,
  Camera,
  Dumbbell,
  Globe,
  Wrench,
  FlaskConical,
  Layers,
};

// Map color names → Tailwind classes
const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; selectedBg: string; selectedBorder: string }> = {
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/20",   icon: "text-blue-400",   selectedBg: "bg-blue-500/20",   selectedBorder: "border-blue-400" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-400", selectedBg: "bg-purple-500/20", selectedBorder: "border-purple-400" },
  green:  { bg: "bg-emerald-500/10",border: "border-emerald-500/20",icon: "text-emerald-400",selectedBg: "bg-emerald-500/20",selectedBorder: "border-emerald-400" },
  orange: { bg: "bg-primary/10",    border: "border-primary/20",    icon: "text-primary",   selectedBg: "bg-primary/20",    selectedBorder: "border-primary"   },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  icon: "text-amber-400",  selectedBg: "bg-amber-500/20",  selectedBorder: "border-amber-400"  },
  teal:   { bg: "bg-teal-500/10",   border: "border-teal-500/20",   icon: "text-teal-400",   selectedBg: "bg-teal-500/20",   selectedBorder: "border-teal-400"   },
  rose:   { bg: "bg-rose-500/10",   border: "border-rose-500/20",   icon: "text-rose-400",   selectedBg: "bg-rose-500/20",   selectedBorder: "border-rose-400"   },
};

export interface ProfessionData {
  id:          string;
  slug:        string;
  name:        string;
  description: string;
  icon:        string;
  color:       string;
}

interface ProfessionCardProps {
  profession: ProfessionData;
  selected:   boolean;
  onToggle:   (id: string) => void;
}

export default function ProfessionCard({
  profession,
  selected,
  onToggle,
}: ProfessionCardProps) {
  const Icon    = ICON_MAP[profession.icon] ?? Layers;
  const palette = COLOR_MAP[profession.color] ?? COLOR_MAP["orange"];

  return (
    <button
      type="button"
      onClick={() => onToggle(profession.id)}
      className={cn(
        "relative w-full text-left rounded-md border p-4 transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? cn("bg-card", palette.selectedBg, palette.selectedBorder, "shadow-md")
          : "bg-card border-border hover:border-border/80 hover:bg-secondary/50"
      )}
      aria-pressed={selected}
    >
      {/* Check badge */}
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
      )}

      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
        selected ? palette.selectedBg : palette.bg,
        "border",
        selected ? palette.selectedBorder : palette.border,
      )}>
        <Icon className={cn("w-5 h-5", palette.icon)} />
      </div>

      {/* Text */}
      <p className="text-sm font-semibold text-foreground leading-snug mb-1">
        {profession.name}
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {profession.description}
      </p>
    </button>
  );
}
