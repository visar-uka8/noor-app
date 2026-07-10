"use client";

import { Component, type ReactNode } from "react";
import { ConnectionErrorState } from "@/components/AppStates";

type MedicationErrorBoundaryProps = {
  children: ReactNode;
};

type MedicationErrorBoundaryState = {
  error: Error | null;
};

export class MedicationErrorBoundary extends Component<
  MedicationErrorBoundaryProps,
  MedicationErrorBoundaryState
> {
  state: MedicationErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Medication page render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
          <ConnectionErrorState
            onRetry={() => this.setState({ error: null })}
          />
          <p
            className="mt-4 rounded-2xl border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {this.state.error.message}
          </p>
        </main>
      );
    }

    return this.props.children;
  }
}
