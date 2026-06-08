"use client";

import { Circle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhiteboard } from "./WhiteboardProvider";
import type { WhiteboardRole } from "@/types/whiteboard";

const ROLE_STYLE: Record<WhiteboardRole, string> = {
  OWNER: "text-amber-400",
  EDITOR: "text-emerald-400",
  VIEWER: "text-muted-foreground",
};

export default function CollaboratorPanel() {
  const { onlineUsers, collaborators, currentUser } = useWhiteboard();

  const onlineIds = new Set(onlineUsers.map((u) => u.userId));

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          People
        </span>
        <span className="ml-auto text-[10px] text-emerald-400">
          {onlineUsers.length} online
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {onlineUsers.map((u) => (
          <div key={u.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <Avatar name={u.name} avatar={u.avatar} color={u.color} />
            <span className="flex-1 truncate text-sm">
              {u.name}
              {u.userId === currentUser.userId && (
                <span className="text-muted-foreground"> (you)</span>
              )}
            </span>
            <span className={cn("text-[10px] uppercase", ROLE_STYLE[u.role])}>{u.role}</span>
            <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
          </div>
        ))}

        {collaborators.filter((c) => !onlineIds.has(c.userId)).length > 0 && (
          <div className="pt-2 mt-1 border-t border-border/60">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Offline
            </div>
            {collaborators
              .filter((c) => !onlineIds.has(c.userId))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg opacity-60">
                  <Avatar name={c.user.name} avatar={c.user.avatar} color="#555" />
                  <span className="flex-1 truncate text-sm">{c.user.name}</span>
                  <span className={cn("text-[10px] uppercase", ROLE_STYLE[c.role])}>{c.role}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({
  name,
  avatar,
  color,
}: {
  name: string;
  avatar: string | null;
  color: string;
}) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt={name} className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <span
      className="w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
