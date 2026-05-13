"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { DateTimeInput } from "@/components/ui/DateTimeInput";
import {
  ArrowLeft, ArrowRight, Save, BookOpen, Calendar, Settings,
  Eye, MessageSquare, Video, ClipboardCheck, GripVertical, X, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type Course = {
  id: string;
  title: string;
  thumbnail: string | null;
  totalLessons: number;
  totalDuration: number;
  status: string;
};

type SelectedCourse = {
  courseId: string;
  isRequired: boolean;
  unlockAfterDays: number | null;
};

const STEPS = ["Basics", "Courses", "Enrollment", "Schedule", "Features", "Review"] as const;

export default function CreateClassWizard({ availableCourses }: { availableCourses: Course[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [banner, setBanner] = useState("");

  const [selected, setSelected] = useState<SelectedCourse[]>([]);

  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [joinMode, setJoinMode] = useState<"OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY">("OPEN");
  const [maxStudents, setMaxStudents] = useState<string>("");

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [features, setFeatures] = useState({
    enableChat: true,
    enableDiscussion: true,
    enableAttendance: false,
    enableLiveClass: false,
    enableLeaderboard: true,
    enableCertificate: true,
  });

  const selectedSet = useMemo(() => new Set(selected.map((s) => s.courseId)), [selected]);

  function toggleCourse(courseId: string) {
    setSelected((prev) =>
      prev.find((c) => c.courseId === courseId)
        ? prev.filter((c) => c.courseId !== courseId)
        : [...prev, { courseId, isRequired: true, unlockAfterDays: null }],
    );
  }

  function moveCourse(index: number, dir: -1 | 1) {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit(publish: boolean) {
    if (!name.trim()) {
      toast.error("Class name is required");
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          thumbnail: thumbnail || null,
          banner: banner || null,
          visibility,
          joinMode,
          maxStudents: maxStudents ? parseInt(maxStudents, 10) : null,
          startDate: startDate || null,
          endDate: endDate || null,
          ...features,
          courses: selected.map((c, i) => ({
            courseId: c.courseId,
            order: i,
            isRequired: c.isRequired,
            unlockAfterDays: c.unlockAfterDays,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create class");
      }
      const { class: cls } = await res.json();

      if (publish) {
        await fetch(`/api/classes/${cls.id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        });
      }
      toast.success(publish ? "Class published!" : "Draft saved");
      router.push(`/instructor/classes/${cls.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 max-w-4xl mx-auto pb-12">
      <h1 className="text-2xl font-bold mb-2">Create a new class</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Group multiple courses into a cohort-based learning experience.
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              i === step
                ? "bg-amber-500/15 text-amber-400 border border-amber-400/30"
                : i < step
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20"
                  : "bg-secondary text-muted-foreground border border-transparent"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">
              {i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="glass rounded-xl p-6 mb-4">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" /> Basic Information
            </h2>
            <Field label="Class name" required>
              <input
                className="input-glass"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full-Stack Bootcamp — Spring 2026"
                maxLength={120}
              />
            </Field>
            <Field label="Description">
              <textarea
                className="input-glass min-h-[120px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What students will learn, who it's for, prerequisites…"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Thumbnail URL">
                <input className="input-glass" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} />
              </Field>
              <Field label="Banner URL">
                <input className="input-glass" value={banner} onChange={(e) => setBanner(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" /> Select Courses
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick one or more of your courses to include. Drag to reorder. Mark required or optional.
            </p>

            {/* Selected list */}
            {selected.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">In this class ({selected.length})</div>
                {selected.map((sc, i) => {
                  const course = availableCourses.find((c) => c.id === sc.courseId);
                  if (!course) return null;
                  return (
                    <div key={sc.courseId} className="glass p-3 rounded-lg flex items-center gap-3">
                      <button
                        type="button"
                        className="cursor-grab text-muted-foreground hover:text-foreground"
                        onClick={() => moveCourse(i, -1)}
                        aria-label="Move up"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-semibold text-amber-400 w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{course.title}</div>
                        <div className="text-xs text-muted-foreground">{course.totalLessons} lessons</div>
                      </div>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={sc.isRequired}
                          onChange={(e) =>
                            setSelected((prev) =>
                              prev.map((p) =>
                                p.courseId === sc.courseId ? { ...p, isRequired: e.target.checked } : p,
                              ),
                            )
                          }
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => toggleCourse(sc.courseId)}
                        aria-label="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-xs font-semibold text-muted-foreground uppercase mt-4">Your courses</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {availableCourses.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleCourse(c.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedSet.has(c.id)
                      ? "border-amber-400/40 bg-amber-500/5"
                      : "border-border hover:border-amber-400/30"
                  }`}
                >
                  <div className="font-medium text-sm truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.totalLessons} lessons · {c.status}</div>
                </button>
              ))}
              {availableCourses.length === 0 && (
                <div className="col-span-full text-center text-sm text-muted-foreground py-6">
                  You don&apos;t have any courses yet.{" "}
                  <a href="/instructor/courses/new" className="text-amber-400 underline">Create one</a>.
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" /> Enrollment Settings
            </h2>

            <Field label="Visibility">
              <div className="grid grid-cols-2 gap-2">
                {(["PUBLIC", "PRIVATE"] as const).map((v) => (
                  <RadioCard
                    key={v}
                    selected={visibility === v}
                    onClick={() => setVisibility(v)}
                    title={v === "PUBLIC" ? "Public" : "Private"}
                    desc={v === "PUBLIC" ? "Anyone can find this class" : "Only people with the link"}
                  />
                ))}
              </div>
            </Field>

            <Field label="Join mode">
              <div className="grid sm:grid-cols-3 gap-2">
                {(["OPEN", "APPROVAL_REQUIRED", "INVITE_ONLY"] as const).map((m) => (
                  <RadioCard
                    key={m}
                    selected={joinMode === m}
                    onClick={() => setJoinMode(m)}
                    title={m.replace("_", " ").toLowerCase()}
                    desc={
                      m === "OPEN"
                        ? "Join instantly"
                        : m === "APPROVAL_REQUIRED"
                          ? "You approve every join"
                          : "Invite code required"
                    }
                  />
                ))}
              </div>
            </Field>

            <Field label="Max students (optional)">
              <input
                type="number"
                className="input-glass"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                placeholder="No limit"
                min={1}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Schedule
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Start date">
                <DateTimeInput type="date" value={startDate} onChange={setStartDate} />
              </Field>
              <Field label="End date">
                <DateTimeInput type="date" value={endDate} onChange={setEndDate} />
              </Field>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" /> Features
            </h2>
            <FeatureToggle
              icon={MessageSquare}
              label="Realtime chat"
              checked={features.enableChat}
              onChange={(v) => setFeatures({ ...features, enableChat: v })}
            />
            <FeatureToggle
              icon={MessageSquare}
              label="Discussion board"
              checked={features.enableDiscussion}
              onChange={(v) => setFeatures({ ...features, enableDiscussion: v })}
            />
            <FeatureToggle
              icon={Video}
              label="Live classes"
              checked={features.enableLiveClass}
              onChange={(v) => setFeatures({ ...features, enableLiveClass: v })}
            />
            <FeatureToggle
              icon={ClipboardCheck}
              label="Attendance tracking"
              checked={features.enableAttendance}
              onChange={(v) => setFeatures({ ...features, enableAttendance: v })}
            />
            <FeatureToggle
              icon={Trophy}
              label="Cohort leaderboard"
              checked={features.enableLeaderboard}
              onChange={(v) => setFeatures({ ...features, enableLeaderboard: v })}
            />
            <FeatureToggle
              icon={Trophy}
              label="Issue certificates on completion"
              checked={features.enableCertificate}
              onChange={(v) => setFeatures({ ...features, enableCertificate: v })}
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Ready to publish?</h2>
            <p className="text-sm text-muted-foreground">
              Review the summary below. You can always edit details later.
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm mt-4">
              <Summary label="Name" value={name || "—"} />
              <Summary label="Courses" value={String(selected.length)} />
              <Summary label="Visibility" value={visibility} />
              <Summary label="Join mode" value={joinMode} />
              <Summary label="Max students" value={maxStudents || "Unlimited"} />
              <Summary label="Live classes" value={features.enableLiveClass ? "On" : "Off"} />
              <Summary label="Attendance" value={features.enableAttendance ? "On" : "Off"} />
              <Summary label="Chat" value={features.enableChat ? "On" : "Off"} />
            </dl>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => submit(false)}
          >
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button disabled={saving} onClick={() => submit(true)}>
              Publish Class
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function RadioCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-all ${
        selected
          ? "border-amber-400/50 bg-amber-500/5"
          : "border-border hover:border-amber-400/30"
      }`}
    >
      <div className="font-semibold text-sm capitalize">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}

function FeatureToggle({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-amber-400/30 cursor-pointer">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-3 rounded-lg">
      <dt className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value}</dd>
    </div>
  );
}
