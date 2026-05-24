'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Loader2, MessageSquare, Archive, ArchiveRestore, Search } from 'lucide-react';
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

type Tab = 'all' | 'unread' | 'archived';

function ChatLayout() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('id');

    const [tab, setTab] = useState<Tab>('all');
    const [search, setSearch] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    const folder = tab === 'archived' ? 'archived' : 'inbox';

    useEffect(() => {
        if (!user) return;
        const fetchConversations = async () => {
            setLoading(true);
            try {
                const res = await api.get('/chat/conversations', { params: { folder } });
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
                    i === idx ? { ...c, lastMessagePreview: preview, lastMessageAt: timestamp } : c,
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

    const displayed = conversations.filter((conv) => {
        if (tab === 'unread' && !(conv.unreadCount ?? 0)) return false;
        if (!search.trim()) return true;
        const other = conv.participants.find((p) => p.user.id !== user?.id)?.user;
        const name = other ? `${other.firstName} ${other.lastName}`.toLowerCase() : '';
        const q = search.toLowerCase();
        return name.includes(q) || (conv.property?.title?.toLowerCase().includes(q) ?? false);
    });

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 shrink-0 flex flex-col bg-[#F9FAFB] border-r border-gray-100">
                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full pl-9 pr-3 py-2 bg-gray-200/40 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-2 px-4 mb-2">
                    {(['all', 'unread', 'archived'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors',
                                tab === t
                                    ? 'bg-blue-50 text-primary'
                                    : 'text-gray-500 hover:text-gray-700',
                            )}
                        >
                            {t === 'all' ? 'All' : t === 'unread' ? 'Unread' : 'Archived'}
                        </button>
                    ))}
                </div>

                {/* Conversation list */}
                <div
                    className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-primary opacity-30" />
                        </div>
                    ) : displayed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                <MessageSquare className="h-5 w-5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-400">
                                {tab === 'unread' ? 'No unread conversations' :
                                 tab === 'archived' ? 'No archived conversations' :
                                 'No conversations yet'}
                            </p>
                        </div>
                    ) : (
                        displayed.map((conv) => {
                            const other = conv.participants.find(
                                (p) => p.user.id !== user?.id,
                            )?.user;
                            const preview = conv.lastMessagePreview ?? conv.messages?.[0]?.content ?? null;
                            const lastAt = conv.lastMessageAt ?? conv.messages?.[0]?.createdAt ?? null;
                            const displayName = other
                                ? `${other.firstName} ${other.lastName}`
                                : 'Unknown User';
                            const isSelected = conv.id === selectedId;
                            const unread = isSelected ? 0 : (conv.unreadCount ?? 0);
                            const isRead = unread === 0;

                            return (
                                <div
                                    key={conv.id}
                                    className={cn(
                                        'group flex items-center gap-3 px-4 py-5 cursor-pointer transition-colors',
                                        isSelected
                                            ? 'bg-blue-50/50 border-r-2 border-primary'
                                            : cn(
                                                'hover:bg-gray-100',
                                                isRead && 'opacity-70',
                                              ),
                                    )}
                                    onClick={() => selectConversation(conv.id)}
                                >
                                    <div className="relative shrink-0">
                                        <div className={cn(
                                            'h-11 w-11 overflow-hidden rounded-full bg-slate-200',
                                            !isSelected && isRead && 'grayscale',
                                        )}>
                                            {other?.avatar ? (
                                                <Image
                                                    src={other.avatar}
                                                    alt={displayName}
                                                    width={44}
                                                    height={44}
                                                    className="object-cover w-full h-full"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <User className="h-5 w-5 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-1">
                                            <h3 className={cn(
                                                'truncate text-sm font-semibold',
                                                isSelected ? 'text-primary' : 'text-gray-700',
                                            )}>
                                                {displayName}
                                            </h3>
                                            {lastAt && (
                                                <span className="shrink-0 text-[9px] text-gray-400">
                                                    {new Date(lastAt).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 truncate text-xs text-gray-500">
                                            {conv.property?.title
                                                ? `Inquiring about: ${conv.property.title}`
                                                : preview || 'No messages yet'}
                                        </p>
                                    </div>
                                    {unread > 0 && (
                                        <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                                    )}
                                    {tab !== 'archived' ? (
                                        <button
                                            type="button"
                                            title="Archive"
                                            className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:text-gray-600 group-hover:opacity-100"
                                            onClick={(e) => handleArchiveToggle(e, conv.id, true)}
                                        >
                                            <Archive className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            title="Move to inbox"
                                            className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:text-gray-600 group-hover:opacity-100"
                                            onClick={(e) => handleArchiveToggle(e, conv.id, false)}
                                        >
                                            <ArchiveRestore className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

            </aside>

            {/* Chat panel */}
            <section className="flex-1 flex flex-col overflow-hidden bg-white">
                {selectedId ? (
                    <ChatWindow
                        key={selectedId}
                        chatId={selectedId}
                        embedded
                        onNewMessage={handleNewMessage}
                        onRead={handleRead}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                            <MessageSquare className="h-7 w-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">
                            Select a conversation to start messaging
                        </p>
                    </div>
                )}
            </section>
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
