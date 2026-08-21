// ==========================================================================
// NetSage AI — Student Copilot Single-Page Application Client
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // State
  let currentMode = "live"; // "live" | "guided"
  let allCases = [];
  let currentCase = {
    case_id: "LIVE-PACKET-TRACER",
    symptom: "Live Packet Tracer lab issue captured directly from your Cisco terminal session.",
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
  const themeIcon = themeToggleBtn.querySelector(".theme-icon");
  const themeLabel = themeToggleBtn.querySelector(".theme-label");

  const btnModeLive = document.getElementById("btn-mode-live");
  const btnModeGuided = document.getElementById("btn-mode-guided");
  const caseSelectorBar = document.getElementById("case-selector-bar");
  const filterLayer = document.getElementById("filter-layer");
  const selectCase = document.getElementById("select-case");

  const radarCard = document.getElementById("live-radar-card");
  const radarTitle = document.getElementById("radar-title");
  const radarSubtitle = document.getElementById("radar-subtitle");
  const radarTime = document.getElementById("radar-time");
  const btnRefreshLive = document.getElementById("btn-refresh-live");

  const caseIdBadge = document.getElementById("case-id-badge");
  const layerBadge = document.getElementById("layer-badge");
  const symptomText = document.getElementById("symptom-text");
  const topologyText = document.getElementById("topology-text");
  const cliTextarea = document.getElementById("cli-textarea");
  const btnCopyCli = document.getElementById("btn-copy-cli");
  const btnDiagnose = document.getElementById("btn-diagnose");

  const aiEmptyState = document.getElementById("ai-empty-state");
  const aiDiagnosisContent = document.getElementById("ai-diagnosis-content");
  const aiRootCause = document.getElementById("ai-root-cause");
  const aiConfidence = document.getElementById("ai-confidence");
  const aiEvidenceText = document.getElementById("ai-evidence-text");
  const fixStepsList = document.getElementById("fix-steps-list");
  const verifyCommandsList = document.getElementById("verify-commands-list");

  const btnAcceptFix = document.getElementById("btn-accept-fix");
  const btnEditFix = document.getElementById("btn-edit-fix");
  const btnReportFix = document.getElementById("btn-report-fix");

  // Modals
  const modalAdjust = document.getElementById("modal-adjust");
  const modalEditTextarea = document.getElementById("modal-edit-textarea");
  const modalEditNotes = document.getElementById("modal-edit-notes");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const btnSaveEdit = document.getElementById("btn-save-edit");

  const modalReport = document.getElementById("modal-report");
  const modalReportCategory = document.getElementById("modal-report-category");
  const modalReportNotes = document.getElementById("modal-report-notes");
  const btnCancelReport = document.getElementById("btn-cancel-report");
  const btnSaveReport = document.getElementById("btn-save-report");

  // Telemetry Elements
  const statLatency = document.getElementById("stat-latency");
  const statThroughput = document.getElementById("stat-throughput");
  const statTokens = document.getElementById("stat-tokens");
  const statRam = document.getElementById("stat-ram");
  const rulesList = document.getElementById("rules-list");

  // ------------------------------------------------------------------------
  // 1. Instant Zero-Lag Theme Switcher
  // ------------------------------------------------------------------------
  function setTheme(theme) {
    htmlDoc.setAttribute("data-theme", theme);
    localStorage.setItem("netsage_theme", theme);
    if (theme === "dark") {
      themeIcon.textContent = "☀️";
      themeLabel.textContent = "Light";
    } else {
      themeIcon.textContent = "🌙";
      themeLabel.textContent = "Dark";
    }
  }

  const savedTheme = localStorage.getItem("netsage_theme") || "dark";
  setTheme(savedTheme);

  themeToggleBtn.addEventListener("click", () => {
    const current = htmlDoc.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  });

  // ------------------------------------------------------------------------
  // 2. Mode Switching (Live Copilot vs 30 Guided Lab Cases)
  // ------------------------------------------------------------------------
  btnModeLive.addEventListener("click", () => {
    currentMode = "live";
    btnModeLive.classList.add("active");
    btnModeGuided.classList.remove("active");
    caseSelectorBar.classList.add("hidden");
    radarCard.classList.remove("hidden");

    caseIdBadge.textContent = "LIVE-FEED";
    caseIdBadge.className = "badge badge-primary";
    symptomText.textContent = "Capturing live network anomaly from your active Cisco Packet Tracer terminal...";
    topologyText.textContent = "Cisco Packet Tracer live lab session.";
    fetchLiveBuffer(true);
  });

  btnModeGuided.addEventListener("click", () => {
    currentMode = "guided";
    btnModeGuided.classList.add("active");
    btnModeLive.classList.remove("active");
    caseSelectorBar.classList.remove("hidden");
    radarCard.classList.add("hidden");

    if (allCases.length === 0) {
      loadCases();
    } else {
      applySelectedCase();
    }
  });

  // ------------------------------------------------------------------------
  // 3. Load & Filter Cases
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
      opt.textContent = `${c.case_id} [${c.osi_layer} | ${c.concept_tag}]: ${c.symptom.substring(0, 45)}...`;
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
    caseIdBadge.textContent = currentCase.case_id;
    layerBadge.textContent = currentCase.osi_layer;
    symptomText.textContent = currentCase.symptom;
    topologyText.textContent = currentCase.topology_note || "No topology notes provided.";
    cliTextarea.value = currentCase.show_outputs || "";

    resetDiagnosisView();
  }

  filterLayer.addEventListener("change", populateCaseDropdown);
  selectCase.addEventListener("change", applySelectedCase);

  // ------------------------------------------------------------------------
  // 4. Live Packet Tracer Buffer Poller
  // ------------------------------------------------------------------------
  async function fetchLiveBuffer(forceUpdateTextarea = false) {
    try {
      const res = await fetch("/api/live");
      const data = await res.json();

      if (data.exists && data.is_fresh) {
        radarCard.className = "radar-card radar-active";
        radarTitle.textContent = "LIVE PACKET TRACER SYNC: ACTIVE";
        radarSubtitle.textContent = `Captured Cisco CLI output (${data.age_sec}s ago)`;
        radarTime.textContent = `Last capture: ${data.mtime}`;

        if (currentMode === "live") {
          if (forceUpdateTextarea || data.content !== lastLiveContent) {
            lastLiveContent = data.content;
            currentCase.show_outputs = data.content;
            cliTextarea.value = data.content;
          }
        }
      } else {
        radarCard.className = "radar-card";
        radarTitle.textContent = "📡 Packet Tracer Listener Standby";
        radarSubtitle.textContent = "Run 'python pt_listener.py' and copy Cisco show outputs in Packet Tracer";
        radarTime.textContent = data.mtime ? `Last seen: ${data.mtime}` : "Waiting for capture...";

        if (currentMode === "live" && forceUpdateTextarea && !cliTextarea.value) {
          cliTextarea.value = "# Waiting for Packet Tracer CLI capture...\n# 1. Run 'python pt_listener.py'\n# 2. Copy any show-command output in Packet Tracer.";
        }
      }
    } catch (e) {
      console.error("Live poll error:", e);
    }
  }

  btnRefreshLive.addEventListener("click", () => fetchLiveBuffer(true));
  setInterval(() => {
    if (currentMode === "live") fetchLiveBuffer(false);
  }, 1500);

  // Initial fetch
  fetchLiveBuffer(true);

  // ------------------------------------------------------------------------
  // 5. Copy CLI Text Helper
  // ------------------------------------------------------------------------
  btnCopyCli.addEventListener("click", () => {
    navigator.clipboard.writeText(cliTextarea.value);
    btnCopyCli.textContent = "✅ Copied!";
    setTimeout(() => { btnCopyCli.textContent = "📋 Copy"; }, 1800);
  });

  // ------------------------------------------------------------------------
  // 6. Diagnose Action
  // ------------------------------------------------------------------------
  btnDiagnose.addEventListener("click", async () => {
    const rawCli = cliTextarea.value.trim();
    if (!rawCli || rawCli.startsWith("# Waiting")) {
      alert("Please enter or copy some Cisco CLI show-output first!");
      return;
    }

    btnDiagnose.disabled = true;
    btnDiagnose.textContent = "⏳ NetSage AI is diagnosing...";

    const payload = {
      case_id: currentMode === "live" ? "LIVE-PACKET-TRACER" : currentCase.case_id,
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
    } finally {
      btnDiagnose.disabled = false;
      btnDiagnose.textContent = "🚀 Ask NetSage AI to Diagnose & Fix";
    }
  });

  function resetDiagnosisView() {
    aiEmptyState.classList.remove("hidden");
    aiDiagnosisContent.classList.add("hidden");
  }

  function renderDiagnosis(data) {
    const diag = data.diagnosis || {};
    const findings = data.deterministic_findings || [];
    const tel = diag.telemetry || {};

    aiEmptyState.classList.add("hidden");
    aiDiagnosisContent.classList.remove("hidden");

    // Root Cause & Layer
    aiRootCause.textContent = diag.root_cause || "Anomaly detected in network state.";
    layerBadge.textContent = diag.osi_layer || currentCase.osi_layer || "Network";
    aiConfidence.textContent = `${Math.round((diag.confidence_score || 0.9) * 100)}%`;

    // Evidence
    aiEvidenceText.textContent = diag.cli_evidence_quote || "No specific line quoted.";

    // Fix Steps with individual copy buttons
    fixStepsList.innerHTML = "";
    const fixes = diag.fix_steps || [];
    fixes.forEach((step, idx) => {
      const item = document.createElement("div");
      item.className = "fix-item";
      item.innerHTML = `
        <div>
          <small style="color: var(--text-secondary); display: block; margin-bottom: 2px;">Step ${idx + 1}:</small>
          <code class="fix-code">${escapeHtml(step)}</code>
        </div>
        <button class="btn-xs btn-copy-step" data-code="${escapeHtml(step)}">📋 Copy</button>
      `;
      fixStepsList.appendChild(item);
    });

    // Copy Step Listeners
    document.querySelectorAll(".btn-copy-step").forEach(btn => {
      btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-code");
        navigator.clipboard.writeText(text);
        btn.textContent = "✅ Copied!";
        setTimeout(() => { btn.textContent = "📋 Copy"; }, 1500);
      });
    });

    // Verification Commands
    verifyCommandsList.innerHTML = "";
    const vcmds = diag.verification_commands || [];
    if (vcmds.length === 0) {
      verifyCommandsList.innerHTML = `<small style="color: var(--text-secondary);">No verification commands generated.</small>`;
    } else {
      vcmds.forEach(v => {
        const p = document.createElement("div");
        p.style.marginBottom = "0.3rem";
        p.innerHTML = `<code class="fix-code" style="color: #A7F3D0;">${escapeHtml(v)}</code>`;
        verifyCommandsList.appendChild(p);
      });
    }

    // Telemetry Update
    statLatency.textContent = `${(tel.inference_time_ms || 0).toFixed(1)} ms`;
    statThroughput.textContent = `${(tel.tokens_per_second || 0).toFixed(1)} t/s`;
    statTokens.textContent = `${tel.output_tokens || 0}`;
    statRam.textContent = `${(tel.process_ram_mb || 0).toFixed(1)} MB`;

    rulesList.innerHTML = "";
    if (findings.length === 0) {
      rulesList.textContent = "✅ No deterministic rule anomalies detected.";
    } else {
      findings.forEach(f => {
        const chip = document.createElement("span");
        chip.className = "rule-chip";
        chip.textContent = `[${f.rule_id}] ${f.title} (${f.layer})`;
        rulesList.appendChild(chip);
      });
    }
  }

  // ------------------------------------------------------------------------
  // 7. Human-in-the-Loop Review Actions
  // ------------------------------------------------------------------------
  async function submitReview(decision, failureCat, fixStepsText, notes) {
    if (!latestDiagnosis) return;
    const diag = latestDiagnosis.diagnosis || {};

    const reviewPayload = {
      case_id: currentMode === "live" ? "LIVE-PACKET-TRACER" : currentCase.case_id,
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
      const data = await res.json();
      alert(`✅ Review Logged: ${decision} (${failureCat})`);
    } catch (e) {
      alert("Error submitting review: " + e.message);
    }
  }

  // 1. Accept
  btnAcceptFix.addEventListener("click", () => {
    if (!latestDiagnosis) return;
    const fixes = (latestDiagnosis.diagnosis.fix_steps || []).join("\n");
    submitReview("Accepted", "None / Valid AI Diagnosis", fixes, "Student approved fix.");
  });

  // 2. Adjust Modal
  btnEditFix.addEventListener("click", () => {
    if (!latestDiagnosis) return;
    modalEditTextarea.value = (latestDiagnosis.diagnosis.fix_steps || []).join("\n");
    modalEditNotes.value = "";
    modalAdjust.classList.remove("hidden");
  });

  btnCancelEdit.addEventListener("click", () => modalAdjust.classList.add("hidden"));

  btnSaveEdit.addEventListener("click", () => {
    const editedFix = modalEditTextarea.value;
    const notes = modalEditNotes.value || "Adjusted fix commands";
    submitReview("Edited", "Unsafe / Invalid Remediation Step (CLI command syntax invalid in Cisco IOS)", editedFix, notes);
    modalAdjust.classList.add("hidden");
  });

  // 3. Report Issue Modal
  btnReportFix.addEventListener("click", () => {
    modalReportNotes.value = "";
    modalReport.classList.remove("hidden");
  });

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
