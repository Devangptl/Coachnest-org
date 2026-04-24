"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";

interface Category {
  slug: string;
  name: string;
}

const LEVEL_OPTIONS: SelectOption[] = [
  { value: "BEGINNER",     label: "Beginner"     },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED",     label: "Advanced"     },
];

const SUBJECT_OPTIONS: SelectOption[] = [
  { value: "react",            label: "React"            },
  { value: "python",           label: "Python"           },
  { value: "javascript",       label: "JavaScript"       },
  { value: "machine-learning", label: "Machine Learning" },
  { value: "system-design",    label: "System Design"    },
];

const FALLBACK_CATEGORIES: SelectOption[] = [
  { value: "web-development", label: "Web Development" },
  { value: "ai",              label: "AI & ML"         },
  { value: "design",          label: "UI/UX Design"    },
  { value: "database",        label: "Databases"       },
];

// Overrides that strip border/bg/rounded from the Select trigger so it blends
// flush into the unified bar (twMerge resolves conflicts; last class wins)
const BAR_TRIGGER =
  "bg-transparent border-transparent rounded-none py-3.5 px-3 " +
  "hover:bg-transparent hover:border-transparent " +
  "data-[state=open]:border-transparent data-[state=open]:bg-transparent " +
  "focus-visible:ring-0 text-muted-foreground/70";

export default function HeroSearchBar({ categories }: { categories: Category[] }) {
  const [category, setCategory] = useState("");
  const [level,    setLevel]    = useState("");
  const [subject,  setSubject]  = useState("");
  const [keyword,  setKeyword]  = useState("");
  const router = useRouter();

  const catOptions: SelectOption[] =
    categories.length > 0
      ? categories.map((c) => ({ value: c.slug, label: c.name }))
      : FALLBACK_CATEGORIES;

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (category)        params.set("category", category);
    if (level)           params.set("level",    level);
    if (subject)         params.set("subject",  subject);
    if (keyword.trim())  params.set("q",        keyword.trim());
    router.push(`/courses${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={handleSearch} className="mb-5">

      {/* Desktop: unified single-row bar */}
      <div className="hidden sm:flex items-center backdrop-blur-lg bg-secondary border border-border rounded-md overflow-hidden transition-all focus-within:border-orange-400/25 focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.07)] hover:border-orange-400/15">

        <Search className="w-4 h-4 text-muted-foreground/70 flex-shrink-0 ml-3.5 mr-0.5" />

        <div className="flex flex-1 items-stretch divide-x divide-border min-w-0">
          <div className="flex-1 min-w-0">
            <Select
              value={category}
              onValueChange={setCategory}
              options={catOptions}
              placeholder="All Categories"
              className={BAR_TRIGGER}
            />
          </div>
          <div className="flex-1 min-w-0">
            <Select
              value={level}
              onValueChange={setLevel}
              options={LEVEL_OPTIONS}
              placeholder="All Levels"
              className={BAR_TRIGGER}
            />
          </div>
          <div className="flex-1 min-w-0">
            <Select
              value={subject}
              onValueChange={setSubject}
              options={SUBJECT_OPTIONS}
              placeholder="Any Subject"
              className={BAR_TRIGGER}
            />
          </div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search courses…"
            className="flex-[1.3] min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 px-3 py-3.5 focus:outline-none"
          />
        </div>

        <div className="p-1.5">
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold px-5 py-2.5 rounded-[4px] transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        </div>
      </div>

      {/* Mobile: stacked layout */}
      <div className="sm:hidden flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={category}
            onValueChange={setCategory}
            options={catOptions}
            placeholder="All Categories"
          />
          <Select
            value={level}
            onValueChange={setLevel}
            options={LEVEL_OPTIONS}
            placeholder="All Levels"
          />
        </div>
        <Select
          value={subject}
          onValueChange={setSubject}
          options={SUBJECT_OPTIONS}
          placeholder="Any Subject"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search courses…"
              className="w-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 pl-9 pr-3 py-3 rounded-md focus:outline-none focus:border-orange-400/25 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold px-5 py-3 rounded-md transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        </div>
      </div>

    </form>
  );
}
