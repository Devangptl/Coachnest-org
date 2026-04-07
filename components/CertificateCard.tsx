"use client";
import { Award, Download } from "lucide-react";
import { Button } from "./ui/Button";
import { format } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  cert: {
    id:        string;
    issuedAt:  string | Date;
    course: {
      id:        string;
      title:     string;
      thumbnail: string | null;
    };
  };
}

export default function CertificateCard({ cert }: Props) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/certificates/${cert.course.id}`);
      if (!res.ok) throw new Error("Failed to generate certificate");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `certificate-${cert.course.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass p-5 flex gap-4 items-start hover:bg-white/[.12] transition-colors">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-md overflow-hidden bg-orange-500/15 flex-shrink-0 relative">
        {cert.course.thumbnail ? (
          <Image src={cert.course.thumbnail} alt={cert.course.title} fill className="object-cover" />
        ) : (
          <Award className="w-8 h-8 text-orange-400 absolute inset-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
          {cert.course.title}
        </h3>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Issued {format(new Date(cert.issuedAt), "d MMM yyyy")}
        </p>
        <span className="badge-green mt-2">Completed</span>
      </div>

      <Button size="sm" variant="secondary" loading={loading} onClick={download}>
        <Download className="w-3.5 h-3.5" />
        PDF
      </Button>
    </div>
  );
}
