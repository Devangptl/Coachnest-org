"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function SettingsTab({ cls, onRefresh }: { cls: any; onRefresh?: () => void }) {
  const router = useRouter();
  const confirm = useConfirm();

  const [name, setName] = useState(cls.name);
  const [description, setDescription] = useState(cls.description ?? "");
  const [visibility, setVisibility] = useState(cls.visibility);
  const [joinMode, setJoinMode] = useState(cls.joinMode);
  const [maxStudents, setMaxStudents] = useState(cls.maxStudents?.toString() ?? "");
  const [enableChat, setEnableChat] = useState(cls.enableChat);
  const [enableDiscussion, setEnableDiscussion] = useState(cls.enableDiscussion);
  const [enableAttendance, setEnableAttendance] = useState(cls.enableAttendance);
  const [enableLiveClass, setEnableLiveClass] = useState(cls.enableLiveClass);
  const [enableCertificate, setEnableCertificate] = useState(cls.enableCertificate);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description, visibility, joinMode,
          maxStudents: maxStudents ? parseInt(maxStudents, 10) : null,
          enableChat, enableDiscussion, enableAttendance, enableLiveClass, enableCertificate,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved");
      onRefresh?.();
      router.refresh();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function destroy() {
    const ok = await confirm(`Delete "${cls.name}"? All enrollments, sessions, and messages will be permanently removed. This cannot be undone.`, {
      title: "Delete class",
      confirmText: "Delete",
    });
    if (!ok) return;
    const res = await fetch(`/api/classes/${cls.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Class deleted");
      router.push("/instructor/classes");
    } else { toast.error("Failed to delete"); }
  }

  async function regen() {
    const ok = await confirm("The current invite link will stop working immediately. Are you sure?", {
      title: "Regenerate invite code",
      confirmText: "Regenerate",
      variant: "info",
    });
    if (!ok) return;
    const res = await fetch(`/api/classes/${cls.id}/invite`, { method: "POST" });
    if (res.ok) {
      toast.success("New invite code generated");
      onRefresh?.();
      router.refresh();
    } else { toast.error("Failed"); }
  }

  const visibilityOptions = [
    { value: "PUBLIC",  label: "Public"  },
    { value: "PRIVATE", label: "Private" },
  ];

  const joinModeOptions = [
    { value: "OPEN",               label: "Open"              },
    { value: "APPROVAL_REQUIRED",  label: "Approval required" },
    { value: "INVITE_ONLY",        label: "Invite only"       },
  ];

  const featureToggles = [
    ["Chat",         enableChat,        setEnableChat       ],
    ["Discussion",   enableDiscussion,  setEnableDiscussion ],
    ["Attendance",   enableAttendance,  setEnableAttendance ],
    ["Live classes", enableLiveClass,   setEnableLiveClass  ],
    ["Certificates", enableCertificate, setEnableCertificate],
  ] as const;

  return (
    <>
      <div className="space-y-4">
        <div className="glass p-5 rounded-xl space-y-3">
          <h3 className="font-semibold">General</h3>
          <input
            className="input-glass"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="input-glass min-h-[100px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <CustomSelect
              value={visibility}
              onChange={setVisibility}
              options={visibilityOptions}
            />
            <CustomSelect
              value={joinMode}
              onChange={setJoinMode}
              options={joinModeOptions}
            />
          </div>
          <input
            className="input-glass"
            type="number"
            placeholder="Max students (blank = unlimited)"
            value={maxStudents}
            onChange={(e) => setMaxStudents(e.target.value)}
          />
        </div>

        <div className="glass p-5 rounded-xl space-y-2">
          <h3 className="font-semibold mb-2">Features</h3>
          {featureToggles.map(([label, val, setVal]) => (
            <label key={label} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 cursor-pointer text-sm transition-colors">
              <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${val ? "bg-amber-400" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              {label}
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => (setVal as (v: boolean) => void)(e.target.checked)}
                className="sr-only"
              />
            </label>
          ))}
        </div>

        {cls.inviteCode && (
          <div className="glass p-5 rounded-xl">
            <h3 className="font-semibold mb-2">Invite code</h3>
            <div className="flex items-center gap-2">
              <code className="bg-secondary px-3 py-1.5 rounded text-sm flex-1 truncate">
                {cls.inviteCode}
              </code>
              <Button size="sm" variant="secondary" onClick={regen}>
                <RotateCw className="w-4 h-4" /> Regenerate
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button onClick={save} disabled={saving}>Save changes</Button>
          <Button variant="danger" onClick={destroy}>
            <Trash2 className="w-4 h-4" /> Delete class
          </Button>
        </div>
      </div>
    </>
  );
}
