"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "./ui/Button";

interface Props {
  courseId: string;
  courseTitle: string;
}

export default function CertificateDownloadButton({ courseId, courseTitle }: Props) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/certificates/${courseId}`);
      if (!res.ok) throw new Error("Failed to generate certificate");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${courseTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" loading={loading} onClick={download}>
      <Download className="w-3.5 h-3.5" />
      Download PDF
    </Button>
  );
}
