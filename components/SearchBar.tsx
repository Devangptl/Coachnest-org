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
  onChange?:     (q: string) => void; // Fires on every keystroke (for debounce)
  navigateTo?:   boolean;             // Navigate to /search?q= on submit
}

export default function SearchBar({
  initialValue = "",
  className,
  placeholder = "Search courses...",
  onSearch,
  onChange,
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
    onSearch?.("");
    onChange?.("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative w-full", className)}>
      <div className={cn(
        "w-full flex items-center gap-2 bg-secondary border rounded-md px-4 py-2.5 transition-all",
        focused ? "border-[#d97757]/25 bg-secondary" : "border-border"
      )}>
        <Search className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); onChange?.(e.target.value); }}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm"
        />
        {value && (
          <button type="button" onClick={clear} className="text-muted-foreground/50 hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
