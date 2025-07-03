import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPreferences } from '../components/contexts/UserPreferencesContext';
import { useAuthStore } from '../store/useAuthStore';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const AiTutorialPage: React.FC = () => {
  const { preferences, updatePreferences } = useUserPreferences();
  const { user, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (!preferences || !preferences.onboardingCompleted) {
        // If preferences are not set or onboarding not completed, redirect to onboarding
        navigate('/onboarding');
      } else {
        // If preferences are set, redirect to dashboard
        navigate('/dashboard');
      }
    } else if (!authLoading && !user) {
      // If not authenticated, redirect to auth page
      navigate('/auth');
    }
  }, [user, authLoading, preferences, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Loading your AI Tutorial...</h2>
          <p className="text-gray-600">Preparing your personalized learning experience.</p>
        </motion.div>
      </div>
    );
  }

  // This page will primarily handle redirects, so a simple loading/redirect message is sufficient
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AI Tutorial</h1>
      <Card className="p-6">
        <p className="text-gray-600">Redirecting to your personalized AI tutorial experience...</p>
      </Card>
    </div>
  );
};

export default AiTutorialPage;
