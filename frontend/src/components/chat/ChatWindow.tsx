'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronLeft, Loader2, User, CornerUpLeft, Pencil, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Socket } from 'socket.io-client';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { createChatSocket } from '@/lib/chatSocket';
import { MessageAttachment } from '@/components/chat/MessageAttachment';

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

export function ChatWindow({
    chatId,
    embedded,
    onNewMessage,
    onRead,
}: {
    chatId: string;
    embedded?: boolean;
    onNewMessage?: (preview: string, timestamp: string) => void;
    onRead?: () => void;
}) {
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
    const [property, setProperty] = useState<{ id: string; title: string } | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [firstUnreadIdx, setFirstUnreadIdx] = useState(-1);

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
            const items = msgRes.data.items;
            setMessages(items);
            setOlderCursor(msgRes.data.nextCursor);
            const currentConv = convRes.data;
            if (currentConv) {
                const other = currentConv.participants.find(
                    (p: { user: { id: string } }) => p.user.id !== user.id,
                )?.user;
                if (other) setPartner(other);
                if (currentConv.property) setProperty(currentConv.property);

                const myParticipant = currentConv.participants.find(
                    (p: { user: { id: string }; lastReadAt?: string | null }) =>
                        p.user.id === user.id,
                );
                const lastReadAt = myParticipant?.lastReadAt
                    ? new Date(myParticipant.lastReadAt)
                    : null;

                const idx = lastReadAt
                    ? items.findIndex(
                          (m) =>
                              m.senderId !== user.id &&
                              new Date(m.createdAt) > lastReadAt,
                      )
                    : -1;
                setFirstUnreadIdx(idx);

                void api.patch(`/chat/conversations/${chatId}/read`);
                onRead?.();
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
            const preview = message.content?.trim() || (message.mediaUrl ? '[attachment]' : '');
            if (preview) onNewMessage?.(preview, message.createdAt);
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

    const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
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
        if (!text && !pendingFile) return;

        let uploadedUrl: string | undefined;
        let uploadedType: string | undefined;

        if (pendingFile) {
            setUploading(true);
            try {
                const { data: presigned } = await api.post<{ url: string; publicUrl: string }>(
                    '/media/presigned-url',
                    { fileName: pendingFile.name, contentType: pendingFile.type, fileSize: pendingFile.size },
                );
                await fetch(presigned.url, {
                    method: 'PUT',
                    body: pendingFile,
                    headers: { 'Content-Type': pendingFile.type },
                });
                uploadedUrl = presigned.publicUrl;
                uploadedType = pendingFile.type.startsWith('image/')
                    ? 'IMAGE'
                    : pendingFile.type.startsWith('video/')
                    ? 'VIDEO'
                    : 'FILE';
            } catch (err) {
                console.error('Upload failed', err);
                setPendingFile(null);
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        const payload: {
            conversationId: string;
            content?: string;
            mediaUrl?: string;
            mediaType?: string;
            replyToMessageId?: string;
        } = { conversationId: chatId };
        if (text) payload.content = text;
        if (uploadedUrl && uploadedType) {
            payload.mediaUrl = uploadedUrl;
            payload.mediaType = uploadedType;
        }
        if (replyingTo?.id) payload.replyToMessageId = replyingTo.id;

        socket.emit('sendMessage', payload);
        setInput('');
        setPendingFile(null);
        setReplyingTo(null);
    };

    const canSubmit = editingId
        ? Boolean(input.trim())
        : Boolean(input.trim()) || Boolean(pendingFile);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <div className={embedded ? 'flex h-full flex-col bg-background' : 'flex h-screen max-h-screen flex-col bg-background'}>
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background p-4">
                {!embedded && (
                    <Link href="/chat">
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <ChevronLeft />
                        </Button>
                    </Link>
                )}
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
                    {property && (
                        <Link
                            href={`/properties/${property.id}`}
                            className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 hover:underline"
                        >
                            {property.title}
                        </Link>
                    )}
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
                {messages.map((msg, i) => (
                    <div key={msg.id}>
                        {i === firstUnreadIdx && firstUnreadIdx !== -1 && (
                            <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex-1 border-t border-dashed" />
                                <span className="shrink-0 font-medium">Unread messages</span>
                                <div className="flex-1 border-t border-dashed" />
                            </div>
                        )}
                        <div
                            className={cn(
                                'flex flex-col',
                                msg.senderId === user?.id ? 'items-end' : 'items-start',
                            )}
                        >
                            <div
                                className={cn(
                                    'max-w-[80%]',
                                    !(msg.mediaUrl && !msg.content && !msg.replyToMessage) && [
                                        'space-y-1 rounded-2xl px-4 py-2 text-sm shadow-sm',
                                        msg.senderId === user?.id
                                            ? 'rounded-tr-none bg-primary text-primary-foreground'
                                            : 'rounded-tl-none border bg-white text-foreground',
                                    ],
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
                                            {msg.replyToMessage.content || '[attachment]'}
                                        </div>
                                    </div>
                                )}
                                {msg.content ? <div>{msg.content}</div> : null}
                                {msg.mediaUrl && msg.mediaType ? (
                                    <MessageAttachment
                                        mediaUrl={msg.mediaUrl}
                                        mediaType={msg.mediaType}
                                        variant={msg.senderId === user?.id ? 'self' : 'other'}
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
                {pendingFile && !editingId && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs">
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {pendingFile.name}
                        </span>
                        <button
                            type="button"
                            className="shrink-0 cursor-pointer text-primary"
                            onClick={() => setPendingFile(null)}
                        >
                            Remove
                        </button>
                    </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                    {!editingId && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setPendingFile(file);
                                    e.target.value = '';
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 shrink-0 cursor-pointer rounded-2xl"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip size={20} />
                            </Button>
                        </>
                    )}
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-grow rounded-2xl border bg-muted p-3 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={editingId ? 'Edit message…' : 'Type a message…'}
                        autoFocus
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!canSubmit || uploading}
                        className="h-12 w-12 shrink-0 cursor-pointer rounded-2xl shadow-lg"
                    >
                        {uploading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Send size={20} />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
