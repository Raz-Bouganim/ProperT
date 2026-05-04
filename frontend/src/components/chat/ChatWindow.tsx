'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronLeft, Loader2, User, CornerUpLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Socket } from 'socket.io-client';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { createChatSocket } from '@/lib/chatSocket';
import { MessageAttachment, MEDIA_TYPES } from '@/components/chat/MessageAttachment';

type ReplyRef = {
    id: string;
    content: string | null;
    senderId: string;
    createdAt: string;
    sender: { firstName: string; lastName: string };
};

interface Message {
    id: string;
    senderId: string;
    content: string | null;
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

const PAGE_SIZE = 50;

export function ChatWindow({ chatId }: { chatId: string }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [olderCursor, setOlderCursor] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [partner, setPartner] = useState<{
        firstName: string;
        lastName: string;
        avatar?: string;
    } | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<(typeof MEDIA_TYPES)[number] | ''>(
        '',
    );
    const [showMediaFields, setShowMediaFields] = useState(false);

    const loadInitial = useCallback(async () => {
        if (!chatId || !user) return;
        setLoading(true);
        try {
            const [msgRes, convRes] = await Promise.all([
                api.get<{ items: Message[]; nextCursor: string | null }>(
                    `/chat/messages/${chatId}`,
                    { params: { limit: PAGE_SIZE } },
                ),
                api.get(`/chat/conversations/${chatId}`),
            ]);
            setMessages(msgRes.data.items);
            setOlderCursor(msgRes.data.nextCursor);
            const currentConv = convRes.data;
            if (currentConv) {
                const other = currentConv.participants.find(
                    (p: { user: { id: string } }) => p.user.id !== user.id,
                )?.user;
                if (other) {
                    setPartner(other);
                }
            }
        } catch (error) {
            console.error('Failed to load chat:', error);
        } finally {
            setLoading(false);
        }
    }, [chatId, user]);

    useEffect(() => {
        void loadInitial();
    }, [loadInitial]);

    const loadOlder = useCallback(async () => {
        if (!olderCursor || loadingOlder || !chatId) return;
        const el = scrollRef.current;
        const prevHeight = el?.scrollHeight ?? 0;
        setLoadingOlder(true);
        try {
            const res = await api.get<{ items: Message[]; nextCursor: string | null }>(
                `/chat/messages/${chatId}`,
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
            console.error('Failed to load older messages', e);
        } finally {
            setLoadingOlder(false);
        }
    }, [olderCursor, loadingOlder, chatId]);

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
        if (!chatId || !user) return;
        const newSocket = createChatSocket();
        setSocket(newSocket);
        return () => {
            newSocket.close();
        };
    }, [chatId, user]);

    useEffect(() => {
        if (!socket || !chatId) return;
        socket.emit('joinRoom', chatId);
        const onNew = (message: Message) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
        };
        socket.on('newMessage', onNew);
        return () => {
            socket.off('newMessage', onNew);
        };
    }, [socket, chatId]);

    const lastMessageId = messages[messages.length - 1]?.id;
    useEffect(() => {
        if (loading || loadingOlder || !lastMessageId) return;
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lastMessageId, loading, loadingOlder]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !user) return;

        if (editingId) {
            if (!input.trim()) return;
            try {
                const { data } = await api.patch<Message>(`/chat/messages/${editingId}`, {
                    content: input.trim(),
                });
                setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)));
                setInput('');
                setEditingId(null);
            } catch (err) {
                console.error('Edit failed', err);
            }
            return;
        }

        const text = input.trim();
        const mUrl = mediaUrl.trim();
        if (mUrl && !mediaType) return;
        if (!text && !mUrl) return;

        const payload: {
            conversationId: string;
            content?: string;
            mediaUrl?: string;
            mediaType?: string;
            replyToMessageId?: string;
        } = { conversationId: chatId };
        if (text) payload.content = text;
        if (mUrl && mediaType) {
            payload.mediaUrl = mUrl;
            payload.mediaType = mediaType;
        }
        if (replyingTo?.id) payload.replyToMessageId = replyingTo.id;

        socket.emit('sendMessage', payload);
        setInput('');
        setMediaUrl('');
        setMediaType('');
        setShowMediaFields(false);
        setReplyingTo(null);
    };

    const textOrMediaReady =
        Boolean(input.trim()) ||
        (Boolean(mediaUrl.trim()) && Boolean(mediaType));
    const canSubmit = editingId ? Boolean(input.trim()) : textOrMediaReady;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <div className="flex h-screen max-h-screen flex-col bg-background">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background p-4">
                <Link href="/chat">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ChevronLeft />
                    </Button>
                </Link>
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                    {partner?.avatar ? (
                        <Image
                            src={partner.avatar}
                            alt="Partner"
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <div>
                    <div className="font-bold leading-tight">
                        {partner
                            ? `${partner.firstName} ${partner.lastName}`
                            : 'Chat'}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">
                        Online
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex-grow space-y-4 overflow-y-auto bg-slate-50/30 p-4"
            >
                {loadingOlder && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            'flex flex-col',
                            msg.senderId === user?.id ? 'items-end' : 'items-start',
                        )}
                    >
                        <div
                            className={cn(
                                'max-w-[80%] space-y-1 rounded-2xl px-4 py-2 text-sm shadow-sm',
                                msg.senderId === user?.id
                                    ? 'rounded-tr-none bg-primary text-primary-foreground'
                                    : 'rounded-tl-none border bg-white text-foreground',
                            )}
                        >
                            {msg.replyToMessage && (
                                <div
                                    className={cn(
                                        'mb-1 border-l-2 pl-2 text-xs opacity-90',
                                        msg.senderId === user?.id
                                            ? 'border-primary-foreground/50'
                                            : 'border-primary/40',
                                    )}
                                >
                                    <div className="font-medium">
                                        {msg.replyToMessage.sender.firstName}{' '}
                                        {msg.replyToMessage.sender.lastName}
                                    </div>
                                    <div className="truncate opacity-80">
                                        {msg.replyToMessage.content ||
                                            '[attachment]'}
                                    </div>
                                </div>
                            )}
                            {msg.content ? <div>{msg.content}</div> : null}
                            {msg.mediaUrl && msg.mediaType ? (
                                <MessageAttachment
                                    mediaUrl={msg.mediaUrl}
                                    mediaType={msg.mediaType}
                                    variant={
                                        msg.senderId === user?.id ? 'self' : 'other'
                                    }
                                />
                            ) : null}
                            {msg.editedAt && (
                                <div
                                    className={cn(
                                        'text-[10px] opacity-70',
                                        msg.senderId === user?.id
                                            ? 'text-primary-foreground/80'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    edited
                                </div>
                            )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 px-1">
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
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
                                            setInput(msg.content || '');
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
                <div ref={endRef} />
            </div>

            <div className="sticky bottom-0 border-t bg-background p-4">
                {replyingTo && !editingId && (
                    <div className="mb-2 flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-xs">
                        <span className="truncate text-muted-foreground">
                            Replying to {replyingTo.sender.firstName}:{' '}
                            {(replyingTo.content || '').slice(0, 80)}
                        </span>
                        <button
                            type="button"
                            className="shrink-0 text-primary"
                            onClick={() => setReplyingTo(null)}
                        >
                            Cancel
                        </button>
                    </div>
                )}
                {editingId && (
                    <div className="mb-2 text-xs text-muted-foreground">
                        Editing message — submit to save, clear and send to cancel edit
                        mode
                    </div>
                )}
                {!editingId && (
                    <div className="mb-2 flex flex-col gap-2">
                        <button
                            type="button"
                            className="w-fit text-left text-xs text-primary hover:underline"
                            onClick={() => setShowMediaFields((v) => !v)}
                        >
                            {showMediaFields ? 'Hide media attachment' : 'Attach media (URL)'}
                        </button>
                        {showMediaFields && (
                            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2 sm:flex-row sm:items-center">
                                <input
                                    value={mediaUrl}
                                    onChange={(e) => setMediaUrl(e.target.value)}
                                    className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs"
                                    placeholder="https://… (after upload or CDN)"
                                />
                                <select
                                    value={mediaType}
                                    onChange={(e) =>
                                        setMediaType(
                                            e.target.value as (typeof MEDIA_TYPES)[number] | '',
                                        )
                                    }
                                    className="rounded-lg border bg-background px-2 py-1.5 text-xs"
                                >
                                    <option value="">Media type</option>
                                    {MEDIA_TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-grow rounded-2xl border bg-muted p-3 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={
                            editingId ? 'Edit message…' : 'Type a message…'
                        }
                        autoFocus
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!canSubmit}
                        className="h-12 w-12 shrink-0 rounded-2xl shadow-lg"
                    >
                        <Send size={20} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
