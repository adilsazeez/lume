"use client";

import * as React from "react";

import { THREAD_DRAG_MIME } from "@/lib/thread-placement";

type ThreadDragState = {
  draggingThreadId: string | null;
  isOverCanvas: boolean;
  setDraggingThreadId: (id: string | null) => void;
  setIsOverCanvas: (over: boolean) => void;
  beginDrag: (threadId: string, event: React.DragEvent) => void;
  endDrag: () => void;
};

const ThreadDragContext = React.createContext<ThreadDragState | null>(null);

export function ThreadDragProvider({ children }: { children: React.ReactNode }) {
  const [draggingThreadId, setDraggingThreadId] = React.useState<string | null>(null);
  const [isOverCanvas, setIsOverCanvas] = React.useState(false);

  const beginDrag = React.useCallback((threadId: string, event: React.DragEvent) => {
    event.dataTransfer.setData(THREAD_DRAG_MIME, threadId);
    event.dataTransfer.setData("text/plain", threadId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingThreadId(threadId);
  }, []);

  const endDrag = React.useCallback(() => {
    setDraggingThreadId(null);
    setIsOverCanvas(false);
  }, []);

  const value = React.useMemo(
    () => ({
      draggingThreadId,
      isOverCanvas,
      setDraggingThreadId,
      setIsOverCanvas,
      beginDrag,
      endDrag,
    }),
    [draggingThreadId, isOverCanvas, beginDrag, endDrag],
  );

  return <ThreadDragContext.Provider value={value}>{children}</ThreadDragContext.Provider>;
}

export function useThreadDragState() {
  const ctx = React.useContext(ThreadDragContext);
  if (!ctx) {
    throw new Error("useThreadDragState must be used within ThreadDragProvider");
  }
  return ctx;
}
