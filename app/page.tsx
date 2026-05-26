"use client";
import { useState, useRef, DragEvent } from "react";

// 🔒 Deployed Modal serverless FastAPI endpoint (leading space removed & verified)
const MODAL_URL = process.env.NEXT_PUBLIC_MODAL_BACKEND_URL || "";

interface Result {
  summary: string;
  anonymized_transcript: string;
  raw_transcript: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const steps = [
    "Uploading secure audio packet to Cloud...",
    "Whisper AI transcribing audio waveform...",
    "BERT NLP parsing named entities (Names, Places, Numbers)...",
    "Applying Black Marker redaction protocols...",
    "DistilBART summarizing anonymized transcripts...",
    "Decrypting results payload..."
  ];

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    setResult(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("audio/")) {
        setFile(droppedFile);
      } else {
        setError("Invalid file type. Please upload an audio file (MP3, WAV, M4A).");
      }
    }
  };

  const startStepAnimation = () => {
    setCurrentStep(0);
    let step = 0;
    stepIntervalRef.current = setInterval(() => {
      if (step < steps.length - 1) {
        step += 1;
        setCurrentStep(step);
      }
    }, 2800);
  };

  const stopStepAnimation = () => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an audio file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    startStepAnimation();

    const formData = new FormData();
    formData.append("audio_file", file);

    try {
      const response = await fetch(MODAL_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error ${response.status}: ${errText}`);
      }

      const data: Result = await response.json();
      
      // Polish up the raw/anonymized values to remove extra spacing
      setResult({
        summary: data.summary?.trim() || "No summary generated.",
        anonymized_transcript: data.anonymized_transcript?.trim() || "No audio detected.",
        raw_transcript: data.raw_transcript?.trim() || "No audio detected."
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Unknown network or cold-start error occurred.");
    } finally {
      setLoading(false);
      stopStepAnimation();
    }
  };

  // Helper to format redacted names and identifiers as gorgeous inline badges
  const renderAnonymizedText = (text: string) => {
    if (!text) return "";
    
    // Splits by [REDACTED_...] or general [REDACTED] matches
    const parts = text.split(/(\[REDACTED.*?\])/g);
    
    return parts.map((part, index) => {
      if (part.startsWith("[REDACTED")) {
        return (
          <span
            key={index}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              padding: "1px 6px",
              borderRadius: "4px",
              fontSize: "0.85em",
              fontWeight: 600,
              margin: "0 2px",
              fontFamily: "'JetBrains Mono', monospace",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px"
            }}
          >
            🔒 REDACTED
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="brand-title">🔒 WhisperVault</h1>
        <p className="brand-subtitle">
          Secure, air-gapped machine intelligence pipeline. Upload sensitive audio files to transcribe, redact proprietary info, and generate safe executive summaries.
        </p>
        <div className="badge-container">
          <span className="tech-badge active-gpu">⚡ NVIDIA T4 GPU Active</span>
          <span className="tech-badge">🎙️ Whisper AI</span>
          <span className="tech-badge">🏷️ BERT NER</span>
          <span className="tech-badge">🧠 DistilBART</span>
          <span className="tech-badge">☁️ Modal Serverless</span>
        </div>
      </header>

      {/* Main Form Dashboard */}
      <div className="dashboard-card">
        <div 
          className={`upload-dropzone ${file ? 'has-file' : ''} ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="file-input-hidden"
            accept="audio/*"
            onChange={(e) => {
              setError(null);
              setResult(null);
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
              }
            }}
          />
          <span className="upload-icon">{file ? "✅" : "📥"}</span>
          <p className="upload-text">
            {file ? "Secure Audio Packet Loaded" : "Drag & Drop Audio File Here"}
          </p>
          <p className="upload-subtext">
            {file ? `Ready for decryption & redaction` : "or click to browse filesystem (Supports MP3, WAV, M4A)"}
          </p>
        </div>

        {file && (
          <div className="file-banner">
            <div className="file-info">
              <span className="file-type-icon">🎵</span>
              <div className="file-details">
                <h4>{file.name}</h4>
                <p>{(file.size / (1024 * 1024)).toFixed(2)} MB • Audio Format</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setResult(null);
                setError(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "1.1rem",
                padding: "4px"
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Trigger */}
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="btn-primary"
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Securing & Processing...
            </>
          ) : (
            <>
              ⚡ Initialize Secure Pipeline
            </>
          )}
        </button>

        {/* Dynamic Loading Pipeline */}
        {loading && (
          <div className="loading-box">
            <div className="loading-header">
              <div className="loading-spinner"></div>
              <h4 style={{ fontFamily: "'Outfit', sans-serif" }}>Secure Processing Pipeline Active</h4>
            </div>
            <div className="loading-steps">
              {steps.map((step, index) => {
                let statusClass = "";
                if (index < currentStep) statusClass = "completed";
                else if (index === currentStep) statusClass = "active";
                
                return (
                  <div key={index} className={`step-item ${statusClass}`}>
                    <span className="step-dot"></span>
                    <span style={{ 
                      textDecoration: index < currentStep ? "line-through" : "none",
                      opacity: index < currentStep ? 0.5 : 1,
                      color: index === currentStep ? "#a5b4fc" : undefined
                    }}>{step}</span>
                  </div>
                );
              })}
            </div>
            <div className="step-note">
              <span>💡</span>
              <em>First run/cold starts allocate the GPU and load weights (approx. 30s). Future runs take only 2-3s.</em>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-alert">
            <span className="error-alert-icon">⚠️</span>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>Pipeline Error Encountered</strong>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Results Outputs */}
      {result && (
        <div className="results-section">
          {/* Executive Summary Card */}
          <div className="summary-card">
            <h3 className="summary-title">🧠 Safe Executive Summary</h3>
            <p className="summary-text">{result.summary}</p>
          </div>

          {/* Comparative Transcripts Grid */}
          <div className="transcripts-grid">
            {/* Raw Transcript (Left) */}
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <span className="terminal-title">🎙️ Raw Transcript (Unsecured)</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>LOG_001</span>
              </div>
              <div className="terminal-body" style={{ color: "#f87171" }}>
                {result.raw_transcript}
              </div>
            </div>

            {/* Anonymized Transcript (Right) */}
            <div className="terminal-window security-alert-text">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <span className="terminal-title" style={{ color: "#34d399" }}>🔒 Safe Anonymized Transcript</span>
                <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600 }}>SECURED</span>
              </div>
              <div className="terminal-body">
                {renderAnonymizedText(result.anonymized_transcript)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}