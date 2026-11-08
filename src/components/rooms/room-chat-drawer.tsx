"use client";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  RiMessage3Line,
  RiCloseLine,
  RiSendPlane2Line,
  RiCheckDoubleLine,
} from "@remixicon/react";
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
}

function formatChatTime(dateString: string): string {
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
}: RoomChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<RoomChatMessage[]>(
    externalMessages || []
  );
  const [prevExternal, setPrevExternal] = useState(externalMessages);
  if (externalMessages !== prevExternal) {
    setPrevExternal(externalMessages);
    if (externalMessages) {
      setMessages(externalMessages);
    }
  }

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch latest messages from API
  const fetchMessages = useCallback(async () => {
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

      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.messages)) {
        setMessages((prev) => {
          if (data.messages.length > prev.length) {
            const added = data.messages.length - prev.length;
            if (!isOpenRef.current) {
              setUnreadCount((c) => c + added);
            }
          }
          return data.messages;
        });
        onMessagesChange?.(data.messages);
      }
    } catch {
      // Quiet poll failure handling
    }
  }, [roomCode, hostToken, playerToken, senderId, onMessagesChange]);

  // Polling when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    fetchMessages();
    const timer = setInterval(fetchMessages, 2500);
    return () => clearInterval(timer);
  }, [isOpen, fetchMessages]);

  // Scroll to bottom when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => scrollToBottom("auto"), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToBottom]);

  // Scroll to bottom when messages update and open
  useEffect(() => {
    if (isOpen) {
      scrollToBottom("smooth");
    }
  }, [messages, isOpen, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");

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

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.message) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === data.message.id);
            const next = exists ? prev : [...prev, data.message];
            onMessagesChange?.(next);
            return next;
          });
        }
      }
    } catch {
      // Restore input on failure
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-5 end-3 sm:end-5 z-40">
        <button
          type="button"
          onClick={() =>
            setIsOpen((prev) => {
              const next = !prev;
              if (next) setUnreadCount(0);
              return next;
            })
          }
          aria-label={isEn ? "Open chat" : "Buka percakapan"}
          className={cx(
            "relative flex size-12 md:size-14 items-center justify-center rounded-full bg-background-secondary-default hover:bg-background-secondary-hover text-text-primary border border-border-button-default shadow-dropdown transition active:scale-95 cursor-pointer outline-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          )}
        >
          <RiMessage3Line className="size-6 text-text-primary" aria-hidden="true" />
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-background-tertiary-default border border-border-button-default px-1 text-[11px] font-bold text-text-primary tabular-nums shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating chat panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={isEn ? "Room messages" : "Percakapan ruangan"}
          className="fixed bottom-20 end-3 sm:end-5 z-50 flex h-[520px] max-h-[75dvh] w-[calc(100vw-1.5rem)] sm:w-[380px] flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-dropdown border border-border-button-default"
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

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background-full">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4">
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
                        "max-w-[82%] px-3.5 py-2.5 shadow-2xs border border-border-button-default",
                        isOutgoing
                          ? "bg-background-tertiary-default text-text-primary rounded-2xl rounded-tr-sm"
                          : "bg-background-secondary-default text-text-primary rounded-2xl rounded-tl-sm"
                      )}
                    >
                      <p className="text-body-2-regular whitespace-pre-wrap break-words leading-relaxed">
                        {msg.text}
                      </p>
                      <div
                        className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-text-secondary"
                      >
                        <span>{formatChatTime(msg.createdAt)}</span>
                        {isOutgoing && (
                          <RiCheckDoubleLine
                            className="size-3.5 inline text-text-secondary"
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

          {/* Chat input */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 p-3 border-t border-separator-border bg-background-primary-default shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isEn ? "Type a message…" : "Ketik pesan…"}
              maxLength={500}
              className="flex-1 rounded-2xl bg-background-secondary-default px-4 py-2.5 text-body-2-regular text-text-primary placeholder:text-text-placeholder outline-none border border-border-button-default focus:outline-none focus:ring-1 focus:ring-border-focus-ring"
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
      )}
    </>,
    document.body
  );
}
