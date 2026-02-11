'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Globe, Users, Share2 } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-slate-900 text-white pt-16 pb-10">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-1">
                    <div className="flex items-center gap-2 mb-6 cursor-pointer group">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="bg-primary p-1 rounded-lg group-hover:scale-105 transition-transform">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-extrabold tracking-tight">ProperT</h2>
                        </Link>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Redefining real estate for the modern world. Direct communication, media-rich listings, and a
                        seamless mobile experience.
                    </p>
                    <div className="flex gap-4">
                        <a className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer" href="#">
                            <Globe size={16} />
                        </a>
                        <a className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer" href="#">
                            <Users size={16} />
                        </a>
                        <a className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer" href="#">
                            <Share2 size={16} />
                        </a>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold mb-6 text-slate-100">Quick Links</h4>
                    <ul className="space-y-4 text-slate-400 text-sm">
                        <li><Link className="hover:text-primary transition-colors cursor-pointer" href="/about">About Us</Link></li>
                        <li><Link className="hover:text-primary transition-colors cursor-pointer" href="/search">Properties</Link></li>
                        <li><Link className="hover:text-primary transition-colors cursor-pointer" href="/contact">Contact</Link></li>
                        <li><Link className="hover:text-primary transition-colors cursor-pointer" href="/blog">Blog</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-6 text-slate-100">Legal</h4>
                    <ul className="space-y-4 text-slate-400 text-sm">
                        <li><Link className="hover:text-primary transition-colors cursor-pointer" href="/privacy">Privacy Policy</Link></li>
                        <li><Link className="hover:text-primary transition-colors cursor-pointer" href="/terms">Terms of Service</Link></li>
                        <li><Link className="hover:text-primary transition-colors cursor-pointer" href="/cookies">Cookie Policy</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-6 text-slate-100">Contact</h4>
                    <ul className="space-y-4 text-slate-400 text-sm">
                        <li className="flex items-center gap-3">
                            <Mail size={18} className="text-primary" />
                            hello@propert.com
                        </li>
                        <li className="flex items-center gap-3">
                            <Phone size={18} className="text-primary" />
                            +1 (555) 000-0000
                        </li>
                        <li className="flex items-center gap-3">
                            <MapPin size={18} className="text-primary" />
                            123 Real Estate Way, NY
                        </li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
                <p>© {new Date().getFullYear()} ProperT Inc. All rights reserved.</p>
                <div className="flex gap-6">
                    <a className="hover:text-slate-300 cursor-pointer" href="#">Instagram</a>
                    <a className="hover:text-slate-300 cursor-pointer" href="#">LinkedIn</a>
                    <a className="hover:text-slate-300 cursor-pointer" href="#">X (Twitter)</a>
                </div>
            </div>
        </footer>
    );
}
