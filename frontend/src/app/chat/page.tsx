'use client';

import Link from 'next/link';
import { User } from 'lucide-react';

export default function ChatListPage() {
    const chats = [
        { id: '1', name: 'John Doe', lastMessage: 'Is the apartment still available?', time: '2m ago', unread: 2 },
        { id: '2', name: 'Jane Smith', lastMessage: 'Great, thanks!', time: '1h ago', unread: 0 },
        { id: '3', name: 'Mike Johnson', lastMessage: 'When can I visit?', time: '1d ago', unread: 0 },
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="p-4 border-b sticky top-0 bg-background z-10">
                <h1 className="text-2xl font-bold">Messages</h1>
            </div>

            <div className="divide-y">
                {chats.map((chat) => (
                    <Link key={chat.id} href={`/chat/${chat.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <User className="text-muted-foreground" />
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className="font-semibold truncate">{chat.name}</h3>
                                <span className="text-xs text-muted-foreground">{chat.time}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                        </div>
                        {chat.unread > 0 && (
                            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                                {chat.unread}
                            </div>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
