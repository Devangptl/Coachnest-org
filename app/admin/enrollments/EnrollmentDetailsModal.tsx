"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/Dialog";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";

export default function EnrollmentDetailsModal({
  enrollment,
  onClose,
}: {
  enrollment: any;
  onClose: () => void;
}) {
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendNotification = async () => {
    if (!notificationTitle || !notificationMessage) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${enrollment.user.id}/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notificationTitle,
          message: notificationMessage,
          type: "COURSE_UPDATE",
        }),
      });

      if (!res.ok) throw new Error("Failed to send notification");
      alert("Notification sent successfully!");
      setShowNotificationForm(false);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      alert("Error sending notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{enrollment.user.name}</h2>
            <p className="text-white/50 text-sm">{enrollment.user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Course Info */}
          <GlassCard padding="md">
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Course Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Course:</span>
                  <span className="text-white">{enrollment.course.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Enrolled:</span>
                  <span className="text-white">{formatDate(enrollment.enrolledAt)}</span>
                </div>
                {enrollment.completedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Completed:</span>
                    <span className="text-white">{formatDate(enrollment.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Progress */}
          <GlassCard padding="md">
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Progress</h3>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70 text-sm">Overall Progress</span>
                  <span className="text-white font-semibold">50%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div
                    className="h-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                    style={{ width: "50%" }}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Lesson Progress */}
          <GlassCard padding="md">
            <h3 className="text-white font-semibold mb-4">Lesson Progress</h3>
            <div className="space-y-2">
              {["Lesson 1: Introduction", "Lesson 2: Basics", "Lesson 3: Advanced"].map(
                (lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded">
                    <span className="text-white/80 text-sm">{lesson}</span>
                    <Badge variant={idx < 2 ? "green" : "gray"}>
                      {idx < 2 ? "Completed" : "Pending"}
                    </Badge>
                  </div>
                )
              )}
            </div>
          </GlassCard>

          {/* Send Notification */}
          <GlassCard padding="md">
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Send Notification</h3>
              {!showNotificationForm ? (
                <Button
                  variant="primary"
                  onClick={() => setShowNotificationForm(true)}
                  className="w-full"
                >
                  Send Message to Student
                </Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="label">Title</label>
                    <input
                      type="text"
                      className="input-glass w-full"
                      placeholder="Notification title"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Message</label>
                    <textarea
                      className="input-glass w-full h-24"
                      placeholder="Your message"
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      loading={loading}
                      onClick={handleSendNotification}
                      className="flex-1"
                    >
                      Send
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowNotificationForm(false);
                        setNotificationTitle("");
                        setNotificationMessage("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
