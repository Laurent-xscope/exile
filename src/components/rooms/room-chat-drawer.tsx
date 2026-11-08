"use client";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  RiMessage3Line,
  RiCloseLine,
  RiSendPlane2Line,
  RiCheckDoubleLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { soundEffects } from "@/lib/audio/sounds";
import { useScrollFade, ScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { cx } from "@/utils/cx";

export interface RoomChatMessage {
  id: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  senderRole: "teacher" | "student";
  avatar?: string;
  text: string;
  createdAt: string;
}

export interface RoomChatWidgetProps {
  roomCode: string;
  role: "teacher" | "student";
  senderId: string;
  senderName: string;
  hostToken?: string | null;
  playerToken?: string | null;
  messages?: RoomChatMessage[];
  isEn?: boolean;
  onMessagesChange?: (messages: RoomChatMessage[]) => void;
  className?: string;
}

export function formatChatTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

/**
 * Merges existing and incoming messages safely:
 * - Deduplicates by unique message id
 * - Preserves optimistic messages (id starting with "temp-")
 * - Sorts by createdAt ascending
 * - Returns the existing array reference if no changes occurred to prevent unnecessary re-renders
 */
export function mergeChatMessages(
  existing: RoomChatMessage[],
  incoming: RoomChatMessage[]
): RoomChatMessage[] {
  if (!incoming || incoming.length === 0) return existing;
  if (!existing || existing.length === 0) {
    return [...incoming].sort((a, b) => {
      const tA = new Date(a.createdAt).getTime() || 0;
      const tB = new Date(b.createdAt).getTime() || 0;
      if (tA !== tB) return tA - tB;
      return a.id.localeCompare(b.id);
    });
  }

  const map = new Map<string, RoomChatMessage>();
  for (const msg of existing) {
    map.set(msg.id, msg);
  }
  for (const msg of incoming) {
    map.set(msg.id, msg);
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.createdAt).getTime() || 0;
    const tB = new Date(b.createdAt).getTime() || 0;
    if (tA !== tB) return tA - tB;
    return a.id.localeCompare(b.id);
  });

  if (
    merged.length === existing.length &&
    merged.every((m, idx) => m.id === existing[idx].id && m.text === existing[idx].text)
  ) {
    return existing;
  }

  return merged;
}

export function RoomChatWidget({
  roomCode,
  role,
  senderId,
  senderName,
  hostToken,
  playerToken,
  messages: externalMessages,
  isEn = false,
  onMessagesChange,
  className,
}: RoomChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<RoomChatMessage[]>(() =>
    mergeChatMessages([], externalMessages || [])
  );
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => Date.now());

  // Synchronize externalMessages into local messages during render to prevent cascading renders
  const [prevExternal, setPrevExternal] = useState(externalMessages);
  if (externalMessages !== prevExternal) {
    setPrevExternal(externalMessages);
    if (externalMessages && externalMessages.length > 0) {
      setMessages((prev) => mergeChatMessages(prev, externalMessages));
    }
  }

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAtBottomRef = useRef(true);
  const prevUnreadCountRef = useRef(0);

  const fade = useScrollFade();

  // Calculate unread count strictly for messages from others received after lastReadTimestamp
  const unreadCount = isOpen
    ? 0
    : messages.filter((m) => {
        const isFromOther =
          m.senderId !== senderId && !(role === "teacher" && m.senderRole === "teacher");
        const msgTime = new Date(m.createdAt).getTime();
        return isFromOther && !m.id.startsWith("temp-") && msgTime > lastReadTimestamp;
      }).length;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  // Play audio chime when unread messages arrive while drawer is closed
  useEffect(() => {
    if (!isOpen && unreadCount > prevUnreadCountRef.current) {
      soundEffects.playClick();
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, isOpen]);

  // Auto-scroll logic when messages change
  useEffect(() => {
    if (!isOpen) return;

    const lastMsg = messages[messages.length - 1];
    const isMyMessage =
      lastMsg &&
      (lastMsg.senderId === senderId ||
        (role === "teacher" && lastMsg.senderRole === "teacher"));

    if (isAtBottomRef.current || isMyMessage) {
      scrollToBottom("smooth");
      setShowJumpToBottom(false);
      isAtBottomRef.current = true;
    } else {
      setShowJumpToBottom(true);
    }
  }, [messages, isOpen, scrollToBottom, senderId, role]);

  // When drawer opens: focus input, scroll to bottom
  useEffect(() => {
    if (isOpen) {
      isAtBottomRef.current = true;
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom("auto");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToBottom]);

  // Outside click and Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (dialogRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    if (role === "teacher" && !hostToken) return;
    if (role === "student" && (!senderId || !playerToken)) return;

    try {
      const headers: Record<string, string> = {};
      if (hostToken) headers["x-host-token"] = hostToken;
      if (playerToken && senderId) {
        headers["x-player-id"] = senderId;
        headers["x-player-token"] = playerToken;
      }

      const res = await fetch(`/api/rooms/${roomCode}/chat`, {
        method: "GET",
        headers,
      });

      if (res.status === 304) return;
      if (!res.ok) return;

      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.messages)) {
        setMessages((prev) => {
          const next = mergeChatMessages(prev, data.messages);
          if (next !== prev) {
            onMessagesChange?.(next);
          }
          return next;
        });
      }
    } catch {
      // Quiet poll failure handling
    }
  }, [roomCode, role, hostToken, playerToken, senderId, onMessagesChange]);

  // Background polling: 2500ms when open, 5000ms when closed
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial poll before interval starts
    fetchMessages();
    const intervalMs = isOpen ? 2500 : 5000;
    const timer = setInterval(fetchMessages, intervalMs);
    return () => clearInterval(timer);
  }, [isOpen, fetchMessages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    fade.onScroll(e);
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 60;
    isAtBottomRef.current = isAtBottom;
    if (isAtBottom && showJumpToBottom) {
      setShowJumpToBottom(false);
    }
  };

  const handleOpenToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setLastReadTimestamp(Date.now());
        setShowJumpToBottom(false);
      }
      return next;
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: RoomChatMessage = {
      id: tempId,
      roomCode,
      senderId,
      senderName,
      senderRole: role,
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, optimisticMessage];
      onMessagesChange?.(next);
      return next;
    });

    isAtBottomRef.current = true;
    scrollToBottom("smooth");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (hostToken) headers["x-host-token"] = hostToken;
      if (playerToken && senderId) {
        headers["x-player-id"] = senderId;
        headers["x-player-token"] = playerToken;
      }

      const bodyPayload = {
        text,
        senderId,
        senderName,
        senderRole: role,
        hostToken: hostToken || undefined,
        playerId: role === "student" ? senderId : undefined,
        playerToken: playerToken || undefined,
      };

      const res = await fetch(`/api/rooms/${roomCode}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || (isEn ? "Failed to send message." : "Gagal mengirim pesan.")
        );
      }

      const data = await res.json().catch(() => ({}));
      if (data.success && data.message) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          const exists = withoutTemp.some((m) => m.id === data.message.id);
          const next = exists ? withoutTemp : [...withoutTemp, data.message];
          next.sort((a, b) => {
            const tA = new Date(a.createdAt).getTime() || 0;
            const tB = new Date(b.createdAt).getTime() || 0;
            if (tA !== tB) return tA - tB;
            return a.id.localeCompare(b.id);
          });
          onMessagesChange?.(next);
          return next;
        });
        soundEffects.playClick();
      } else {
        throw new Error(
          data.error || (isEn ? "Failed to send message." : "Gagal mengirim pesan.")
        );
      }
    } catch {
      // Revert optimistic message and restore input text
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== tempId);
        onMessagesChange?.(next);
        return next;
      });
      setInputText(text);
      toast.error(isEn ? "Failed to send message." : "Gagal mengirim pesan.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Header trigger button rendered in-place */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpenToggle}
        aria-label={isEn ? "Room chat" : "Percakapan kelas"}
        className={cx(
          "relative inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-2.5 sm:px-3 py-1.5 rounded-xl text-caption-1-medium transition outline-none cursor-pointer touch-manipulation",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          "bg-background-secondary-default hover:bg-background-secondary-hover text-text-primary border border-border-button-default",
          isOpen && "bg-background-secondary-hover ring-1 ring-border-button-hover",
          className
        )}
      >
        <RiMessage3Line className="size-4 shrink-0 text-text-primary" aria-hidden="true" />
        <span className="hidden sm:inline font-medium">{isEn ? "Room chat" : "Obrolan"}</span>
        {unreadCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-text-white tabular-nums shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Portaled chat dialog and mobile backdrop */}
      {mounted &&
        isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Backdrop overlay on mobile */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 md:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Dialog container */}
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={isEn ? "Room messages" : "Percakapan ruangan"}
              className="fixed bottom-4 sm:bottom-6 end-3 sm:end-6 z-50 flex h-[520px] max-h-[80dvh] w-[calc(100vw-1.5rem)] sm:w-[390px] flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-dropdown border border-border-button-default"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-separator-border bg-background-primary-default shrink-0">
                <div className="flex flex-col text-start">
                  <span className="text-body-semibold text-text-primary">
                    {isEn ? "Room chat" : "Percakapan kelas"}
                  </span>
                  <span className="text-caption-2-regular text-text-secondary">
                    {isEn
                      ? `${messages.length} messages`
                      : `${messages.length} pesan terkirim`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={isEn ? "Close chat" : "Tutup percakapan"}
                  className="flex size-8 items-center justify-center rounded-full text-text-secondary hover:bg-background-secondary-default hover:text-text-primary transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  <RiCloseLine className="size-5" aria-hidden="true" />
                </button>
              </div>

              {/* Messages scroll region */}
              <div className="relative min-h-0 flex-1 flex flex-col">
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="h-full overflow-y-auto p-4 space-y-3 bg-background-full"
                >
                  {messages.length === 0 ? (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center px-4">
                      <div className="flex size-12 items-center justify-center rounded-full bg-background-secondary-default text-text-secondary mb-2 border border-border-button-default">
                        <RiMessage3Line className="size-6" aria-hidden="true" />
                      </div>
                      <p className="text-body-2-medium text-text-primary">
                        {isEn ? "No messages yet" : "Belum ada pesan"}
                      </p>
                      <p className="text-caption-1-regular text-text-secondary mt-1">
                        {isEn
                          ? "Say hello to your class!"
                          : "Sapa guru dan teman sekelasmu di sini."}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOutgoing =
                        msg.senderId === senderId ||
                        (role === "teacher" && msg.senderRole === "teacher");
                      const isOptimistic = msg.id.startsWith("temp-");

                      return (
                        <div
                          key={msg.id}
                          className={cx(
                            "flex flex-col",
                            isOutgoing ? "items-end" : "items-start"
                          )}
                        >
                          {!isOutgoing && (
                            <div className="flex items-center gap-1.5 mb-1 ps-1">
                              <span className="text-caption-2-medium text-text-secondary">
                                {msg.senderName}
                              </span>
                              {msg.senderRole === "teacher" && (
                                <span className="rounded-full bg-background-tertiary-default text-text-secondary px-1.5 py-0.5 text-[10px] font-medium border border-border-button-default">
                                  {isEn ? "Teacher" : "Guru"}
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            className={cx(
                              "max-w-[82%] px-3.5 py-2.5 shadow-2xs border border-border-button-default transition-opacity",
                              isOutgoing
                                ? "bg-background-tertiary-default text-text-primary rounded-2xl rounded-tr-sm"
                                : "bg-background-secondary-default text-text-primary rounded-2xl rounded-tl-sm",
                              isOptimistic && "opacity-70"
                            )}
                          >
                            <p className="text-body-2-regular whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-text-secondary">
                              <span>{formatChatTime(msg.createdAt)}</span>
                              {isOutgoing && (
                                <RiCheckDoubleLine
                                  className={cx(
                                    "size-3.5 inline",
                                    isOptimistic
                                      ? "text-text-placeholder"
                                      : "text-text-secondary"
                                  )}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <ScrollFade progress={fade.progress} surfaceClassName="from-background-primary-default" />

                {/* Floating jump to latest messages button */}
                {showJumpToBottom && (
                  <button
                    type="button"
                    onClick={() => {
                      isAtBottomRef.current = true;
                      scrollToBottom("smooth");
                      setShowJumpToBottom(false);
                    }}
                    aria-label={isEn ? "Jump to newest messages" : "Lompat ke pesan terbaru"}
                    className="absolute bottom-3 start-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption-1-medium bg-background-secondary-default hover:bg-background-secondary-hover text-text-primary border border-border-button-default shadow-md transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                  >
                    <span>{isEn ? "New messages ↓" : "Pesan baru ↓"}</span>
                  </button>
                )}
              </div>

              {/* Chat input form */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 p-3 border-t border-separator-border bg-background-primary-default shrink-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isEn ? "Type a message…" : "Ketik pesan…"}
                  maxLength={500}
                  disabled={isSending}
                  className="flex-1 rounded-2xl bg-background-secondary-default px-4 py-2.5 text-body-2-regular text-text-primary placeholder:text-text-placeholder outline-none border border-border-button-default focus:outline-none focus:ring-1 focus:ring-border-focus-ring disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  aria-label={isEn ? "Send message" : "Kirim pesan"}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background-secondary-default hover:bg-background-secondary-hover text-text-primary border border-border-button-default disabled:opacity-40 transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  <RiSendPlane2Line className="size-4 text-text-primary" aria-hidden="true" />
                </button>
              </form>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
