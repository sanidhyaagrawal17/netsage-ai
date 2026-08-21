// ==========================================================================
// NetSage AI — Netrion-Inspired Minimalist Command Center Client
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // State
  let currentMode = "live"; // "live" | "guided"
  let allCases = [];
  let currentCase = {
    case_id: "LIVE-PT-SESSION",
    symptom: "Capturing live network anomaly from your active Cisco Packet Tracer terminal...",
    topology_note: "Cisco Packet Tracer live lab session.",
    show_outputs: "",
    osi_layer: "Auto-Detect",
    severity: "Active",
    concept_tag: "live_packet_tracer",
  };
  let latestDiagnosis = null;
  let lastLiveContent = "";

  // DOM Elements
  const htmlDoc = document.documentElement;
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");

  const btnModeLive = document.getElementById("btn-mode-live");
  const btnModeGuided = document.getElementById("btn-mode-guided");
  const guidedBar = document.getElementById("guided-bar");
  const filterLayer = document.getElementById("filter-layer");
  const selectCase = document.getElementById("select-case");

  const liveCapsule = document.getElementById("live-capsule");
  const capsuleText = document.getElementById("capsule-text");
  const capsuleTime = document.getElementById("capsule-time");

  const caseBadge = document.getElementById("case-badge");
  const diagStatusBadge = document.getElementById("diag-status-badge");
  const symptomText = document.getElementById("symptom-text");
  const topologyText = document.getElementById("topology-text");
  const cliTextarea = document.getElementById("cli-textarea");
  const btnClearCli = document.getElementById("btn-clear-cli");
  const btnCopyCli = document.getElementById("btn-copy-cli");
  const btnDiagnose = document.getElementById("btn-diagnose");

  const aiEmptyState = document.getElementById("ai-empty-state");
  const aiDiagnosisContent = document.getElementById("ai-diagnosis-content");
  const aiRootCause = document.getElementById("ai-root-cause");
  const layerBadge = document.getElementById("layer-badge");
  const aiConfidence = document.getElementById("ai-confidence");
  const aiEvidenceText = document.getElementById("ai-evidence-text");
  const fixStepsList = document.getElementById("fix-steps-list");
  const verifyCommandsList = document.getElementById("verify-commands-list");
  const btnCopyAllFixes = document.getElementById("btn-copy-all-fixes");

  const btnAcceptFix = document.getElementById("btn-accept-fix");
  const btnEditFix = document.getElementById("btn-edit-fix");
  const btnReportFix = document.getElementById("btn-report-fix");

  // Modals
  const modalAdjust = document.getElementById("modal-adjust");
  const modalEditTextarea = document.getElementById("modal-edit-textarea");
  const modalEditNotes = document.getElementById("modal-edit-notes");
  const btnCloseEdit = document.getElementById("btn-close-edit");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const btnSaveEdit = document.getElementById("btn-save-edit");

  const modalReport = document.getElementById("modal-report");
  const modalReportCategory = document.getElementById("modal-report-category");
  const modalReportNotes = document.getElementById("modal-report-notes");
  const btnCloseReport = document.getElementById("btn-close-report");
  const btnCancelReport = document.getElementById("btn-cancel-report");
  const btnSaveReport = document.getElementById("btn-save-report");

  // Bottom Telemetry Elements
  const statLatency = document.getElementById("stat-latency");
  const statThroughput = document.getElementById("stat-throughput");
  const statTokens = document.getElementById("stat-tokens");
  const statRam = document.getElementById("stat-ram");
  const rulesSummary = document.getElementById("rules-summary");

  // ------------------------------------------------------------------------
  // 1. Instant Zero-Lag Theme Switcher
  // ------------------------------------------------------------------------
  function setTheme(theme) {
    htmlDoc.setAttribute("data-theme", theme);
    localStorage.setItem("netsage_theme", theme);
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  const savedTheme = localStorage.getItem("netsage_theme") || "dark";
  setTheme(savedTheme);

  themeToggleBtn.addEventListener("click", () => {
    const current = htmlDoc.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  });

  // ------------------------------------------------------------------------
  // 2. Mode Switching (Live Feed vs Guided Cases)
  // ------------------------------------------------------------------------
  btnModeLive.addEventListener("click", () => {
    currentMode = "live";
    btnModeLive.classList.add("active");
    btnModeGuided.classList.remove("active");
    guidedBar.classList.add("hidden");

    caseBadge.textContent = "LIVE PT SESSION";
    caseBadge.className = "pill-badge pill-live";
    symptomText.textContent = "Capturing live network anomaly from your active Cisco Packet Tracer terminal...";
    topologyText.textContent = "Cisco Packet Tracer live lab session.";
    fetchLiveBuffer(true);
  });

  btnModeGuided.addEventListener("click", () => {
    currentMode = "guided";
    btnModeGuided.classList.add("active");
    btnModeLive.classList.remove("active");
    guidedBar.classList.remove("hidden");

    if (allCases.length === 0) {
      loadCases();
    } else {
      applySelectedCase();
    }
  });

  // ------------------------------------------------------------------------
  // 3. Load & Filter Practice Cases
  // ------------------------------------------------------------------------
  async function loadCases() {
    try {
      const res = await fetch("/api/cases");
      allCases = await res.json();
      populateCaseDropdown();
    } catch (e) {
      console.error("Error loading cases:", e);
    }
  }

  function populateCaseDropdown() {
    const layer = filterLayer.value;
    const filtered = layer === "All" ? allCases : allCases.filter(c => c.osi_layer === layer);
    
    selectCase.innerHTML = "";
    filtered.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.case_id;
      opt.textContent = `${c.case_id} [${c.osi_layer}]: ${c.symptom.substring(0, 50)}...`;
      selectCase.appendChild(opt);
    });

    if (filtered.length > 0) {
      applySelectedCase();
    }
  }

  function applySelectedCase() {
    const cid = selectCase.value;
    const found = allCases.find(c => c.case_id === cid);
    if (!found) return;

    currentCase = { ...found };
    caseBadge.textContent = currentCase.case_id;
    caseBadge.className = "pill-badge pill-neutral";
    symptomText.textContent = currentCase.symptom;
    topologyText.textContent = currentCase.topology_note || "No topology note.";
    cliTextarea.value = currentCase.show_outputs || "";

    resetDiagnosisView();
  }

  filterLayer.addEventListener("change", populateCaseDropdown);
  selectCase.addEventListener("change", applySelectedCase);

  // ------------------------------------------------------------------------
  // 4. Live Packet Tracer Buffer Poller
  // ------------------------------------------------------------------------
  async function fetchLiveBuffer(forceUpdate = false) {
    try {
      const res = await fetch("/api/live");
      const data = await res.json();

      if (data.exists && data.is_fresh) {
        liveCapsule.className = "status-capsule capsule-active";
        capsuleText.textContent = "Packet Tracer Sync: Active";
        capsuleTime.textContent = `${data.age_sec}s ago`;

        if (currentMode === "live") {
          if (forceUpdate || data.content !== lastLiveContent) {
            lastLiveContent = data.content;
            currentCase.show_outputs = data.content;
            cliTextarea.value = data.content;
          }
        }
      } else {
        liveCapsule.className = "status-capsule";
        capsuleText.textContent = "Packet Tracer Standby";
        capsuleTime.textContent = data.mtime ? data.mtime : "Idle";

        if (currentMode === "live" && forceUpdate && !cliTextarea.value) {
          cliTextarea.value = "# Waiting for Packet Tracer CLI capture...\n# 1. Start 'python pt_listener.py' in a terminal.\n# 2. Copy any show-command output in Packet Tracer.";
        }
      }
    } catch (e) {
      console.error("Live poll error:", e);
    }
  }

  setInterval(() => {
    if (currentMode === "live") fetchLiveBuffer(false);
  }, 1200);

  fetchLiveBuffer(true);

  // ------------------------------------------------------------------------
  // 5. Terminal Utility Buttons (Clear & Copy)
  // ------------------------------------------------------------------------
  btnClearCli.addEventListener("click", () => {
    cliTextarea.value = "";
    cliTextarea.focus();
  });

  btnCopyCli.addEventListener("click", () => {
    if (!cliTextarea.value) return;
    navigator.clipboard.writeText(cliTextarea.value);
    btnCopyCli.textContent = "Copied!";
    setTimeout(() => { btnCopyCli.textContent = "Copy"; }, 1500);
  });

  // Keyboard shortcut: Ctrl + Enter
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      btnDiagnose.click();
    }
  });

  // ------------------------------------------------------------------------
  // 6. Diagnostic Execution
  // ------------------------------------------------------------------------
  btnDiagnose.addEventListener("click", async () => {
    const rawCli = cliTextarea.value.trim();
    if (!rawCli || rawCli.startsWith("# Waiting")) {
      alert("Please paste or copy some Cisco CLI show-output first!");
      return;
    }

    btnDiagnose.disabled = true;
    btnDiagnose.innerHTML = `<span class="btn-icon-symbol">⏳</span> <span class="btn-text">Diagnosing Fault...</span>`;
    diagStatusBadge.textContent = "ANALYZING...";
    diagStatusBadge.className = "pill-badge pill-live";

    const payload = {
      case_id: currentMode === "live" ? "LIVE-PT-SESSION" : currentCase.case_id,
      symptom: currentCase.symptom,
      topology_note: currentCase.topology_note || "",
      show_outputs: rawCli,
      osi_layer: currentCase.osi_layer || "Network",
      severity: currentCase.severity || "Medium",
      concept_tag: currentCase.concept_tag || "cli_capture",
      model_name: "qwen2.5-coder:3b",
    };

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      latestDiagnosis = data;
      renderDiagnosis(data);
    } catch (e) {
      alert("Diagnostic error: " + e.message);
      diagStatusBadge.textContent = "ERROR";
    } finally {
      btnDiagnose.disabled = false;
      btnDiagnose.innerHTML = `<span class="btn-icon-symbol">⚡</span> <span class="btn-text">Run Diagnostic Engine</span> <span class="btn-shortcut">Ctrl + Enter</span>`;
    }
  });

  function resetDiagnosisView() {
    aiEmptyState.classList.remove("hidden");
    aiDiagnosisContent.classList.add("hidden");
    diagStatusBadge.textContent = "STANDBY";
    diagStatusBadge.className = "pill-badge pill-neutral";
  }

  function renderDiagnosis(data) {
    const diag = data.diagnosis || {};
    const findings = data.deterministic_findings || [];
    const tel = diag.telemetry || {};

    aiEmptyState.classList.add("hidden");
    aiDiagnosisContent.classList.remove("hidden");
    diagStatusBadge.textContent = "DIAGNOSED";
    diagStatusBadge.className = "pill-badge pill-live";

    // Root Cause & Metrics
    aiRootCause.textContent = diag.root_cause || "Anomaly detected in network configuration.";
    layerBadge.textContent = diag.osi_layer || currentCase.osi_layer || "Layer 3";
    aiConfidence.textContent = `${Math.round((diag.confidence_score || 0.9) * 100)}% Conf`;

    // Evidence
    aiEvidenceText.textContent = diag.cli_evidence_quote || "No specific line quoted.";

    // Remediation Steps
    fixStepsList.innerHTML = "";
    const fixes = diag.fix_steps || [];
    fixes.forEach((step, idx) => {
      const item = document.createElement("div");
      item.className = "step-card";
      item.innerHTML = `
        <div class="step-left">
          <span class="step-num">${idx + 1}</span>
          <span class="step-cmd">${escapeHtml(step)}</span>
        </div>
        <button class="btn-copy-chip btn-copy-step" data-code="${escapeHtml(step)}">Copy</button>
      `;
      fixStepsList.appendChild(item);
    });

    // Copy Step Listeners
    document.querySelectorAll(".btn-copy-step").forEach(btn => {
      btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-code");
        navigator.clipboard.writeText(text);
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 1400);
      });
    });

    // Copy All Fixes Button
    btnCopyAllFixes.onclick = () => {
      if (fixes.length > 0) {
        navigator.clipboard.writeText(fixes.join("\n"));
        btnCopyAllFixes.textContent = "Copied All!";
        setTimeout(() => { btnCopyAllFixes.textContent = "Copy All"; }, 1500);
      }
    };

    // Verification Commands
    verifyCommandsList.innerHTML = "";
    const vcmds = diag.verification_commands || [];
    if (vcmds.length === 0) {
      verifyCommandsList.innerHTML = `<span class="verify-item" style="color: var(--text-muted);">No verification commands specified.</span>`;
    } else {
      vcmds.forEach(v => {
        const p = document.createElement("div");
        p.className = "verify-item";
        p.textContent = v;
        verifyCommandsList.appendChild(p);
      });
    }

    // Telemetry Update
    statLatency.textContent = `${(tel.inference_time_ms || 0).toFixed(1)} ms`;
    statThroughput.textContent = `${(tel.tokens_per_second || 0).toFixed(1)} t/s`;
    statTokens.textContent = `${tel.output_tokens || 0}`;
    statRam.textContent = `${(tel.process_ram_mb || 0).toFixed(1)} MB`;
    rulesSummary.textContent = `Rules Triggered: ${findings.length}`;
  }

  // ------------------------------------------------------------------------
  // 7. Human-in-the-Loop Review Actions
  // ------------------------------------------------------------------------
  async function submitReview(decision, failureCat, fixStepsText, notes) {
    if (!latestDiagnosis) return;
    const diag = latestDiagnosis.diagnosis || {};

    const reviewPayload = {
      case_id: currentMode === "live" ? "LIVE-PT-SESSION" : currentCase.case_id,
      osi_layer: diag.osi_layer || currentCase.osi_layer || "Network",
      severity: currentCase.severity || "Medium",
      concept_tag: currentCase.concept_tag || "general",
      model_used: "qwen2.5-coder:3b",
      is_simulated: diag._is_simulated || true,
      decision: decision,
      failure_category: failureCat,
      root_cause: diag.root_cause || "Reviewed diagnosis",
      fix_steps: fixStepsText,
      rule_agreement: diag.deterministic_agreement !== false,
      engineer_notes: notes,
      telemetry: diag.telemetry || {},
    };

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewPayload),
      });
      alert(`✓ Review Logged: ${decision}`);
      diagStatusBadge.textContent = decision.toUpperCase();
      diagStatusBadge.className = decision === "Accepted" ? "pill-badge pill-live" : "pill-badge pill-neutral";
    } catch (e) {
      alert("Error submitting review: " + e.message);
    }
  }

  btnAcceptFix.addEventListener("click", () => {
    if (!latestDiagnosis) return;
    const fixes = (latestDiagnosis.diagnosis.fix_steps || []).join("\n");
    submitReview("Accepted", "None / Valid AI Diagnosis", fixes, "Student approved fix.");
  });

  // Adjust Modal
  btnEditFix.addEventListener("click", () => {
    if (!latestDiagnosis) return;
    modalEditTextarea.value = (latestDiagnosis.diagnosis.fix_steps || []).join("\n");
    modalEditNotes.value = "";
    modalAdjust.classList.remove("hidden");
  });

  btnCloseEdit.addEventListener("click", () => modalAdjust.classList.add("hidden"));
  btnCancelEdit.addEventListener("click", () => modalAdjust.classList.add("hidden"));

  btnSaveEdit.addEventListener("click", () => {
    const editedFix = modalEditTextarea.value;
    const notes = modalEditNotes.value || "Adjusted fix commands";
    submitReview("Edited", "Unsafe / Invalid Remediation Step (CLI command syntax invalid in Cisco IOS)", editedFix, notes);
    modalAdjust.classList.add("hidden");
  });

  // Report Modal
  btnReportFix.addEventListener("click", () => {
    modalReportNotes.value = "";
    modalReport.classList.remove("hidden");
  });

  btnCloseReport.addEventListener("click", () => modalReport.classList.add("hidden"));
  btnCancelReport.addEventListener("click", () => modalReport.classList.add("hidden"));

  btnSaveReport.addEventListener("click", () => {
    const cat = modalReportCategory.value;
    const notes = modalReportNotes.value || "Reported error";
    const fixes = latestDiagnosis ? (latestDiagnosis.diagnosis.fix_steps || []).join("\n") : "";
    submitReview("Rejected", cat, fixes, notes);
    modalReport.classList.add("hidden");
  });

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
});
