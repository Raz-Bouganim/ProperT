'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Loader2, MessageSquare, Archive, ArchiveRestore } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
}

type Folder = 'inbox' | 'archived';

export default function ChatListPage() {
    const { user } = useAuth();
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

    const setArchived = async (
        e: React.MouseEvent,
        conversationId: string,
        archived: boolean,
    ) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.patch(`/chat/conversations/${conversationId}`, { archived });
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        } catch (err) {
            console.error('Archive toggle failed', err);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    const emptyTitle =
        folder === 'archived' ? 'No archived conversations' : 'No messages yet';
    const emptyBody =
        folder === 'archived'
            ? 'Threads you archive appear here. Restore them to bring them back to your inbox.'
            : 'When you contact an owner or receive inquiries, your conversations will appear here.';

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="sticky top-0 z-10 border-b bg-background">
                <div className="flex items-center justify-between p-4">
                    <h1 className="text-2xl font-bold">Messages</h1>
                </div>
                <div className="flex gap-1 px-4 pb-3">
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

            {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                        <MessageSquare className="h-10 w-10 text-muted-foreground opacity-20" />
                    </div>
                    <h3 className="mb-1 text-lg font-bold">{emptyTitle}</h3>
                    <p className="max-w-xs text-sm text-muted-foreground">{emptyBody}</p>
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
                            conv.lastMessageAt ?? conv.messages?.[0]?.createdAt ?? null;
                        const displayName = otherParticipant
                            ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                            : 'Unknown User';

                        return (
                            <div
                                key={conv.id}
                                className="group relative flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                            >
                                <Link
                                    href={`/chat/${conv.id}`}
                                    className="flex min-w-0 flex-grow items-center gap-4"
                                >
                                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                                        {otherParticipant?.avatar ? (
                                            <Image
                                                src={otherParticipant.avatar}
                                                alt={displayName}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <User className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-grow">
                                        <div className="mb-0.5 flex items-baseline justify-between">
                                            <h3 className="truncate font-bold transition-colors group-hover:text-primary">
                                                {displayName}
                                            </h3>
                                            {lastAt && (
                                                <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                                                    {new Date(lastAt).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary opacity-70">
                                            {conv.property?.title || 'General Inquiry'}
                                        </div>
                                        <p className="truncate text-sm leading-snug text-muted-foreground">
                                            {preview || 'No messages yet'}
                                        </p>
                                    </div>
                                </Link>
                                {folder === 'inbox' ? (
                                    <button
                                        type="button"
                                        title="Archive conversation"
                                        className="flex-shrink-0 rounded-full p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                        onClick={(e) => setArchived(e, conv.id, true)}
                                    >
                                        <Archive className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        title="Move to inbox"
                                        className="flex-shrink-0 rounded-full p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                        onClick={(e) => setArchived(e, conv.id, false)}
                                    >
                                        <ArchiveRestore className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
