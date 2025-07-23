'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString } from '@/lib/dateUtils';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const processedRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent multiple executions (React Strict Mode, re-renders, etc.)
    if (processedRef.current || isProcessing) {
      return;
    }

    const token = searchParams.get('token');

    if (token) {
      processedRef.current = true;
      setIsProcessing(true);

      // Store token temporarily and fetch user profile from secure endpoint
      const fetchUserProfile = async () => {
        try {
          console.log('Fetching user profile for auth token...');

          // Store token temporarily in localStorage
          localStorage.setItem('token', token);

          // Fetch user profile from secure backend endpoint
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const user = await response.json();
          console.log('User profile fetched successfully, logging in...');

          // Login with verified user data from backend
          login(token, user);

          // Redirect to main page after login
          router.push('/');
        } catch (error) {
          console.error('Error processing auth token:', error);
          // Remove invalid token
          localStorage.removeItem('token');
          setError('Failed to process authentication. Please try again.');
          setIsProcessing(false);
          processedRef.current = false;
        }
      };

      fetchUserProfile();
    } else {
      setError('No authentication token received. Please try logging in again.');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-green-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-200">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">⚠️ Authentication Error</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button onClick={() => router.push('/login')} className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors duration-200">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-green-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Completing authentication...</p>
            {isProcessing && <p className="text-sm text-gray-500 mt-2">Fetching your profile...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
