import { create } from 'zustand';
import { UserData } from '../types';
import { getCurrentUser, signIn, signOut, signUp, resetPassword as resetPasswordRequest, updatePassword, resendVerificationEmail as resendEmailRequest, getApiKey, saveApiKey } from '../services/supabase';
import geminiService from '../services/geminiService';
import slideService from '../services/slideService';

interface AuthState {
  user: UserData | null;
  isLoading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  geminiApiKey: string | null; // Added geminiApiKey to state

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, mobileNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  updateGeminiApiKey: (apiKey: string) => Promise<void>; // Added updateGeminiApiKey action
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isLoggedIn: false,
  geminiApiKey: null, // Initialize geminiApiKey

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signIn(email, password);

      if (error) throw error;

      if (data?.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          throw new Error('Please verify your email before signing in');
        }

        const { data: userData } = await getCurrentUser();
        if (userData?.user) {
          set({
            user: userData.user,
            isLoggedIn: true,
          });
          // Load API key and initialize services after successful login
          await get().loadApiKey(userData.user.id);
        }
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to login' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName, mobileNumber) => {
    set({ isLoading: true, error: null });
    try {
      const data = await signUp(email, password, fullName, mobileNumber);

      if (data?.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            emailConfirmed: false,
            profile: {
              id: '',
              fullName,
              mobileNumber,
              countryCode: 'IN',
              countryName: 'India',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          isLoggedIn: false,
        });
      } else {
        throw new Error('Registration failed - no user data returned');
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to register' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await signOut();
      set({ user: null, isLoggedIn: false, geminiApiKey: null }); // Clear API key on logout
      // Reset services on logout
      geminiService.initialize(''); // Re-initialize with empty key or null
      slideService.initialize(''); // Re-initialize with empty key or null
    } catch (error: any) {
      set({ error: error.message || 'Failed to logout' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await getCurrentUser();

      if (error) {
        if (error.status === 403 || error.message?.includes('user_not_found')) {
          await get().logout();
          return;
        }
        throw error;
      }

      if (data?.user) {
        set({
          user: data.user,
          isLoggedIn: true,
        });
        // Load API key and initialize services for the loaded user
        await get().loadApiKey(data.user.id);
      } else {
        await get().logout();
      }
    } catch (error: any) {
      set({ user: null, isLoggedIn: false, geminiApiKey: null });
    } finally {
      set({ isLoading: false });
    }
  },

  // New action to load API key and initialize services
  loadApiKey: async (userId: string) => {
    try {
      const key = await getApiKey(userId);
      set({ geminiApiKey: key });
      if (key) {
        geminiService.initialize(key);
        slideService.initialize(key);
      } else {
        // If no API key, ensure services are not initialized with old key
        geminiService.initialize('');
        slideService.initialize('');
      }
    } catch (error: any) {
      console.error('Failed to load API key:', error);
      set({ error: error.message || 'Failed to load API key' });
    }
  },

  // New action to update API key
  updateGeminiApiKey: async (newApiKey: string) => {
    const { user } = get();
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await saveApiKey(user.id, newApiKey);
      set({ geminiApiKey: newApiKey });
      geminiService.initialize(newApiKey);
      slideService.initialize(newApiKey);
    } catch (error: any) {
      set({ error: error.message || 'Failed to update API key' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await resetPasswordRequest(email);
      if (error) throw error;
      set({ error: 'Password reset link sent to your email' });
    } catch (error: any) {
      set({ error: error.message || 'Failed to send reset link' });
    } finally {
      set({ isLoading: false });
    }
  },

  resendVerificationEmail: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await resendEmailRequest(email);
      if (error) throw error;
      set({ error: 'Verification email resent successfully!' });
    } catch (error: any) {
      set({ error: error.message || 'Failed to resend verification email' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateUserPassword: async (newPassword) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      set({ error: 'Password updated successfully!' });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update password' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
