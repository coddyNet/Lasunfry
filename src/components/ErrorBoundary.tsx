import React, { Component, ReactNode, ErrorInfo } from 'react';
import { X } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let isQuotaError = false;

      try {
        const errorData = JSON.parse(this.state.error?.message || "{}");
        if (errorData.error?.includes("Quota exceeded")) {
          isQuotaError = true;
          errorMessage = "Firestore quota exceeded. Please try again tomorrow.";
        } else if (errorData.error?.includes("Missing or insufficient permissions")) {
          errorMessage = "Permission denied. Please check if you are logged in correctly.";
        } else if (errorData.error?.includes("The query requires an index")) {
          errorMessage = "This query requires a Firestore index. Please wait for the developer to create it.";
        } else {
          errorMessage = errorData.error || this.state.error?.message || errorMessage;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light p-6 text-center dark:bg-background-dark">
          <div className="max-w-md space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isQuotaError ? "Quota Exceeded" : "Something went wrong"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-google-blue px-6 py-2 text-sm font-bold text-white hover:bg-google-blue/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
