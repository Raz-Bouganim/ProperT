'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Message {
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
}

export function ChatWindow({ chatId }: { chatId: string }) {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', senderId: 'other', content: 'Hi, is this property still available?', timestamp: new Date(Date.now() - 3600000) },
        { id: '2', senderId: 'me', content: 'Yes, it is!', timestamp: new Date(Date.now() - 3500000) },
    ]);
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setMessages([...messages, {
            id: Date.now().toString(),
            senderId: 'me',
            content: input,
            timestamp: new Date()
        }]);
        setInput('');
    };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex flex-col h-screen max-h-screen bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-10">
                <Link href="/chat">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ChevronLeft />
                    </Button>
                </Link>
                <div className="font-semibold">John Doe</div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.senderId === 'me' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                            msg.senderId === 'me'
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-muted text-foreground rounded-tl-none"
                        )}>
                            {msg.content}
                        </div>
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
                        className="flex-grow p-3 rounded-full border bg-muted focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="Type a message..."
                        autoFocus
                    />
                    <Button type="submit" size="icon" className="rounded-full w-12 h-12 shrink-0">
                        <Send size={20} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
