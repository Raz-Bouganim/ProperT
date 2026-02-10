"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { X, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { clsx } from "clsx";

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: {
        firstName: string;
        lastName: string;
        avatar?: string;
    };
}

interface ChatWindowProps {
    listingId: string;
    ownerId: string;
    isOpen: boolean;
    onClose: () => void;
    listingTitle: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function ChatWindow({ listingId, ownerId, isOpen, onClose, listingTitle }: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !user) return;

        // 1. Get or Create Conversation
        const initChat = async () => {
            try {
                const res = await api.post("/chat/conversations", { listingId, ownerId });
                setConversationId(res.data.id);

                // Load history
                const msgRes = await api.get(`/chat/messages/${res.data.id}`);
                setMessages(msgRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to init chat:", error);
                setLoading(false);
            }
        };

        initChat();

        // 2. Initialize Socket
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [isOpen, listingId, ownerId, user]);

    useEffect(() => {
        if (!socket || !conversationId) return;

        socket.emit("joinRoom", conversationId);

        socket.on("newMessage", (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });

        return () => {
            socket.off("newMessage");
        };
    }, [socket, conversationId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !conversationId || !user) return;

        const messageData = {
            conversationId,
            senderId: user.id,
            content: newMessage,
        };

        // Socket emit handles broadcasting
        socket.emit("sendMessage", messageData);
        setNewMessage("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-background border rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            {/* Header */}
            <div className="p-4 border-b bg-primary text-primary-foreground flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="font-bold leading-tight line-clamp-1">{listingTitle}</div>
                        <div className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Real-time Chat</div>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50"
            >
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Send className="w-8 h-8 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-muted-foreground font-medium">Say hello to start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={clsx(
                                "flex flex-col max-w-[85%]",
                                msg.senderId === user?.id ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            <div
                                className={clsx(
                                    "px-4 py-2 rounded-2xl text-sm shadow-sm",
                                    msg.senderId === user?.id
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-white border rounded-tl-none"
                                )}
                            >
                                {msg.content}
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow bg-slate-100 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary transition-all outline-none"
                />
                <Button
                    type="submit"
                    disabled={!newMessage.trim()}
                    size="icon"
                    className="rounded-2xl shrink-0"
                >
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
}
