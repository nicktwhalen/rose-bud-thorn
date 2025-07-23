'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getLocalDateString } from '@/lib/dateUtils';
import { useEntryExists } from '@/hooks/useEntryExists';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserHeader from '@/components/UserHeader';
import { useAuth } from '@/contexts/AuthContext';
import { getEntriesUrl, getAuthHeaders } from '@/lib/api';

export default function NewReflection() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [formData, setFormData] = useState({
    rose: '',
    thorn: '',
    bud: '',
  });

  const { exists: entryExists } = useEntryExists(selectedDate);
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clear form data when an entry exists for the selected date
  useEffect(() => {
    if (entryExists) {
      setFormData({
        rose: '',
        thorn: '',
        bud: '',
      });
      setCurrentStep(0); // Reset to first step
    }
  }, [entryExists]);

  const steps = [
    {
      title: '🌹 Your Rose',
      subtitle: 'What was the best part of your day?',
      field: 'rose',
      placeholder: 'Share something that made you smile today...',
      encouragement: "Every day has something beautiful, even if it's small",
    },
    {
      title: '🌿 Your Thorn',
      subtitle: 'What was challenging today?',
      field: 'thorn',
      placeholder: "It's okay to acknowledge the tough moments...",
      encouragement: 'Challenges help us grow and become stronger',
    },
    {
      title: '🌸 Your Bud',
      subtitle: 'What are you looking forward to tomorrow?',
      field: 'bud',
      placeholder: 'What gives you hope for tomorrow?',
      encouragement: 'Tomorrow holds new possibilities and opportunities',
    },
  ];

  const handleInputChange = (value: string) => {
    if (entryExists) return; // Prevent input when entry exists
    const field = steps[currentStep].field as keyof typeof formData;
    setFormData((prev) => ({ ...prev, [field]: value }));
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
    return (formData.rose && formData.rose.trim().length > 0) || (formData.thorn && formData.thorn.trim().length > 0) || (formData.bud && formData.bud.trim().length > 0);
  };

  const handleSubmit = async () => {
    try {
      // First try to create the entry
      let response = await fetch(getEntriesUrl(), {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          ...formData,
          date: selectedDate,
        }),
      });

      if (response.status === 409) {
        // Entry already exists, ask user what to do
        const shouldOverwrite = confirm(`An entry already exists for ${selectedDate}. Would you like to update it with your new reflection?`);

        if (shouldOverwrite) {
          // Use upsert endpoint to update existing entry
          response = await fetch(getEntriesUrl('upsert'), {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
              ...formData,
              date: selectedDate,
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
                    className={`px-4 py-2 border rounded-full text-gray-700 focus:outline-none focus:ring-2 bg-white transition-colors ${entryExists ? 'border-amber-300 focus:ring-amber-300' : 'border-gray-200 focus:ring-purple-300'}`}
                  />
                  {entryExists && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between text-amber-700 text-sm">
                        <div className="flex items-center">
                          <span className="mr-2">⚠️</span>
                          <span>An entry already exists for this date.</span>
                        </div>
                        <Link href={`/entry/${selectedDate}`} className="underline hover:text-amber-800">
                          View entry
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-8 mb-6">
              <div className="flex justify-center mb-6">
                <div className="flex space-x-2" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={currentStep} aria-label="Form progress">
                  {steps.map((step, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      disabled={entryExists}
                      className={`w-6 h-6 md:w-3 md:h-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation ${
                        entryExists ? 'bg-gray-200 cursor-not-allowed' : index === currentStep ? 'bg-purple-500' : index < currentStep ? 'bg-purple-300' : 'bg-gray-200'
                      }`}
                      aria-label={`Go to step ${index + 1}: ${step.title}`}
                      aria-current={index === currentStep ? 'step' : undefined}
                    />
                  ))}
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-light text-gray-800 mb-2">{currentStepData.title}</h2>
                <p className="text-gray-600 mb-2">{currentStepData.subtitle}</p>
                {!entryExists && <p className="text-sm text-purple-600 italic">{currentStepData.encouragement}</p>}
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
                  placeholder={entryExists ? 'Please change the date above to create a new reflection' : currentStepData.placeholder}
                  disabled={entryExists}
                  className={`w-full h-32 md:h-32 p-4 border-none rounded-2xl resize-none text-base touch-manipulation ${
                    entryExists ? 'bg-gray-100 text-gray-400 placeholder-gray-400 cursor-not-allowed' : 'bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-700 placeholder-gray-400'
                  }`}
                  aria-describedby={`step-${currentStep}-help`}
                />
                <div id={`step-${currentStep}-help`} className="sr-only">
                  {currentStepData.encouragement}. Press Enter to proceed to the next step.
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0 || entryExists}
                  className={`px-6 py-4 md:py-3 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation min-h-[48px] ${
                    currentStep === 0 || entryExists ? 'text-gray-400 cursor-not-allowed' : 'text-purple-600 hover:bg-purple-50 active:bg-purple-100'
                  }`}
                  aria-label="Go to previous step"
                >
                  Previous
                </button>

                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={entryExists}
                    className={`px-8 py-4 md:py-3 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation min-h-[48px] ${
                      entryExists ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 focus:ring-purple-500'
                    }`}
                    aria-label="Go to next step (or press Enter in text field)"
                  >
                    Next
                  </button>
                ) : (
                  <div className="flex flex-col items-end">
                    <button
                      onClick={handleSubmit}
                      disabled={!hasAtLeastOneField() || entryExists}
                      className={`px-8 py-4 md:py-3 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation min-h-[48px] ${
                        hasAtLeastOneField() && !entryExists
                          ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 active:from-green-700 active:to-blue-700 focus:ring-green-500'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      aria-label="Complete and save reflection (or press Enter in text field)"
                    >
                      Complete Reflection
                    </button>
                    {!hasAtLeastOneField() && !entryExists && <p className="text-sm text-gray-500 mt-2 text-right">Please fill in at least one field to save your reflection</p>}
                    {entryExists && <p className="text-sm text-gray-500 mt-2 text-right">Please change the date above to create a new reflection</p>}
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
