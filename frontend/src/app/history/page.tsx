'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLocalDateString, formatDateForDisplay } from '@/lib/dateUtils';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserHeader from '@/components/UserHeader';
import { useAuth } from '@/contexts/AuthContext';
import { getEntriesUrl, getAuthHeaders } from '@/lib/api';

interface Entry {
  id: number;
  date: string;
  rose: string | null;
  thorn: string | null;
  bud: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function History() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch(getEntriesUrl(), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setEntries(data.entries);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };


  const isToday = (dateString: string) => {
    return dateString === getLocalDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100 flex items-center justify-center">
        <div className="text-gray-600" role="status" aria-live="polite">
          Loading your reflections...
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <UserHeader />
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-gray-800 mb-2">Your Reflections</h1>
            <p className="text-gray-600 mb-4">A journey through your daily thoughts</p>
            <Link 
              href="/reflection/new" 
              className="inline-block px-6 py-4 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation min-h-[48px]"
            >
              Add Reflection
            </Link>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-12" role="region" aria-label="Empty state">
              <div className="text-gray-500">No reflections yet</div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="list" aria-label={`${entries.length} reflection entries`}>
              {entries.map((entry) => {
                const entryParts = [];
                if (entry.rose) entryParts.push('rose');
                if (entry.thorn) entryParts.push('thorn');
                if (entry.bud) entryParts.push('bud');
                const partsText = entryParts.length > 0 ? `Contains ${entryParts.join(', ')}` : 'Empty entry';
                
                return (
                <Link
                  key={entry.id}
                  href={`/entry/${entry.date}`}
                  className="group block focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-2xl touch-manipulation"
                  role="listitem"
                  aria-label={`Reflection for ${formatDateForDisplay(entry.date)}. ${partsText}. Click to view or edit.`}
                >
                  <article className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 h-full hover:shadow-xl active:shadow-2xl transition-all duration-300 group-hover:scale-105 group-active:scale-95">
                    <header className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-800">
                        {formatDateForDisplay(entry.date)}
                      </h3>
                      {isToday(entry.date) && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full" aria-label="Today's reflection">
                          Today
                        </span>
                      )}
                    </header>

                    <div className="space-y-3" role="group" aria-label="Reflection content">
                      {entry.rose && (
                        <div className="flex items-start space-x-2">
                          <span className="text-rose-500 mt-1" aria-label="Rose - best part">🌹</span>
                          <p className="text-gray-700 text-sm line-clamp-2" aria-label={`Rose: ${entry.rose}`}>
                            {entry.rose}
                          </p>
                        </div>
                      )}

                      {entry.thorn && (
                        <div className="flex items-start space-x-2">
                          <span className="text-green-600 mt-1" aria-label="Thorn - challenge">🌿</span>
                          <p className="text-gray-700 text-sm line-clamp-2" aria-label={`Thorn: ${entry.thorn}`}>
                            {entry.thorn}
                          </p>
                        </div>
                      )}

                      {entry.bud && (
                        <div className="flex items-start space-x-2">
                          <span className="text-pink-500 mt-1" aria-label="Bud - looking forward to">🌸</span>
                          <p className="text-gray-700 text-sm line-clamp-2" aria-label={`Bud: ${entry.bud}`}>
                            {entry.bud}
                          </p>
                        </div>
                      )}
                    </div>

                    <footer className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center" aria-hidden="true">
                        Click to view or edit
                      </p>
                    </footer>
                  </article>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}