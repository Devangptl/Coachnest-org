export const channels = {
  userNotifications: (userId: string) => `user:${userId}:notifications`,
  forumThread:       (threadId: string) => `forum:thread:${threadId}`,
  leaderboard:       () => `gamification:leaderboard`,
  activityFeed:      () => `community:activity-feed`,
  groupNotes:        (groupId: string) => `group:${groupId}:notes`,
  classChat:         (classId: string) => `class:${classId}:chat`,
  classAnnouncements:(classId: string) => `class:${classId}:announcements`,
  classJoinRequests: (classId: string) => `class:${classId}:join-requests`,
  classAttendance:   (classId: string) => `class:${classId}:attendance`,
  classLive:         (classId: string) => `class:${classId}:live`,
  classAssignments:  (classId: string) => `class:${classId}:assignments`,
  whiteboard:        (whiteboardId: string) => `whiteboard:${whiteboardId}`,
} as const;

export const events = {
  notificationCreated: "notification.created",
  notificationRead:    "notification.read",
  forumReplyCreated:   "forum.reply.created",
  forumVoteChanged:    "forum.vote.changed",
  leaderboardChanged:  "gamification.xp.changed",
  activityCreated:     "activity.created",
  groupNoteCreated:    "group.note.created",
  classChatMessage:    "class.chat.message",
  classAnnouncement:   "class.announcement.created",
  classJoinRequest:    "class.join-request.created",
  classJoinDecision:   "class.join-request.decision",
  classAttendance:     "class.attendance.updated",
  classLiveStarted:    "class.live.started",
  classLiveEnded:      "class.live.ended",
  classAssignmentPublished: "class.assignment.published",
  classAssignmentSubmitted: "class.assignment.submitted",
  classAssignmentGraded:    "class.assignment.graded",
  // Whiteboard — pointer/scene are broadcast client→client at high frequency;
  // structural events are emitted server-side after a DB write.
  whiteboardSceneUpdate:       "whiteboard.scene.update",
  whiteboardPointerUpdate:     "whiteboard.pointer.update",
  whiteboardPageChanged:       "whiteboard.page.changed",
  whiteboardCollaboratorChanged: "whiteboard.collaborator.changed",
} as const;

export type RealtimeEvent = (typeof events)[keyof typeof events];
