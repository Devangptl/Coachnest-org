export const channels = {
  userNotifications: (userId: string) => `user:${userId}:notifications`,
  forumThread:       (threadId: string) => `forum:thread:${threadId}`,
  leaderboard:       () => `gamification:leaderboard`,
  activityFeed:      () => `community:activity-feed`,
} as const;

export const events = {
  notificationCreated: "notification.created",
  notificationRead:    "notification.read",
  forumReplyCreated:   "forum.reply.created",
  forumVoteChanged:    "forum.vote.changed",
  leaderboardChanged:  "gamification.xp.changed",
  activityCreated:     "activity.created",
} as const;

export type RealtimeEvent = (typeof events)[keyof typeof events];
