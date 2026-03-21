"use client";
import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  initialValue?: string;
  className?:    string;
  placeholder?:  string;
  onSearch?:     (q: string) => void; // For controlled use (search page)
  navigateTo?:   boolean;             // Navigate to /search?q= on submit
}

export default function SearchBar({
  initialValue = "",
  className,
  placeholder = "Search courses...",
  onSearch,
  navigateTo = true,
}: Props) {
  const [value,   setValue]   = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external changes
  useEffect(() => { setValue(initialValue); }, [initialValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (onSearch)     onSearch(q);
    if (navigateTo)   router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function clear() {
    setValue("");
    if (onSearch) onSearch("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className={cn(
        "flex items-center gap-2 backdrop-blur-lg bg-white/10 border rounded-xl px-4 py-3 transition-all",
        focused ? "border-purple-400/60 bg-white/[.15]" : "border-white/20"
      )}>
        <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none text-sm"
        />
        {value && (
          <button type="button" onClick={clear} className="text-white/30 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
