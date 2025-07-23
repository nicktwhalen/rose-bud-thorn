'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLocalDateString, formatDateForDisplay, formatTimestampForDisplay } from '@/lib/dateUtils';
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

export default function EntryPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    rose: '',
    thorn: '',
    bud: '',
    date: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    if (params.date) {
      fetchEntry(params.date as string);
    }
  }, [params.date]);

  const fetchEntry = async (date: string) => {
    try {
      const response = await fetch(getEntriesUrl(date), {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setEntry(data);
        setFormData({
          rose: data.rose || '',
          thorn: data.thorn || '',
          bud: data.bud || '',
          date: data.date
        });
      } else {
        console.error('Entry not found');
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if at least one field has content
  const hasAtLeastOneField = () => {
    return (formData.rose && formData.rose.trim().length > 0) ||
           (formData.thorn && formData.thorn.trim().length > 0) ||
           (formData.bud && formData.bud.trim().length > 0);
  };

  const handleSave = async () => {
    if (!entry) return;

    try {
      // If date has changed, we need to handle potential conflicts
      if (formData.date !== entry.date) {
        // Check if an entry already exists for the new date
        const checkResponse = await fetch(getEntriesUrl(formData.date), {
          headers: getAuthHeaders(),
        });
        
        if (checkResponse.ok) {
          // Entry exists for new date, ask user what to do
          const shouldOverwrite = confirm(
            `An entry already exists for ${formData.date}. Would you like to replace it with this entry?`
          );
          
          if (!shouldOverwrite) {
            return; // User chose not to overwrite
          }
        }

        // Delete the old entry
        await fetch(getEntriesUrl(entry.date), {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        // Use upsert to handle the new entry (will create or update as needed)
        const response = await fetch(getEntriesUrl('upsert'), {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          // Redirect to the new date's page
          router.push(`/entry/${formData.date}`);
        } else {
          throw new Error('Failed to save entry');
        }
      } else {
        // Normal update without date change
        const response = await fetch(getEntriesUrl(entry.date), {
          method: 'PATCH',
          headers: getAuthHeaders(true),
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const updatedEntry = await response.json();
          setEntry(updatedEntry);
          setIsEditing(false);
        } else {
          throw new Error('Failed to update entry');
        }
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('There was an error saving your changes. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!entry || !confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(getEntriesUrl(entry.date), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        router.push('/history');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100 flex items-center justify-center">
        <div className="text-gray-600" role="status" aria-live="polite">
          Loading your reflection...
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100 flex items-center justify-center">
        <div className="text-center" role="alert">
          <div className="text-gray-600 mb-4">Entry not found</div>
          <Link 
            href="/history" 
            className="text-purple-600 hover:text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded"
          >
            ← Back to history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <UserHeader />
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-gray-800 mb-2">
              {formatDateForDisplay(entry.date)}
            </h1>
            <Link href="/history" className="text-purple-600 hover:text-purple-800 text-sm">
              ← Back to all reflections
            </Link>
          </div>

          <main className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-8 mb-6" role="main">
            <header className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-gray-800">Daily Reflection</h2>
              <div className="flex space-x-2" role="toolbar" aria-label="Entry actions">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-3 md:py-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 touch-manipulation min-h-[48px]"
                      aria-label="Cancel editing"
                    >
                      Cancel
                    </button>
                    <div className="flex flex-col items-end">
                      <button
                        onClick={handleSave}
                        disabled={!hasAtLeastOneField()}
                        className={`px-4 py-3 md:py-2 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation min-h-[48px] ${
                          hasAtLeastOneField()
                            ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 active:from-green-700 active:to-blue-700 focus:ring-green-500'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        aria-label="Save changes to reflection"
                      >
                        Save
                      </button>
                      {!hasAtLeastOneField() && (
                        <p className="text-sm text-gray-500 mt-2 text-right">
                          Please fill in at least one field to save
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-3 md:py-2 text-purple-600 hover:bg-purple-50 active:bg-purple-100 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation min-h-[48px]"
                      aria-label="Edit this reflection"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-3 md:py-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation min-h-[48px]"
                      aria-label="Delete this reflection"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </header>

            {isEditing && (
              <div className="mb-6">
                <label htmlFor="entry-date" className="block text-sm text-gray-600 mb-2">
                  Date for this reflection:
                </label>
                <input
                  id="entry-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  max={getLocalDateString()}
                  className="px-4 py-2 border border-gray-200 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  aria-describedby="date-help"
                />
                <div id="date-help" className="sr-only">
                  Select the date for this reflection entry. Cannot be in the future.
                </div>
              </div>
            )}

            <div className="space-y-6" role="group" aria-label="Reflection sections">
              <section>
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3" aria-label="Rose emoji">🌹</span>
                  <h3 className="text-lg font-medium text-gray-800">Your Rose</h3>
                </div>
                {isEditing ? (
                  <div>
                    <label htmlFor="rose-input" className="sr-only">
                      Rose - What was the best part of your day?
                    </label>
                    <textarea
                      id="rose-input"
                      value={formData.rose}
                      onChange={(e) => setFormData(prev => ({ ...prev, rose: e.target.value }))}
                      placeholder="What was the best part of your day?"
                      className="w-full h-24 p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none text-gray-700 text-base touch-manipulation"
                      aria-describedby="rose-help"
                    />
                    <div id="rose-help" className="sr-only">
                      Describe the best part of your day, something positive that happened.
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 bg-rose-50 p-4 rounded-2xl" role="region" aria-label="Rose content">
                    {entry.rose || 'No rose recorded for this day'}
                  </p>
                )}
              </section>

              <section>
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3" aria-label="Thorn emoji">🌿</span>
                  <h3 className="text-lg font-medium text-gray-800">Your Thorn</h3>
                </div>
                {isEditing ? (
                  <div>
                    <label htmlFor="thorn-input" className="sr-only">
                      Thorn - What was challenging today?
                    </label>
                    <textarea
                      id="thorn-input"
                      value={formData.thorn}
                      onChange={(e) => setFormData(prev => ({ ...prev, thorn: e.target.value }))}
                      placeholder="What was challenging today?"
                      className="w-full h-24 p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none text-gray-700 text-base touch-manipulation"
                      aria-describedby="thorn-help"
                    />
                    <div id="thorn-help" className="sr-only">
                      Describe challenges or difficulties you faced today.
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 bg-green-50 p-4 rounded-2xl" role="region" aria-label="Thorn content">
                    {entry.thorn || 'No thorn recorded for this day'}
                  </p>
                )}
              </section>

              <section>
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3" aria-label="Bud emoji">🌸</span>
                  <h3 className="text-lg font-medium text-gray-800">Your Bud</h3>
                </div>
                {isEditing ? (
                  <div>
                    <label htmlFor="bud-input" className="sr-only">
                      Bud - What are you looking forward to tomorrow?
                    </label>
                    <textarea
                      id="bud-input"
                      value={formData.bud}
                      onChange={(e) => setFormData(prev => ({ ...prev, bud: e.target.value }))}
                      placeholder="What are you looking forward to tomorrow?"
                      className="w-full h-24 p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none text-gray-700 text-base touch-manipulation"
                      aria-describedby="bud-help"
                    />
                    <div id="bud-help" className="sr-only">
                      Describe what you're looking forward to or hopeful about for tomorrow.
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 bg-pink-50 p-4 rounded-2xl" role="region" aria-label="Bud content">
                    {entry.bud || 'No bud recorded for this day'}
                  </p>
                )}
              </section>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Created: {formatTimestampForDisplay(entry.createdAt)}
                {entry.updatedAt !== entry.createdAt && (
                  <span className="ml-2">
                    • Updated: {formatTimestampForDisplay(entry.updatedAt)}
                  </span>
                )}
              </p>
            </div>
          </main>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}