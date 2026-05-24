'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronLeft, Loader2, User, Paperclip, X } from 'lucide-react';
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
    const [property, setProperty] = useState<{ id: string; title: string; coverImageUrl?: string | null } | null>(null);
    const [isPartnerOnline, setIsPartnerOnline] = useState(false);
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
                if (currentConv.property) {
                    const { images, ...rest } = currentConv.property as { id: string; title: string; images?: { url: string }[] };
                    setProperty({ ...rest, coverImageUrl: images?.[0]?.url ?? null });
                }

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
                if (el) el.scrollTop = el.scrollHeight - prevHeight;
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
        return () => { newSocket.close(); };
    }, [chatId, user]);

    useEffect(() => {
        if (!socket || !chatId) return;
        socket.emit('joinRoom', chatId);
        const onNew = (message: Message) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === message.id)) return prev;
                return [...prev, message];
            });
            const preview = message.content?.trim() || (message.mediaUrl ? '[attachment]' : '');
            if (preview) onNewMessage?.(preview, message.createdAt);
        };
        const onPartnerOnline = () => setIsPartnerOnline(true);
        const onPartnerOffline = () => setIsPartnerOnline(false);
        socket.on('newMessage', onNew);
        socket.on('partnerOnline', onPartnerOnline);
        socket.on('partnerOffline', onPartnerOffline);
        return () => {
            socket.off('newMessage', onNew);
            socket.off('partnerOnline', onPartnerOnline);
            socket.off('partnerOffline', onPartnerOffline);
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
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <div className={cn(
            'relative flex flex-col bg-white',
            embedded ? 'h-full' : 'h-screen max-h-screen',
        )}>
            {/* Header */}
            <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    {!embedded && (
                        <Link href="/chat" className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <ChevronLeft size={20} />
                        </Link>
                    )}
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-200 shrink-0">
                        {partner?.avatar ? (
                            <Image src={partner.avatar} alt="Partner" fill className="object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <User className="h-4 w-4 text-slate-400" />
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-gray-900">
                            {partner ? `${partner.firstName} ${partner.lastName}` : 'Chat'}
                        </div>
                        {isPartnerOnline && (
                            <div className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                <span className="text-[10px] font-medium text-green-500">Online</span>
                            </div>
                        )}
                    </div>
                </div>

                {property && (
                    <Link
                        href={`/properties/${property.id}`}
                        className="flex items-center gap-3 p-2 pr-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow min-w-[240px]"
                    >
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {property.coverImageUrl ? (
                                <Image
                                    src={property.coverImageUrl}
                                    alt={property.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-400 uppercase tracking-wide leading-none mb-1">
                                Inquiring about:
                            </p>
                            <p className="text-sm font-bold text-gray-800 max-w-[220px] truncate">{property.title}</p>
                        </div>
                    </Link>
                )}
            </header>

            {/* Messages — pb-32 reserves space for floating input */}
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex-1 overflow-y-auto px-6 pt-6 pb-32 space-y-1 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}
            >
                {loadingOlder && (
                    <div className="flex justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                    </div>
                )}
                {messages.map((msg, i) => {
                    const isSelf = msg.senderId === user?.id;
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const isGrouped =
                        prevMsg?.senderId === msg.senderId &&
                        new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 60_000;

                    return (
                        <div key={msg.id}>
                            {i === firstUnreadIdx && firstUnreadIdx !== -1 && (
                                <div className="my-4 flex items-center gap-3 text-[10px] text-gray-400">
                                    <div className="flex-1 border-t border-dashed border-gray-200" />
                                    <span className="font-medium uppercase tracking-wide">New messages</span>
                                    <div className="flex-1 border-t border-dashed border-gray-200" />
                                </div>
                            )}

                            {isSelf ? (
                                /* Sent */
                                <div className={cn('group flex flex-col items-end', isGrouped ? 'mt-1' : 'mt-5')}>
                                    <div
                                        className="max-w-[70%] bg-primary p-3 px-4 text-sm text-white"
                                        style={{ borderRadius: '18px 18px 4px 18px' }}
                                    >
                                        {msg.replyToMessage && (
                                            <div className="mb-1.5 border-l-2 border-white/50 pl-2 text-xs opacity-80">
                                                <div className="font-semibold">{msg.replyToMessage.sender.firstName}</div>
                                                <div className="truncate">{msg.replyToMessage.content || '[attachment]'}</div>
                                            </div>
                                        )}
                                        {msg.content && <div className="leading-relaxed">{msg.content}</div>}
                                        {msg.mediaUrl && msg.mediaType && (
                                            <MessageAttachment mediaUrl={msg.mediaUrl} mediaType={msg.mediaType} variant="self" />
                                        )}
                                        {msg.editedAt && <div className="text-[10px] mt-0.5 opacity-50">edited</div>}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <button
                                            type="button"
                                            className="text-[10px] text-gray-400 hover:text-primary transition-colors"
                                            onClick={() => setReplyingTo(msg)}
                                        >
                                            Reply
                                        </button>
                                        {msg.content?.trim() && (
                                            <button
                                                type="button"
                                                className="text-[10px] text-gray-400 hover:text-primary transition-colors"
                                                onClick={() => {
                                                    setEditingId(msg.id);
                                                    setInput(msg.content || '');
                                                    setReplyingTo(null);
                                                }}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Received */
                                <div className={cn('group flex items-start gap-2', isGrouped ? 'mt-1' : 'mt-5')}>
                                    {!isGrouped ? (
                                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200 mt-1">
                                            {partner?.avatar ? (
                                                <Image src={partner.avatar} alt="Avatar" fill className="object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-8 shrink-0" />
                                    )}
                                    <div className="max-w-[70%]">
                                        <div
                                            className="bg-[#F3F4F6] p-3 px-4 text-sm text-gray-700 leading-relaxed"
                                            style={{ borderRadius: '18px 18px 18px 4px' }}
                                        >
                                            {msg.replyToMessage && (
                                                <div className="mb-1.5 border-l-2 border-primary/40 pl-2 text-xs opacity-80">
                                                    <div className="font-semibold">{msg.replyToMessage.sender.firstName}</div>
                                                    <div className="truncate">{msg.replyToMessage.content || '[attachment]'}</div>
                                                </div>
                                            )}
                                            {msg.content && <div>{msg.content}</div>}
                                            {msg.mediaUrl && msg.mediaType && (
                                                <MessageAttachment mediaUrl={msg.mediaUrl} mediaType={msg.mediaType} variant="other" />
                                            )}
                                            {msg.editedAt && (
                                                <div className="text-[10px] mt-0.5 opacity-50 text-gray-400">edited</div>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button
                                                type="button"
                                                className="text-[10px] text-gray-400 hover:text-primary transition-colors"
                                                onClick={() => setReplyingTo(msg)}
                                            >
                                                Reply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            {/* Floating input bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%] max-w-2xl z-10">
                {replyingTo && !editingId && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-white border border-gray-200 shadow-sm px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-0.5">
                                Replying to {replyingTo.sender.firstName}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                                {(replyingTo.content || '[attachment]').slice(0, 80)}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                            onClick={() => setReplyingTo(null)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                {editingId && (
                    <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/60">
                            Editing message
                        </span>
                        <button
                            type="button"
                            className="text-[10px] text-gray-400 hover:text-gray-600"
                            onClick={() => { setEditingId(null); setInput(''); }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
                {pendingFile && !editingId && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-white border border-gray-200 shadow-sm px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{pendingFile.name}</span>
                        <button
                            type="button"
                            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                            onClick={() => setPendingFile(null)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                <form
                    onSubmit={sendMessage}
                    className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-blue-50/50"
                    style={{ boxShadow: '0 10px 50px -10px rgba(43, 101, 226, 0.25)' }}
                >
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
                            <button
                                type="button"
                                className="p-2 text-gray-400 hover:text-primary transition-colors shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip size={20} />
                            </button>
                        </>
                    )}
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 border-none bg-transparent text-sm text-gray-600 placeholder:text-gray-400 outline-none focus:ring-0 py-1"
                        placeholder={editingId ? 'Edit message…' : 'Type a message…'}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!canSubmit || uploading}
                        className="p-2 text-primary hover:scale-110 transition-transform shrink-0 disabled:opacity-30 disabled:hover:scale-100"
                    >
                        {uploading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
