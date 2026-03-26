import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from 'features/auth';
import { db, doc, onSnapshot, setDoc } from 'config/firebase';

export type InteractionType = 'click' | 'input' | 'none';

export interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  hasSeenTour: boolean;
  isLoading: boolean;
}

interface OnboardingContextType extends OnboardingState {
  startTour: () => void;
  endTour: (completed?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeStep: (stepIndex: number) => void;
}

const STORAGE_KEY = 'lasunfry_onboarding_completed';
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthReady } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    isActive: false,
    currentStep: 0,
    hasSeenTour: localStorage.getItem(STORAGE_KEY) === 'true',
    isLoading: true
  });

  // Sync with Firestore
  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const hasSeen = data.hasSeenTour === true;
        setState(prev => ({ ...prev, hasSeenTour: hasSeen, isLoading: false }));
        localStorage.setItem(STORAGE_KEY, String(hasSeen));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  const startTour = useCallback(() => {
    setState(prev => ({ ...prev, isActive: true, currentStep: 0 }));
  }, []);

  const endTour = useCallback(async (completed = false) => {
    setState(prev => ({ ...prev, isActive: false }));
    if (completed) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setState(prev => ({ ...prev, hasSeenTour: true }));
      
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), { hasSeenTour: true }, { merge: true });
        } catch (error) {
          console.error("Failed to save onboarding status to Firebase:", error);
        }
      }
    }
  }, [user]);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const completeStep = useCallback((stepIndex: number) => {
    setState(prev => {
      const lastStepIndex = 7;
      if (prev.isActive && prev.currentStep === stepIndex && prev.currentStep < lastStepIndex) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    // Disabled app tour auto-start per user request
    /*
    if (state.isLoading || !isAuthReady) return;

    if (!state.hasSeenTour && !state.isActive) {
      const timer = setTimeout(() => {
        if (!state.hasSeenTour && !state.isActive) {
          startTour();
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
    */
  }, [state.isActive, state.hasSeenTour, state.isLoading, isAuthReady, startTour]);

  const value = {
    ...state,
    startTour,
    endTour,
    nextStep,
    prevStep,
    goToStep,
    completeStep
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
