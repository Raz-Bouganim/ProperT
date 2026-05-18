"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { X, Send, Loader2, User, CornerUpLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { clsx } from "clsx";
import { createChatSocket } from "@/lib/chatSocket";
import { MessageAttachment } from "@/components/chat/MessageAttachment";

type ReplyRef = {
    id: string;
    content: string | null;
    senderId: string;
    createdAt: string;
    sender: { firstName: string; lastName: string };
};

interface Message {
    id: string;
    content: string | null;
    senderId: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    createdAt: string;
    editedAt?: string | null;
    replyToMessage?: ReplyRef | null;
    sender: {
        firstName: string;
        lastName: string;
        avatar?: string;
    };
}

interface ChatWindowProps {
    propertyId: string;
    ownerId: string;
    isOpen: boolean;
    onClose: () => void;
    propertyTitle: string;
}

const PAGE_SIZE = 50;

export function ChatWindow({
    propertyId,
    ownerId,
    isOpen,
    onClose,
    propertyTitle,
}: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [olderCursor, setOlderCursor] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const initChat = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await api.post("/chat/conversations", { propertyId, ownerId });
            setConversationId(res.data.id);
            const msgRes = await api.get<{ items: Message[]; nextCursor: string | null }>(
                `/chat/messages/${res.data.id}`,
                { params: { limit: PAGE_SIZE } },
            );
            setMessages(msgRes.data.items);
            setOlderCursor(msgRes.data.nextCursor);
        } catch (error) {
            console.error("Failed to init chat:", error);
        } finally {
            setLoading(false);
        }
    }, [propertyId, ownerId, user]);

    useEffect(() => {
        if (!isOpen || !user) return;
        void initChat();
        const newSocket = createChatSocket();
        setSocket(newSocket);
        return () => {
            newSocket.close();
        };
    }, [isOpen, propertyId, ownerId, user, initChat]);

    const loadOlder = useCallback(async () => {
        if (!conversationId || !olderCursor || loadingOlder) return;
        const el = scrollRef.current;
        const prevHeight = el?.scrollHeight ?? 0;
        setLoadingOlder(true);
        try {
            const res = await api.get<{ items: Message[]; nextCursor: string | null }>(
                `/chat/messages/${conversationId}`,
                { params: { cursor: olderCursor, limit: PAGE_SIZE } },
            );
            setMessages((prev) => [...res.data.items, ...prev]);
            setOlderCursor(res.data.nextCursor);
            requestAnimationFrame(() => {
                if (el) {
                    el.scrollTop = el.scrollHeight - prevHeight;
                }
            });
        } catch (e) {
            console.error("Failed to load older messages", e);
        } finally {
            setLoadingOlder(false);
        }
    }, [conversationId, olderCursor, loadingOlder]);

    const loadOlderRef = useRef(false);
    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || !olderCursor || loadingOlder || loadOlderRef.current) return;
        if (el.scrollTop < 72) {
            loadOlderRef.current = true;
            void loadOlder().finally(() => {
                loadOlderRef.current = false;
            });
        }
    }, [olderCursor, loadingOlder, loadOlder]);

    useEffect(() => {
        if (!socket || !conversationId) return;
        socket.emit("joinRoom", conversationId);
        const onNew = (message: Message) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
        };
        socket.on("newMessage", onNew);
        return () => {
            socket.off("newMessage", onNew);
        };
    }, [socket, conversationId]);

    const lastMessageId = messages[messages.length - 1]?.id;
    useEffect(() => {
        if (loading || loadingOlder || !lastMessageId || !scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [lastMessageId, loading, loadingOlder]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !conversationId || !user) return;

        if (editingId) {
            if (!newMessage.trim()) return;
            try {
                const { data } = await api.patch<Message>(`/chat/messages/${editingId}`, {
                    content: newMessage.trim(),
                });
                setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)));
                setNewMessage("");
                setEditingId(null);
            } catch (err) {
                console.error("Edit failed", err);
            }
            return;
        }

        const text = newMessage.trim();
        if (!text) return;

        const payload: {
            conversationId: string;
            content?: string;
            replyToMessageId?: string;
        } = { conversationId, content: text };
        if (replyingTo?.id) payload.replyToMessageId = replyingTo.id;

        socket.emit("sendMessage", payload);
        setNewMessage("");
        setReplyingTo(null);
    };

    const canSubmit = Boolean(newMessage.trim());

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] animate-in flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl duration-300 slide-in-from-bottom-10">
            <div className="flex items-center justify-between border-b bg-primary p-4 text-primary-foreground">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="line-clamp-1 font-bold leading-tight">{propertyTitle}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                            Real-time Chat
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="rounded-full p-1 transition-colors hover:bg-black/10">
                    <X className="h-6 w-6" />
                </button>
            </div>

            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex-grow space-y-4 overflow-y-auto bg-slate-50/50 p-4"
            >
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Send className="h-8 w-8 text-muted-foreground opacity-20" />
                        </div>
                        <p className="font-medium text-muted-foreground">Say hello to start the conversation!</p>
                    </div>
                ) : (
                    <>
                        {loadingOlder && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={clsx(
                                    "flex max-w-[85%] flex-col",
                                    msg.senderId === user?.id ? "ml-auto items-end" : "mr-auto items-start",
                                )}
                            >
                                <div
                                    className={clsx(
                                        "space-y-1 rounded-2xl px-4 py-2 text-sm shadow-sm",
                                        msg.senderId === user?.id
                                            ? "rounded-tr-none bg-primary text-primary-foreground"
                                            : "rounded-tl-none border bg-white",
                                    )}
                                >
                                    {msg.replyToMessage && (
                                        <div
                                            className={clsx(
                                                "mb-1 border-l-2 pl-2 text-xs opacity-90",
                                                msg.senderId === user?.id
                                                    ? "border-primary-foreground/50"
                                                    : "border-primary/40",
                                            )}
                                        >
                                            <div className="font-medium">
                                                {msg.replyToMessage.sender.firstName}{" "}
                                                {msg.replyToMessage.sender.lastName}
                                            </div>
                                            <div className="truncate opacity-80">
                                                {msg.replyToMessage.content || "[attachment]"}
                                            </div>
                                        </div>
                                    )}
                                    {msg.content ? <div>{msg.content}</div> : null}
                                    {msg.mediaUrl && msg.mediaType ? (
                                        <MessageAttachment
                                            mediaUrl={msg.mediaUrl}
                                            mediaType={msg.mediaType}
                                            variant={msg.senderId === user?.id ? "self" : "other"}
                                        />
                                    ) : null}
                                    {msg.editedAt && (
                                        <div
                                            className={clsx(
                                                "text-[10px] opacity-70",
                                                msg.senderId === user?.id
                                                    ? "text-primary-foreground/80"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            edited
                                        </div>
                                    )}
                                </div>
                                <div className="mt-1 flex items-center gap-2 px-1">
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                    <button
                                        type="button"
                                        className="text-[10px] font-medium text-primary hover:underline"
                                        onClick={() => setReplyingTo(msg)}
                                    >
                                        <CornerUpLeft className="mr-0.5 inline h-3 w-3" />
                                        Reply
                                    </button>
                                    {msg.senderId === user?.id &&
                                        msg.content &&
                                        msg.content.trim().length > 0 && (
                                            <button
                                                type="button"
                                                className="text-[10px] font-medium text-primary hover:underline"
                                                onClick={() => {
                                                    setEditingId(msg.id);
                                                    setNewMessage(msg.content || "");
                                                    setReplyingTo(null);
                                                }}
                                            >
                                                <Pencil className="mr-0.5 inline h-3 w-3" />
                                                Edit
                                            </button>
                                        )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            <form onSubmit={handleSendMessage} className="flex flex-col gap-2 border-t bg-white p-4">
                {replyingTo && !editingId && (
                    <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-xs">
                        <span className="truncate text-muted-foreground">
                            Replying to {replyingTo.sender.firstName}: {(replyingTo.content || "").slice(0, 80)}
                        </span>
                        <button type="button" className="shrink-0 text-primary" onClick={() => setReplyingTo(null)}>
                            Cancel
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={editingId ? "Edit message…" : "Type a message…"}
                        className="flex-grow rounded-2xl border-none bg-slate-100 px-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-primary"
                    />
                    <Button type="submit" disabled={!canSubmit} size="icon" className="shrink-0 rounded-2xl">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    );
}
