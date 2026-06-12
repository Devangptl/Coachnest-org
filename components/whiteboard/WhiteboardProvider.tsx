"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ExcalidrawAPI,
  WhiteboardCollaboratorDTO,
  WhiteboardDTO,
  WhiteboardPageDTO,
  WhiteboardRole,
} from "@/types/whiteboard";

export interface OnlineUser {
  userId: string;
  name: string;
  avatar: string | null;
  color: string;
  role: WhiteboardRole;
}

interface WhiteboardContextValue {
  boardId: string;
  title: string;
  setTitle: (title: string) => void;
  role: WhiteboardRole;
  canEdit: boolean;
  canManage: boolean;
  currentUser: { userId: string; name: string; avatar: string | null };

  pages: WhiteboardPageDTO[];
  setPages: React.Dispatch<React.SetStateAction<WhiteboardPageDTO[]>>;
  activePageId: string;
  setActivePageId: (id: string) => void;

  collaborators: WhiteboardCollaboratorDTO[];
  setCollaborators: React.Dispatch<React.SetStateAction<WhiteboardCollaboratorDTO[]>>;
  onlineUsers: OnlineUser[];
  setOnlineUsers: (users: OnlineUser[]) => void;

  apiRef: React.MutableRefObject<ExcalidrawAPI | null>;
  setApi: (api: ExcalidrawAPI) => void;
}

const Ctx = createContext<WhiteboardContextValue | null>(null);

export function WhiteboardProvider({
  board,
  role,
  currentUser,
  children,
}: {
  board: WhiteboardDTO;
  role: WhiteboardRole;
  currentUser: { userId: string; name: string; avatar: string | null };
  children: React.ReactNode;
}) {
  const [title, setTitle] = useState(board.title);
  const [pages, setPages] = useState<WhiteboardPageDTO[]>(board.pages);
  const [activePageId, setActivePageId] = useState<string>(
    board.pages[0]?.id ?? "",
  );
  const [collaborators, setCollaborators] = useState<WhiteboardCollaboratorDTO[]>(
    board.collaborators,
  );
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const apiRef = useRef<ExcalidrawAPI | null>(null);

  const setApi = useCallback((api: ExcalidrawAPI) => {
    apiRef.current = api;
  }, []);

  const value = useMemo<WhiteboardContextValue>(
    () => ({
      boardId: board.id,
      title,
      setTitle,
      role,
      canEdit: role === "EDITOR" || role === "OWNER",
      canManage: role === "OWNER",
      currentUser,
      pages,
      setPages,
      activePageId,
      setActivePageId,
      collaborators,
      setCollaborators,
      onlineUsers,
      setOnlineUsers,
      apiRef,
      setApi,
    }),
    [board.id, title, role, currentUser, pages, activePageId, collaborators, onlineUsers, setApi],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWhiteboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWhiteboard must be used within WhiteboardProvider");
  return ctx;
}
