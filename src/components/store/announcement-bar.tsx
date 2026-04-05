'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const FALLBACK_TEXT = 'Envio 100% Discreto | Empresa Paraguaya | 4.9 Google';
const ROTATION_INTERVAL = 5000;

export function AnnouncementBar() {
  const [messages, setMessages] = useState<string[]>([FALLBACK_TEXT]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const supabase = createClient();
        const { data } = await (supabase as any)
          .from('announcements')
          .select('text')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        const texts = ((data as any[]) || [])
          .map((a: any) => a.text)
          .filter(Boolean);

        if (texts.length > 0) {
          setMessages(texts);
        }
      } catch {
        // Keep fallback text
      }
    }

    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;

    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsAnimating(false);
      }, 300);
    }, ROTATION_INTERVAL);

    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="bg-gradient-to-r from-rose-500 to-purple-600 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm overflow-hidden">
      <p
        className={`transition-all duration-300 ${
          isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {messages[currentIndex]}
      </p>
    </div>
  );
}
