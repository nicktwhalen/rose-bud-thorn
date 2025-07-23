'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [formData, setFormData] = useState({
    rose: '',
    thorn: '',
    bud: ''
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [hasAnyEntries, setHasAnyEntries] = useState(false);
  const [todayEntryExists, setTodayEntryExists] = useState<boolean>(false);
  const [selectedDateEntryExists, setSelectedDateEntryExists] = useState<boolean>(false);
  
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const todayDate = getLocalDateString();
  
  // Check if selected date is today
  const isSelectedDateToday = selectedDate === todayDate;
  
  // Use entries data for both today's check and selected date check (avoids all 404s)
  const entryExists = isSelectedDateToday ? todayEntryExists : selectedDateEntryExists;
  const actualTodayEntryExists = todayEntryExists;

  const steps = [
    {
      title: "🌹 Your Rose",
      subtitle: "What was the best part of your day?",
      field: 'rose',
      placeholder: "Share something that made you smile today...",
      encouragement: "Every day has something beautiful, even if it's small"
    },
    {
      title: "🌿 Your Thorn",
      subtitle: "What was challenging today?",
      field: 'thorn',
      placeholder: "It's okay to acknowledge the tough moments...",
      encouragement: "Challenges help us grow and become stronger"
    },
    {
      title: "🌸 Your Bud",
      subtitle: "What are you looking forward to tomorrow?",
      field: 'bud',
      placeholder: "What gives you hope for tomorrow?",
      encouragement: "Tomorrow holds new possibilities and opportunities"
    }
  ];

  // Consolidated function to fetch entries and determine if any exist
  const fetchEntriesData = async (includeFullData: boolean = false) => {
    try {
      console.log(`[fetchEntriesData] Making API request with includeFullData: ${includeFullData}`);
      const response = await fetch(getEntriesUrl(), {
        headers: getAuthHeaders(),
      });
      
      if (response && response.ok && typeof response.json === 'function') {
        const data = await response.json();
        const hasEntries = data.entries && data.entries.length > 0;
        
        setHasAnyEntries(hasEntries);
        
        // Check if today's entry exists in the returned entries (avoids 404 requests)
        const todayExists = Boolean(data.entries && Array.isArray(data.entries) && data.entries.some((entry: any) => entry.date === todayDate));
        setTodayEntryExists(todayExists);
        console.log(`[fetchEntriesData] Today's entry (${todayDate}) exists: ${todayExists}`);
        
        // Check if selected date entry exists in the returned entries (avoids 404 requests)
        const selectedExists = Boolean(data.entries && Array.isArray(data.entries) && data.entries.some((entry: any) => entry.date === selectedDate));
        setSelectedDateEntryExists(selectedExists);
        console.log(`[fetchEntriesData] Selected date entry (${selectedDate}) exists: ${selectedExists}`);
        
        if (includeFullData) {
          setEntries(data.entries);
        }
      } else {
        setHasAnyEntries(false);
        setTodayEntryExists(false);
        setSelectedDateEntryExists(false);
        if (includeFullData) {
          setEntries([]);
        }
      }
    } catch (error) {
      console.error('Error fetching entries data:', error);
      setHasAnyEntries(false);
      setTodayEntryExists(false);
      setSelectedDateEntryExists(false);
      if (includeFullData) {
        setEntries([]);
      }
    } finally {
      if (includeFullData) {
        setHistoryLoading(false);
      }
    }
  };

  // Initial load and when selected date changes - fetch entries data
  useEffect(() => {
    console.log(`[useEffect] Fetching entries data for selectedDate: ${selectedDate}`);
    fetchEntriesData(false); // Don't include full data initially, just check existence
  }, [selectedDate]); // Re-fetch when selected date changes
  
  // When todayEntryExists changes, fetch full data if needed
  useEffect(() => {
    console.log(`[useEffect] todayEntryExists changed to: ${todayEntryExists}`);
    
    // If today's entry exists, fetch full entries data for history display
    if (todayEntryExists) {
      fetchEntriesData(true);
    }
  }, [todayEntryExists]);

  const isToday = (dateString: string) => {
    return dateString === todayDate;
  };

  const handleInputChange = (value: string) => {
    const field = steps[currentStep].field as keyof typeof formData;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Focus textarea when step changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentStep]);

  // Handle Enter key in textarea to proceed forward
  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (currentStep === steps.length - 1) {
        if (hasAtLeastOneField()) {
          handleSubmit();
        }
      } else {
        handleNext();
      }
    }
  };


  // Check if at least one field has content
  const hasAtLeastOneField = () => {
    return (formData.rose && formData.rose.trim().length > 0) ||
           (formData.thorn && formData.thorn.trim().length > 0) ||
           (formData.bud && formData.bud.trim().length > 0);
  };

  const handleSubmit = async () => {
    try {
      // First try to create the entry
      let response = await fetch(getEntriesUrl(), {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          ...formData,
          date: selectedDate
        }),
      });

      if (response.status === 409) {
        // Entry already exists, ask user what to do
        const shouldOverwrite = confirm(
          `An entry already exists for ${selectedDate}. Would you like to update it with your new reflection?`
        );
        
        if (shouldOverwrite) {
          // Use upsert endpoint to update existing entry
          response = await fetch(getEntriesUrl('upsert'), {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
              ...formData,
              date: selectedDate
            }),
          });
          
          if (response.ok) {
            window.location.href = '/history';
          }
        } else {
          // User chose not to overwrite, redirect to existing entry
          window.location.href = `/entry/${selectedDate}`;
        }
      } else if (response.ok) {
        window.location.href = '/history';
      } else {
        throw new Error('Failed to save entry');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('There was an error saving your reflection. Please try again.');
    }
  };

  const currentStepData = steps[currentStep];

  // If today's entry exists, show history; otherwise show the form
  if (todayEntryExists) {
    if (historyLoading) {
      return (
        <ProtectedRoute>
          <UserHeader />
          <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100 flex items-center justify-center">
            <div className="text-gray-600" role="status" aria-live="polite">
              Loading your reflections...
            </div>
          </div>
        </ProtectedRoute>
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
                <p className="text-sm text-gray-500 mb-4">
                  You've already completed today's reflection. Here's your history:
                </p>
                <button
                  onClick={() => window.location.href = '/reflection/new'}
                  className="inline-block px-6 py-4 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation min-h-[48px]"
                >
                  Add Reflection
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-12" role="region" aria-label="Empty state">
                  <div className="text-gray-500 mb-4">No reflections yet</div>
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

  // Show the form if no entry exists for today
  return (
    <ProtectedRoute>
      <UserHeader />
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-50 to-blue-100">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-gray-800 mb-2">Daily Reflection</h1>
            <p className="text-gray-600">Take a moment to reflect on your day</p>
            
            <div className="mt-4 mb-4">
              <label htmlFor="date-input" className="block text-sm text-gray-600 mb-2">
                Select date for this reflection:
              </label>
              <div className="relative">
                <input
                  id="date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getLocalDateString()}
                  className={`px-4 py-2 border rounded-full text-gray-700 focus:outline-none focus:ring-2 bg-white transition-colors ${
                    entryExists 
                      ? 'border-amber-300 focus:ring-amber-300' 
                      : 'border-gray-200 focus:ring-purple-300'
                  }`}
                />
                {entryExists && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between text-amber-700 text-sm">
                      <div className="flex items-center">
                        <span className="mr-2">⚠️</span>
                        <span>
                          An entry already exists for this date.
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 text-sm">
                      <Link 
                        href={`/entry/${selectedDate}`}
                        className="underline hover:text-amber-800"
                      >
                        View/Edit entry
                      </Link>
                      {selectedDate === getLocalDateString() && (
                        <>
                          <span>•</span>
                          <Link 
                            href="/history"
                            className="underline hover:text-amber-800"
                          >
                            Go to history
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {hasAnyEntries && (
              <Link href="/history" className="text-purple-600 hover:text-purple-800 text-sm inline-block">
                View previous entries →
              </Link>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-8 mb-6">
            <div className="flex justify-center mb-6">
              <div className="flex space-x-2" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={currentStep} aria-label="Form progress">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-6 h-6 md:w-3 md:h-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation ${
                      index === currentStep 
                        ? 'bg-purple-500' 
                        : index < currentStep 
                          ? 'bg-purple-300' 
                          : 'bg-gray-200'
                    }`}
                    aria-label={`Go to step ${index + 1}: ${step.title}`}
                    aria-current={index === currentStep ? 'step' : undefined}
                  />
                ))}
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-800 mb-2">
                {currentStepData.title}
              </h2>
              <p className="text-gray-600 mb-2">{currentStepData.subtitle}</p>
              <p className="text-sm text-purple-600 italic">
                {currentStepData.encouragement}
              </p>
            </div>

            <div className="mb-8">
              <label htmlFor={`step-${currentStep}-input`} className="sr-only">
                {currentStepData.subtitle}
              </label>
              <textarea
                id={`step-${currentStep}-input`}
                ref={textareaRef}
                value={formData[currentStepData.field as keyof typeof formData]}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={currentStepData.placeholder}
                className="w-full h-32 md:h-32 p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none text-gray-700 placeholder-gray-400 text-base touch-manipulation"
                aria-describedby={`step-${currentStep}-help`}
              />
              <div id={`step-${currentStep}-help`} className="sr-only">
                {currentStepData.encouragement}. Press Enter to proceed to the next step.
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`px-6 py-4 md:py-3 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation min-h-[48px] ${
                  currentStep === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-purple-600 hover:bg-purple-50 active:bg-purple-100'
                }`}
                aria-label="Go to previous step"
              >
                Previous
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-8 py-4 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation min-h-[48px]"
                  aria-label="Go to next step (or press Enter in text field)"
                >
                  Next
                </button>
              ) : (
                <div className="flex flex-col items-end">
                  <button
                    onClick={handleSubmit}
                    disabled={!hasAtLeastOneField()}
                    className={`px-8 py-4 md:py-3 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation min-h-[48px] ${
                      hasAtLeastOneField()
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 active:from-green-700 active:to-blue-700 focus:ring-green-500'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    aria-label="Complete and save reflection (or press Enter in text field)"
                  >
                    Complete Reflection
                  </button>
                  {!hasAtLeastOneField() && (
                    <p className="text-sm text-gray-500 mt-2 text-right">
                      Please fill in at least one field to save your reflection
                    </p>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
