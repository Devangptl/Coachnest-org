"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  courseId: string;
  userId: string;
}

export default function CertificateDownloadBtn({ courseId, userId }: Props) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/certificates/${courseId}?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to generate certificate");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${courseId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors disabled:opacity-50"
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      PDF
    </button>
  );
}
