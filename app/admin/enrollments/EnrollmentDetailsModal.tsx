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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{enrollment.user.name}</h2>
            <p className="text-muted-foreground text-sm">{enrollment.user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Course Info */}
          <GlassCard padding="md">
            <div className="space-y-3">
              <h3 className="text-foreground font-semibold">Course Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Course:</span>
                  <span className="text-foreground">{enrollment.course.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Enrolled:</span>
                  <span className="text-foreground">{formatDate(enrollment.enrolledAt)}</span>
                </div>
                {enrollment.completedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="text-foreground">{formatDate(enrollment.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Progress */}
          <GlassCard padding="md">
            <div className="space-y-4">
              <h3 className="text-foreground font-semibold">Progress</h3>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground text-sm">Overall Progress</span>
                  <span className="text-foreground font-semibold">50%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div
                    className="h-3 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full"
                    style={{ width: "50%" }}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Lesson Progress */}
          <GlassCard padding="md">
            <h3 className="text-foreground font-semibold mb-4">Lesson Progress</h3>
            <div className="space-y-2">
              {["Lesson 1: Introduction", "Lesson 2: Basics", "Lesson 3: Advanced"].map(
                (lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <span className="text-foreground text-sm">{lesson}</span>
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
              <h3 className="text-foreground font-semibold">Send Notification</h3>
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
