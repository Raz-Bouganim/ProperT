'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Loader2, MessageSquare, Archive, ArchiveRestore } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChatWindow } from '@/components/chat/ChatWindow';

interface Conversation {
    id: string;
    updatedAt: string;
    lastMessageAt?: string | null;
    lastMessagePreview?: string | null;
    participants: {
        user: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    }[];
    messages?: {
        content: string;
        createdAt: string;
    }[];
    property?: {
        title: string;
    };
    unreadCount?: number;
}

type Folder = 'inbox' | 'archived';

function ChatLayout() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('id');

    const [folder, setFolder] = useState<Folder>('inbox');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchConversations = async () => {
            setLoading(true);
            try {
                const res = await api.get('/chat/conversations', {
                    params: { folder },
                });
                setConversations(res.data);
            } catch (error) {
                console.error('Failed to fetch conversations:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchConversations();
    }, [user, folder]);

    const handleArchiveToggle = async (
        e: React.MouseEvent,
        conversationId: string,
        archived: boolean,
    ) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.patch(`/chat/conversations/${conversationId}`, { archived });
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
            if (selectedId === conversationId) {
                router.push('/chat', { scroll: false });
            }
        } catch (err) {
            console.error('Archive toggle failed', err);
        }
    };

    const handleRead = useCallback(() => {
        setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)),
        );
    }, [selectedId]);

    const handleNewMessage = useCallback(
        (preview: string, timestamp: string) => {
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === selectedId);
                if (idx === -1) return prev;
                const updated = prev.map((c, i) =>
                    i === idx
                        ? { ...c, lastMessagePreview: preview, lastMessageAt: timestamp }
                        : c,
                );
                if (idx === 0) return updated;
                const moved = updated[idx];
                return [moved, ...updated.slice(0, idx), ...updated.slice(idx + 1)];
            });
        },
        [selectedId],
    );

    const selectConversation = (id: string) => {
        router.push(`/chat?id=${id}`, { scroll: false });
    };

    const emptyTitle =
        folder === 'archived' ? 'No archived conversations' : 'No messages yet';
    const emptyBody =
        folder === 'archived'
            ? 'Threads you archive appear here.'
            : 'When you contact an owner or receive inquiries, your conversations will appear here.';

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            {/* Left sidebar */}
            <div className="flex w-80 flex-shrink-0 flex-col border-r bg-background">
                <div className="shrink-0 border-b px-4 pb-3 pt-4">
                    <h1 className="mb-3 text-xl font-bold">Messages</h1>
                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => setFolder('inbox')}
                            className={cn(
                                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                                folder === 'inbox'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                            )}
                        >
                            Inbox
                        </button>
                        <button
                            type="button"
                            onClick={() => setFolder('archived')}
                            className={cn(
                                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                                folder === 'archived'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                            )}
                        >
                            Archived
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <MessageSquare className="h-7 w-7 text-muted-foreground opacity-20" />
                            </div>
                            <h3 className="mb-1 text-sm font-bold">{emptyTitle}</h3>
                            <p className="text-xs text-muted-foreground">{emptyBody}</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {conversations.map((conv) => {
                                const otherParticipant = conv.participants.find(
                                    (p) => p.user.id !== user?.id,
                                )?.user;
                                const preview =
                                    conv.lastMessagePreview ??
                                    conv.messages?.[0]?.content ??
                                    null;
                                const lastAt =
                                    conv.lastMessageAt ??
                                    conv.messages?.[0]?.createdAt ??
                                    null;
                                const displayName = otherParticipant
                                    ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                                    : 'Unknown User';
                                const isSelected = conv.id === selectedId;
                                const unread = isSelected ? 0 : (conv.unreadCount ?? 0);

                                return (
                                    <div
                                        key={conv.id}
                                        className={cn(
                                            'group relative flex cursor-pointer items-center gap-3 p-3 transition-colors',
                                            isSelected
                                                ? 'bg-primary/8 border-l-2 border-primary'
                                                : 'hover:bg-muted/50',
                                        )}
                                        onClick={() => selectConversation(conv.id)}
                                    >
                                        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                                            {otherParticipant?.avatar ? (
                                                <Image
                                                    src={otherParticipant.avatar}
                                                    alt={displayName}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-grow">
                                            <div className="mb-0.5 flex items-baseline justify-between gap-1">
                                                <h3
                                                    className={cn(
                                                        'truncate text-sm',
                                                        unread > 0 ? 'font-extrabold' : 'font-bold',
                                                        isSelected
                                                            ? 'text-primary'
                                                            : 'group-hover:text-primary',
                                                    )}
                                                >
                                                    {displayName}
                                                </h3>
                                                {lastAt && (
                                                    <span className={cn(
                                                        'shrink-0 text-[10px] uppercase tracking-tighter',
                                                        unread > 0 ? 'font-bold text-primary' : 'font-bold text-muted-foreground',
                                                    )}>
                                                        {new Date(lastAt).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mb-0.5 flex items-center justify-between gap-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-primary opacity-70">
                                                    {conv.property?.title || 'General Inquiry'}
                                                </span>
                                                {unread > 0 && (
                                                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                                                        {unread > 99 ? '99+' : unread}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={cn(
                                                'truncate text-xs',
                                                unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
                                            )}>
                                                {preview || 'No messages yet'}
                                            </p>
                                        </div>
                                        {folder === 'inbox' ? (
                                            <button
                                                type="button"
                                                title="Archive conversation"
                                                className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                                onClick={(e) => handleArchiveToggle(e, conv.id, true)}
                                            >
                                                <Archive className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                title="Move to inbox"
                                                className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                                onClick={(e) => handleArchiveToggle(e, conv.id, false)}
                                            >
                                                <ArchiveRestore className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {selectedId ? (
                    <ChatWindow key={selectedId} chatId={selectedId} embedded onNewMessage={handleNewMessage} onRead={handleRead} />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <MessageSquare className="h-8 w-8 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Select a conversation to start messaging
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                </div>
            }
        >
            <ChatLayout />
        </Suspense>
    );
}
