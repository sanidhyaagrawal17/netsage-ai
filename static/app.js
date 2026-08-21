// ==========================================================================
// NetSage AI — Extreme Minimalist Client
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  let currentMode = "live";
  let allCases = [];
  let currentCase = {
    case_id: "LIVE-PT-SESSION",
    symptom: "Capturing live network anomaly from your active Cisco Packet Tracer terminal...",
    topology_note: "Cisco Packet Tracer live lab session.",
    show_outputs: "",
    osi_layer: "Auto-Detect",
  };
  let latestDiagnosis = null;
  let lastLiveContent = "";

  const htmlDoc = document.documentElement;
  const themeToggleBtn = document.getElementById("theme-toggle");
  const modeSelect = document.getElementById("mode-select");
  const guidedBar = document.getElementById("guided-bar");
  const filterLayer = document.getElementById("filter-layer");
  const selectCase = document.getElementById("select-case");

  const liveIndicator = document.getElementById("live-indicator");
  const liveText = document.getElementById("live-text");

  const navTabs = document.querySelectorAll(".nav-tab");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const tabBtnDiagnosis = document.getElementById("tab-btn-diagnosis");

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
  const btnCopyAllFixes = document.getElementById("btn-copy-all-fixes");
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

  // Telemetry
  const statLatency = document.getElementById("stat-latency");
  const statThroughput = document.getElementById("stat-throughput");
  const statTokens = document.getElementById("stat-tokens");
  const statRam = document.getElementById("stat-ram");
  const rulesList = document.getElementById("rules-list");

  // --- Theme ---
  function setTheme(theme) {
    htmlDoc.setAttribute("data-theme", theme);
    localStorage.setItem("netsage_theme", theme);
  }
  setTheme(localStorage.getItem("netsage_theme") || "dark");
  themeToggleBtn.addEventListener("click", () => {
    setTheme(htmlDoc.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // --- Tabs ---
  function switchTab(targetId) {
    navTabs.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-target") === targetId));
    tabPanes.forEach(pane => pane.classList.toggle("active", pane.id === targetId));
  }
  navTabs.forEach(btn => btn.addEventListener("click", () => switchTab(btn.getAttribute("data-target"))));

  // --- Modes ---
  modeSelect.addEventListener("change", (e) => {
    currentMode = e.target.value;
    if (currentMode === "live") {
      guidedBar.classList.add("hidden");
      symptomText.textContent = "Capturing live network anomaly from your active Cisco Packet Tracer terminal...";
      topologyText.textContent = "Cisco Packet Tracer live lab session.";
      fetchLiveBuffer(true);
    } else {
      guidedBar.classList.remove("hidden");
      if (allCases.length === 0) loadCases();
      else applySelectedCase();
    }
  });

  async function loadCases() {
    try {
      const res = await fetch("/api/cases");
      allCases = await res.json();
      populateCaseDropdown();
    } catch (e) { console.error(e); }
  }

  function populateCaseDropdown() {
    const layer = filterLayer.value;
    const filtered = layer === "All" ? allCases : allCases.filter(c => c.osi_layer === layer);
    selectCase.innerHTML = "";
    filtered.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.case_id;
      opt.textContent = `${c.case_id}: ${c.symptom.substring(0, 50)}...`;
      selectCase.appendChild(opt);
    });
    if (filtered.length > 0) applySelectedCase();
  }

  function applySelectedCase() {
    const cid = selectCase.value;
    const found = allCases.find(c => c.case_id === cid);
    if (!found) return;
    currentCase = { ...found };
    symptomText.textContent = currentCase.symptom;
    topologyText.textContent = currentCase.topology_note || "No topology note.";
    cliTextarea.value = currentCase.show_outputs || "";
    resetDiagnosisView();
  }

  filterLayer.addEventListener("change", populateCaseDropdown);
  selectCase.addEventListener("change", applySelectedCase);

  // --- Live Poller ---
  async function fetchLiveBuffer(forceUpdate = false) {
    try {
      const res = await fetch("/api/live");
      const data = await res.json();
      if (data.exists && data.is_fresh) {
        liveIndicator.classList.add("active");
        liveText.textContent = "Live Sync";
        if (currentMode === "live") {
          if (forceUpdate || data.content !== lastLiveContent) {
            lastLiveContent = data.content;
            cliTextarea.value = data.content;
          }
        }
      } else {
        liveIndicator.classList.remove("active");
        liveText.textContent = "Standby";
        if (currentMode === "live" && forceUpdate && !cliTextarea.value) {
          cliTextarea.value = "# Waiting for Packet Tracer CLI capture...\n# 1. Start 'python pt_listener.py'\n# 2. Copy any show-command output in Packet Tracer.";
        }
      }
    } catch (e) { console.error(e); }
  }
  setInterval(() => { if (currentMode === "live") fetchLiveBuffer(false); }, 1200);
  fetchLiveBuffer(true);

  // --- Terminal ---
  btnClearCli.addEventListener("click", () => { cliTextarea.value = ""; cliTextarea.focus(); });
  btnCopyCli.addEventListener("click", () => {
    if (!cliTextarea.value) return;
    navigator.clipboard.writeText(cliTextarea.value);
    btnCopyCli.textContent = "Copied";
    setTimeout(() => { btnCopyCli.textContent = "Copy"; }, 1500);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      btnDiagnose.click();
    }
  });

  // --- Diagnose ---
  btnDiagnose.addEventListener("click", async () => {
    const rawCli = cliTextarea.value.trim();
    if (!rawCli || rawCli.startsWith("# Waiting")) return alert("Please paste CLI output first!");

    btnDiagnose.disabled = true;
    btnDiagnose.innerHTML = `Analyzing...`;

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: currentMode === "live" ? "LIVE-PT-SESSION" : currentCase.case_id,
          symptom: currentCase.symptom,
          show_outputs: rawCli,
          osi_layer: currentCase.osi_layer || "Network",
        }),
      });
      const data = await res.json();
      latestDiagnosis = data;
      renderDiagnosis(data);
      switchTab("tab-diagnosis");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      btnDiagnose.disabled = false;
      btnDiagnose.innerHTML = `Run Diagnostic Engine <span>↵</span>`;
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

    aiRootCause.textContent = diag.root_cause || "Configuration Anomaly";
    layerBadge.textContent = diag.osi_layer || "Layer 3";
    aiConfidence.textContent = `${Math.round((diag.confidence_score || 0.9) * 100)}% Confidence`;
    aiEvidenceText.textContent = diag.cli_evidence_quote || "N/A";

    fixStepsList.innerHTML = "";
    const fixes = diag.fix_steps || [];
    fixes.forEach((step) => {
      const item = document.createElement("div");
      item.className = "step-item";
      item.innerHTML = `
        <span class="step-cmd">${escapeHtml(step)}</span>
        <button class="editor-btn btn-copy-step" data-code="${escapeHtml(step)}">Copy</button>
      `;
      fixStepsList.appendChild(item);
    });

    document.querySelectorAll(".btn-copy-step").forEach(btn => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.getAttribute("data-code"));
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = "Copy"; }, 1400);
      });
    });

    btnCopyAllFixes.onclick = () => {
      navigator.clipboard.writeText(fixes.join("\n"));
      btnCopyAllFixes.textContent = "Copied";
      setTimeout(() => { btnCopyAllFixes.textContent = "Copy All"; }, 1500);
    };

    verifyCommandsList.innerHTML = "";
    (diag.verification_commands || []).forEach(v => {
      const d = document.createElement("div");
      d.className = "verify-cmd";
      d.textContent = v;
      verifyCommandsList.appendChild(d);
    });

    statLatency.textContent = `${(tel.inference_time_ms || 0).toFixed(1)} ms`;
    statThroughput.textContent = `${(tel.tokens_per_second || 0).toFixed(1)} t/s`;
    statTokens.textContent = `${tel.output_tokens || 0}`;
    statRam.textContent = `${(tel.process_ram_mb || 0).toFixed(1)} MB`;

    rulesList.innerHTML = "";
    if (findings.length === 0) {
      rulesList.innerHTML = `<p class="text-muted">No rules triggered.</p>`;
    } else {
      findings.forEach(f => {
        const d = document.createElement("div");
        d.className = "rule-item";
        d.innerHTML = `
          <div style="font-size: 0.875rem; color: var(--text-primary); margin-bottom: 0.25rem;">[${f.rule_id}] ${f.title}</div>
          <div style="font-size: 0.8125rem; font-family: monospace; color: var(--text-secondary);">${escapeHtml(f.evidence_snippet)}</div>
        `;
        rulesList.appendChild(d);
      });
    }
  }

  // --- Modals ---
  async function submitReview(decision, failureCat, fixStepsText, notes) {
    if (!latestDiagnosis) return;
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: currentMode === "live" ? "LIVE-PT-SESSION" : currentCase.case_id,
          osi_layer: latestDiagnosis.diagnosis.osi_layer || "Network",
          severity: "Medium",
          concept_tag: "general",
          model_used: "qwen2.5-coder:3b",
          is_simulated: true,
          decision: decision,
          failure_category: failureCat,
          root_cause: latestDiagnosis.diagnosis.root_cause || "Reviewed",
          fix_steps: fixStepsText,
          rule_agreement: true,
          engineer_notes: notes,
          telemetry: latestDiagnosis.diagnosis.telemetry || {},
        }),
      });
      alert(`Approved: ${decision}`);
    } catch (e) { alert(e.message); }
  }

  btnAcceptFix.addEventListener("click", () => {
    submitReview("Accepted", "None / Valid AI Diagnosis", (latestDiagnosis.diagnosis.fix_steps || []).join("\n"), "Approved");
  });

  btnEditFix.addEventListener("click", () => {
    modalEditTextarea.value = (latestDiagnosis.diagnosis.fix_steps || []).join("\n");
    modalAdjust.classList.remove("hidden");
  });
  btnCancelEdit.addEventListener("click", () => modalAdjust.classList.add("hidden"));
  btnSaveEdit.addEventListener("click", () => {
    submitReview("Edited", "Unsafe / Invalid Remediation Step", modalEditTextarea.value, modalEditNotes.value);
    modalAdjust.classList.add("hidden");
  });

  btnReportFix.addEventListener("click", () => modalReport.classList.remove("hidden"));
  btnCancelReport.addEventListener("click", () => modalReport.classList.add("hidden"));
  btnSaveReport.addEventListener("click", () => {
    submitReview("Rejected", modalReportCategory.value, "", modalReportNotes.value);
    modalReport.classList.add("hidden");
  });

  function escapeHtml(str) {
    return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : "";
  }
});
