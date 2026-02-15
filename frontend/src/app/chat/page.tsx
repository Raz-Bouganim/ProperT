'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Loader2, MessageSquare } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

interface Conversation {
    id: string;
    updatedAt: string;
    participants: {
        user: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    }[];
    messages: {
        content: string;
        createdAt: string;
    }[];
    property?: {
        title: string;
    };
}

export default function ChatListPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchConversations = async () => {
            try {
                const res = await api.get('/chat/conversations');
                setConversations(res.data);
            } catch (error) {
                console.error('Failed to fetch conversations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="p-4 border-b sticky top-0 bg-background z-10 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Messages</h1>
            </div>

            {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                        <MessageSquare className="w-10 h-10 text-muted-foreground opacity-20" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">No messages yet</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                        When you contact an owner or receive inquiries, your conversations will appear here.
                    </p>
                </div>
            ) : (
                <div className="divide-y">
                    {conversations.map((conv) => {
                        const otherParticipant = conv.participants.find(p => p.user.id !== user?.id)?.user;
                        const lastMessage = conv.messages[0];
                        const displayName = otherParticipant
                            ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                            : 'Unknown User';

                        return (
                            <Link key={conv.id} href={`/chat/${conv.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
                                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                    {otherParticipant?.avatar ? (
                                        <Image
                                            src={otherParticipant.avatar}
                                            alt={displayName}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="text-muted-foreground w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-bold truncate group-hover:text-primary transition-colors">
                                            {displayName}
                                        </h3>
                                        {lastMessage && (
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">
                                                {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1 opacity-70">
                                        {conv.property?.title || 'General Inquiry'}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate leading-snug">
                                        {lastMessage?.content || 'No messages yet'}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
