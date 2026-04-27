'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
    sender: {
        firstName: string;
        lastName: string;
        avatar?: string;
    };
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function ChatWindow({ chatId }: { chatId: string }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [partner, setPartner] = useState<any>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chatId || !user) return;

        const loadChat = async () => {
            try {
                // Fetch messages
                const res = await api.get(`/chat/messages/${chatId}`);
                setMessages(res.data);

                // Fetch specific conversation info
                const convRes = await api.get(`/chat/conversations/${chatId}`);
                const currentConv = convRes.data;
                if (currentConv) {
                    const other = currentConv.participants.find((p: any) => p.user.id !== user.id)?.user;
                    setPartner(other);
                }

                setLoading(false);
            } catch (error) {
                console.error('Failed to load chat:', error);
                setLoading(false);
            }
        };

        loadChat();

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [chatId, user]);

    useEffect(() => {
        if (!socket || !chatId) return;

        socket.emit('joinRoom', chatId);
        socket.on('newMessage', (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });

        return () => {
            socket.off('newMessage');
        };
    }, [socket, chatId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !socket || !user) return;

        socket.emit('sendMessage', {
            conversationId: chatId,
            senderId: user.id,
            content: input
        });

        setInput('');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-h-screen bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-10">
                <Link href="/chat">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ChevronLeft />
                    </Button>
                </Link>
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
                    {partner?.avatar ? (
                        <Image src={partner.avatar} alt="Partner" fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <div>
                    <div className="font-bold leading-tight">
                        {partner ? `${partner.firstName} ${partner.lastName}` : 'Chat'}
                    </div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-primary opacity-60">Online</div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col", msg.senderId === user?.id ? "items-end" : "items-start")}>
                        <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                            msg.senderId === user?.id
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-white border text-foreground rounded-tl-none"
                        )}>
                            {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background sticky bottom-0">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="flex-grow p-3 rounded-2xl border bg-muted focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        placeholder="Type a message..."
                        autoFocus
                    />
                    <Button type="submit" size="icon" className="rounded-2xl w-12 h-12 shrink-0 shadow-lg">
                        <Send size={20} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
