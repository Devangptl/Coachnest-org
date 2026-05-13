"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function SettingsTab({ cls }: { cls: any }) {
  const router = useRouter();

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
      router.refresh();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function destroy() {
    if (!confirm(`Delete "${cls.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/classes/${cls.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Class deleted");
      router.push("/instructor/classes");
    } else { toast.error("Failed to delete"); }
  }

  async function regen() {
    const res = await fetch(`/api/classes/${cls.id}/invite`, { method: "POST" });
    if (res.ok) {
      toast.success("New invite code generated");
      router.refresh();
    } else { toast.error("Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="glass p-5 rounded-xl space-y-3">
        <h3 className="font-semibold">General</h3>
        <input className="input-glass" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="input-glass min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid sm:grid-cols-2 gap-3">
          <select className="input-glass" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
          <select className="input-glass" value={joinMode} onChange={(e) => setJoinMode(e.target.value)}>
            <option value="OPEN">Open</option>
            <option value="APPROVAL_REQUIRED">Approval required</option>
            <option value="INVITE_ONLY">Invite only</option>
          </select>
        </div>
        <input className="input-glass" type="number" placeholder="Max students (blank = unlimited)" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} />
      </div>

      <div className="glass p-5 rounded-xl space-y-2">
        <h3 className="font-semibold mb-2">Features</h3>
        {[
          ["Chat", enableChat, setEnableChat],
          ["Discussion", enableDiscussion, setEnableDiscussion],
          ["Attendance", enableAttendance, setEnableAttendance],
          ["Live classes", enableLiveClass, setEnableLiveClass],
          ["Certificates", enableCertificate, setEnableCertificate],
        ].map(([label, val, setVal]: any) => (
          <label key={label} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={val} onChange={(e) => setVal(e.target.checked)} />
            {label}
          </label>
        ))}
      </div>

      {cls.inviteCode && (
        <div className="glass p-5 rounded-xl">
          <h3 className="font-semibold mb-2">Invite code</h3>
          <div className="flex items-center gap-2">
            <code className="bg-secondary px-3 py-1.5 rounded text-sm">{cls.inviteCode}</code>
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
  );
}
