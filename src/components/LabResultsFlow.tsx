"use client";

import { Camera, FileText, Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ErrorBanner, ErrorState } from "@/components/AppStates";
import { LabResultAnalysis } from "@/components/LabResultAnalysis";
import { LabResultHistory } from "@/components/LabResultHistory";
import { useHomeViewModeContext } from "@/components/HomeViewModeContext";
import { useLanguage } from "@/components/LanguageProvider";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useFamilyConnection } from "@/hooks/useFamilyConnection";
import { useSlowConnection } from "@/hooks/useSlowConnection";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  fileWithResolvedType,
  isAcceptedLabFile,
  isHeicFile,
  resolveLabFileType,
} from "@/lib/lab-file";
import {
  type LabAnalysisResult,
  type LabResultRecord,
} from "@/types/lab-results";
import { createClient } from "@/lib/supabase/client";

type FlowStep = "upload" | "analyzing" | "results" | "error";

type AnalyzeLabErrorResponse = {
  error?: string;
  code?: "unreadable" | "unavailable" | "not_configured" | "unsupported" | "rate_limit";
};

export function LabResultsFlow() {
  const { t } = useLanguage();
  const { mode, hasFamilyConnection } = useHomeViewModeContext();
  const { connection } = useFamilyConnection();
  const isFamilyView =
    mode === "family" && hasFamilyConnection && connection.connected;
  const historyEndpoint = isFamilyView
    ? "/api/family-dashboard/lab-results"
    : "/api/lab-results";
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generalInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [step, setStep] = useState<FlowStep>("upload");
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResult | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const isAnalyzingSlow = useSlowConnection(step === "analyzing");

  useEffect(() => {
    setStep("upload");
    setAnalysisResult(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage("");
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setHistoryRefreshKey((current) => current + 1);
  }, [isFamilyView]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (step !== "analyzing") return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step]);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isHeicFile(file)) {
      setErrorMessage(t("lab.heicUnsupported"));
      setStep("error");
      event.target.value = "";
      return;
    }

    if (!isAcceptedLabFile(file)) {
      setErrorMessage(t("lab.invalidFile"));
      setStep("error");
      event.target.value = "";
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    const normalized = fileWithResolvedType(file);
    setSelectedFile(normalized);
    setStep("upload");
    setErrorMessage("");

    if (normalized.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(normalized);
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }

    event.target.value = "";
  }

  function openHistoryResult(record: LabResultRecord) {
    setAnalysisResult({ analysis: record.ai_analysis });
    setStep("results");
  }

  async function analyzeFile(file: File) {
    setStep("analyzing");
    setErrorMessage(t("lab.unavailable"));

    try {
      const normalized = fileWithResolvedType(file);
      const filePath = await uploadLabResult(normalized);

      const formData = new FormData();
      formData.append("file", normalized);
      formData.append("file_url", filePath);
      const mediaType = resolveLabFileType(normalized);
      if (mediaType) {
        formData.append("media_type", mediaType);
      }

      const response = await fetchWithTimeout("/api/analyze-lab", {
        method: "POST",
        body: formData,
        timeoutMs: 120_000,
      });

      const payload = (await response.json()) as
        | LabAnalysisResult
        | AnalyzeLabErrorResponse;

      if (!response.ok) {
        const errorPayload = payload as AnalyzeLabErrorResponse;
        setErrorMessage(
          errorPayload.error ??
            (errorPayload.code === "not_configured"
              ? t("lab.notConfigured")
              : errorPayload.code === "rate_limit"
                ? errorPayload.error ?? t("lab.unavailable")
              : errorPayload.code === "unreadable"
                ? t("lab.unreadable")
                : t("lab.unavailable")),
        );
        setStep("error");
        return;
      }

      setAnalysisResult(payload as LabAnalysisResult);
      setHistoryRefreshKey((current) => current + 1);
      setStep("results");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("signed in")
      ) {
        setErrorMessage(t("lab.loginRequired"));
      } else {
        setErrorMessage(t("lab.unavailable"));
      }
      setStep("error");
    }
  }

  if (step === "analyzing") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <main className="mx-auto flex w-full max-w-app flex-1 flex-col items-center justify-center px-5 py-12">
          <div
            className="flex flex-col items-center text-center"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="h-14 w-14 animate-spin text-primary"
              strokeWidth={2}
              aria-hidden="true"
            />
            <p className="mt-6 text-2xl font-semibold text-foreground">
              {t("lab.analyzing")}
            </p>
            <p className="mt-2 text-lg text-muted">{t("lab.analyzingHint")}</p>
            {isAnalyzingSlow ? (
              <SlowConnectionNotice message={t("lab.slowHint")} />
            ) : null}
          </div>
        </main>
      </div>
    );
  }

  if (step === "results") {
    return analysisResult ? <LabResultAnalysis result={analysisResult} /> : null;
  }

  if (step === "error") {
    return (
      <>
        <ErrorBanner
          message={errorMessage}
          actionLabel={t("common.retry")}
          onAction={() =>
            selectedFile ? void analyzeFile(selectedFile) : setStep("upload")
          }
        />
        <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
          <ErrorState
            message={t("lab.errorTitle")}
            onRetry={() =>
              selectedFile ? void analyzeFile(selectedFile) : setStep("upload")
            }
          />
        </main>
      </>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      {!isFamilyView ? (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={handleFileSelect}
            aria-hidden="true"
            tabIndex={-1}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf"
            className="sr-only"
            onChange={handleFileSelect}
            aria-hidden="true"
            tabIndex={-1}
          />
          <input
            ref={generalInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf"
            className="sr-only"
            onChange={handleFileSelect}
            aria-hidden="true"
            tabIndex={-1}
          />

          <button
            type="button"
            onClick={() => generalInputRef.current?.click()}
            className="noor-card flex min-h-[200px] w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center transition-colors hover:bg-primary-light active:scale-[0.99]"
            aria-label={t("lab.uploadLabel")}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary"
              aria-hidden="true"
            >
              <FileText size={34} strokeWidth={2.2} />
            </div>
            <div>
              <p className="heading-lg leading-tight">{t("lab.uploadTitle")}</p>
              <p className="text-body mt-2 text-muted">{t("lab.uploadHint")}</p>
            </div>
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="btn-touch noor-card flex flex-col items-center justify-center gap-2 px-3 py-4 text-base font-semibold text-foreground transition-colors hover:border-primary/30"
            >
              <Camera size={24} className="text-primary" aria-hidden="true" />
              {t("lab.takePhoto")}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-touch noor-card flex flex-col items-center justify-center gap-2 px-3 py-4 text-base font-semibold text-foreground transition-colors hover:border-primary/30"
            >
              <FileText size={24} className="text-primary" aria-hidden="true" />
              {t("lab.chooseFile")}
            </button>
          </div>

          {selectedFile && (
            <section className="noor-card mt-6 p-4">
              <div className="overflow-hidden rounded-2xl bg-background">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={t("lab.previewAlt")}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-3 text-primary">
                    <FileText size={56} strokeWidth={2} aria-hidden="true" />
                    <p className="text-lg font-bold text-foreground">
                      {t("lab.pdfSelected")}
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-3 break-words text-base font-semibold text-foreground">
                {selectedFile.name}
              </p>

              <button
                type="button"
                onClick={() => analyzeFile(selectedFile)}
                className="btn-primary mt-4 w-full"
              >
                {t("lab.analyzeNow")}
              </button>

              <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-muted">
                <Lock size={16} className="shrink-0 text-primary" aria-hidden="true" />
                {t("lab.privacy")}
              </p>
            </section>
          )}
        </>
      ) : (
        <p className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-muted">
          {connection.displayLabel} kann ihre Befunde selbst hochladen
        </p>
      )}

      <LabResultHistory
        refreshKey={historyRefreshKey}
        onSelect={openHistoryResult}
        resultsEndpoint={historyEndpoint}
      />
    </main>
  );
}

async function uploadLabResult(file: File) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User must be signed in to upload lab results.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const filePath = `${user.id}/${today}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const contentType = resolveLabFileType(file) ?? file.type ?? "application/octet-stream";
  const { error } = await supabase.storage
    .from("lab-results")
    .upload(filePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return filePath;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}
