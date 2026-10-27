(() => {
  "use strict";
  const CANDIDATES = [
    { number: "11", name: "Gabriel" },
    { number: "22", name: "Matheus" },
    { number: "33", name: "Mônica" },
    { number: "44", name: "Jennifer" }
  ];
  const VOTES_KEY = "ebmDoniciaUrna_votes_v2";
  const CLOSED_KEY = "ebmDoniciaUrna_closed_v2";
  let digits = "";
  let pendingVote = null;
  let toastTimer;

  const $ = id => document.getElementById(id);
  const voteScreen = $("voteScreen"), closeScreen = $("closeScreen");
  const digitDisplay = $("digitDisplay"), candidatePreview = $("candidatePreview");
  const confirmDialog = $("confirmDialog"), endDialog = $("endDialog"), toast = $("toast");

  function initialVotes() {
    const obj = { blank: 0 };
    CANDIDATES.forEach(c => obj[c.number] = 0);
    return obj;
  }
  function getVotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(VOTES_KEY));
      const base = initialVotes();
      if (saved && typeof saved === "object") Object.keys(base).forEach(k => {
        base[k] = Number.isFinite(Number(saved[k])) && Number(saved[k]) >= 0 ? Math.floor(Number(saved[k])) : 0;
      });
      return base;
    } catch { return initialVotes(); }
  }
  function saveVotes(votes) { localStorage.setItem(VOTES_KEY, JSON.stringify(votes)); }
  function isClosed() { return localStorage.getItem(CLOSED_KEY) === "true"; }
  function showToast(message) {
    toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }
  function selectedCandidate() { return CANDIDATES.find(c => c.number === digits) || null; }
  function renderEntry() {
    digitDisplay.replaceChildren();
    for (let i = 0; i < 2; i++) {
      const span = document.createElement("span");
      span.className = "digit" + (digits[i] ? "" : " empty");
      span.textContent = digits[i] || "—";
      digitDisplay.appendChild(span);
    }
    const candidate = selectedCandidate();
    candidatePreview.className = "";
    if (digits.length === 0) candidatePreview.textContent = "Digite o número usando o teclado.";
    else if (candidate) {
      candidatePreview.textContent = `Candidato: ${candidate.name}`;
      candidatePreview.classList.add("found");
    } else if (digits.length === 2) {
      candidatePreview.textContent = "Número não encontrado. Use CORRIGE e tente novamente.";
      candidatePreview.classList.add("invalid");
    } else candidatePreview.textContent = "Digite o segundo número.";
  }
  function clearEntry() { digits = ""; pendingVote = null; renderEntry(); }
  function setScreen(which) {
    const voting = which === "vote";
    voteScreen.classList.toggle("hidden", !voting);
    closeScreen.classList.toggle("hidden", voting);
    $("tabVote").classList.toggle("active", voting);
    $("tabClose").classList.toggle("active", !voting);
    if (!voting) renderResults();
    else renderStatus();
  }
  function renderStatus() {
    const closed = isClosed();
    $("statusLabel").textContent = closed ? "Urna encerrada" : "Urna aberta";
    document.querySelector(".live-dot").style.background = closed ? "#ff9b9b" : "#7be0b5";
    document.querySelectorAll(".keypad button, #startConfirm, #cancelEntry").forEach(b => b.disabled = closed);
    if (closed) {
      candidatePreview.textContent = "Votação encerrada. Consulte a aba Encerrar votação.";
      candidatePreview.className = "invalid";
    } else if (digits === "") renderEntry();
  }
  function renderResults() {
    const votes = getVotes();
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    $("totalVotes").textContent = total;
    const list = $("resultsList"); list.replaceChildren();
    const rows = CANDIDATES.map(c => ({ name: c.name, count: votes[c.number], number: c.number }));
    rows.push({ name: "Voto em branco", count: votes.blank, number: "blank" });
    rows.forEach(item => {
      const pct = total ? item.count / total * 100 : 0;
      const row = document.createElement("div"); row.className = "result-row";
      const label = document.createElement("span"); label.className = "result-name"; label.textContent = item.name;
      const track = document.createElement("div"); track.className = "result-track";
      const fill = document.createElement("div"); fill.className = "result-fill"; fill.style.width = pct + "%"; track.appendChild(fill);
      const count = document.createElement("span"); count.className = "result-count"; count.textContent = `${item.count} voto${item.count === 1 ? "" : "s"} · ${pct.toFixed(1).replace(".", ",")}%`;
      row.append(label, track, count); list.appendChild(row);
    });
    const banner = $("winnerBanner");
    if (!total) banner.innerHTML = '<span class="winner-icon">★</span><div><strong>Aguardando votos</strong><p>Nenhum voto foi registrado.</p></div>';
    else {
      const max = Math.max(...CANDIDATES.map(c => votes[c.number]));
      const leaders = CANDIDATES.filter(c => votes[c.number] === max && max > 0);
      if (!leaders.length) banner.innerHTML = '<span class="winner-icon">★</span><div><strong>Sem votos para candidatos</strong><p>Até agora, foram registrados somente votos em branco.</p></div>';
      else if (leaders.length > 1) banner.innerHTML = `<span class="winner-icon">＝</span><div><strong>Empate na liderança</strong><p>${leaders.map(c => c.name).join(", ")} têm ${max} voto(s) cada. É necessário seguir a regra de desempate da escola.</p></div>`;
      else banner.innerHTML = `<span class="winner-icon">★</span><div><strong>${leaders[0].name} ${isClosed() ? "foi eleito(a)" : "está na liderança"}</strong><p>${max} voto(s) (${(max / total * 100).toFixed(1).replace(".", ",")}% do total computado). ${isClosed() ? "Resultado final da votação encerrada." : "Resultado parcial até o encerramento."}</p></div>`;
    }
    $("endElection").disabled = isClosed();
    $("endElection").textContent = isClosed() ? "Votação encerrada" : "Encerrar votação";
    $("downloadPdf").disabled = !isClosed();
  }
  function beginConfirmation() {
    if (isClosed()) return showToast("A votação já foi encerrada.");
    if (digits === "BR") {
      pendingVote = { type: "blank", name: "Voto em branco" };
    } else {
      const c = selectedCandidate();
      if (!c) return showToast("Digite um número válido de candidato.");
      pendingVote = { type: c.number, name: c.name };
    }
    $("confirmText").textContent = pendingVote.type === "blank"
      ? "Você escolheu VOTO EM BRANCO. Deseja confirmar?"
      : `Você escolheu ${pendingVote.name}, número ${pendingVote.type}. Deseja confirmar seu voto?`;
    if (confirmDialog.showModal) confirmDialog.showModal();
    else if (confirm($("confirmText").textContent)) registerVote();
  }
  function registerVote() {
    if (!pendingVote || isClosed()) return;
    const votes = getVotes();
    votes[pendingVote.type] = (votes[pendingVote.type] || 0) + 1;
    saveVotes(votes);
    if (confirmDialog.open) confirmDialog.close();
    const name = pendingVote.name;
    clearEntry();
    renderStatus();
    showToast(`Voto confirmado. Próximo aluno, pode votar.`);
    setScreen("vote");
    pendingVote = null;
  }
  function endElection() {
    localStorage.setItem(CLOSED_KEY, "true");
    clearEntry(); renderStatus(); renderResults(); endDialog.close();
    showToast("Votação encerrada. Agora você pode baixar o relatório em PDF.");
  }
  function downloadPdf() {
    if (!isClosed()) return showToast("Encerre a votação antes de gerar o relatório.");
    if (!window.jspdf || !window.jspdf.jsPDF) return showToast("Não foi possível carregar a biblioteca PDF. Verifique a internet e tente novamente.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const votes = getVotes();
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    const now = new Date();
    const date = now.toLocaleDateString("pt-BR");
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    doc.setFillColor(16, 43, 85); doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
    doc.text("EBM DONICIA MARIA DA COSTA", 15, 17);
    doc.setFontSize(12); doc.text("RELATORIO FINAL - VOTACAO DO GREMIO ESTUDANTIL", 15, 28);
    doc.setTextColor(30, 45, 68); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Data de emissao: ${date} - ${time}`, 15, 52);
    doc.text("Status: VOTACAO ENCERRADA", 15, 61);
    doc.text(`Total de votos computados: ${total}`, 15, 70);
    doc.setFont("helvetica", "bold"); doc.text("Candidato / tipo de voto", 15, 87); doc.text("Numero", 115, 87); doc.text("Votos", 145, 87); doc.text("%", 177, 87);
    doc.setDrawColor(190, 200, 215); doc.line(15, 91, 195, 91);
    doc.setFont("helvetica", "normal");
    const rows = CANDIDATES.map(c => ({ name: c.name, number: c.number, count: votes[c.number] }));
    rows.push({ name: "Voto em branco", number: "-", count: votes.blank });
    let y = 101;
    rows.forEach(r => {
      const pct = total ? r.count / total * 100 : 0;
      doc.text(r.name, 15, y); doc.text(String(r.number), 115, y); doc.text(String(r.count), 145, y); doc.text(pct.toFixed(1) + "%", 177, y);
      y += 10;
    });
    y += 8; doc.setDrawColor(190, 200, 215); doc.line(15, y - 4, 195, y - 4);
    const max = Math.max(...CANDIDATES.map(c => votes[c.number]));
    const leaders = CANDIDATES.filter(c => votes[c.number] === max && max > 0);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    if (!leaders.length) {
      doc.text("Resultado: nenhum candidato recebeu votos.", 15, y + 7);
    } else if (leaders.length > 1) {
      doc.text("Resultado: EMPATE", 15, y + 7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      doc.text("Candidatos empatados: " + leaders.map(c => c.name).join(", "), 15, y + 16);
      doc.text("Aplicar a regra de desempate definida pela escola.", 15, y + 25);
    } else {
      doc.text("ELEITO(A): " + leaders[0].name, 15, y + 7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      doc.text(`Votos recebidos: ${max} (${total ? (max / total * 100).toFixed(1) : "0.0"}% do total).`, 15, y + 16);
    }
    doc.setFontSize(9); doc.setTextColor(100, 110, 125);
    doc.text("Relatorio gerado pela urna virtual escolar. Os votos foram armazenados localmente neste navegador.", 15, 280, { maxWidth: 180 });
    doc.save("Relatorio_Votacao_Gremio_EBM_Donicia.pdf");
    showToast("Relatório PDF gerado.");
  }

  document.querySelectorAll("[data-digit]").forEach(button => button.addEventListener("click", () => {
    if (isClosed()) return;
    if (digits.length >= 2) return showToast("Use CORRIGE para alterar o número.");
    digits += button.dataset.digit; renderEntry();
  }));
  $("clearDigits").addEventListener("click", () => { if (!isClosed()) { digits = digits.slice(0, -1); renderEntry(); } });
  $("cancelEntry").addEventListener("click", () => { if (!isClosed()) clearEntry(); });
  $("blankVote").addEventListener("click", () => {
    if (isClosed()) return;
    digits = "BR"; digitDisplay.replaceChildren();
    const blank = document.createElement("span"); blank.className = "digit"; blank.style.width = "100px"; blank.textContent = "BR"; digitDisplay.appendChild(blank);
    candidatePreview.textContent = "Voto em branco"; candidatePreview.className = "found";
  });
  $("startConfirm").addEventListener("click", beginConfirmation);
  $("confirmVote").addEventListener("click", registerVote);
  $("cancelVote").addEventListener("click", () => { pendingVote = null; confirmDialog.close(); });
  $("tabVote").addEventListener("click", () => setScreen("vote"));
  $("tabClose").addEventListener("click", () => setScreen("close"));
  $("refreshResults").addEventListener("click", () => { renderResults(); showToast("Apuração atualizada."); });
  $("endElection").addEventListener("click", () => {
    if (isClosed()) return;
    if (endDialog.showModal) endDialog.showModal();
    else if (confirm("Encerrar a votação?")) endElection();
  });
  $("cancelEnd").addEventListener("click", () => endDialog.close());
  $("confirmEnd").addEventListener("click", endElection);
  $("downloadPdf").addEventListener("click", downloadPdf);
  $("resetElection").addEventListener("click", () => {
    if (!confirm("Reiniciar a urna? Isso apagará os totais registrados neste navegador e reabrirá a votação.")) return;
    localStorage.removeItem(VOTES_KEY); localStorage.removeItem(CLOSED_KEY);
    clearEntry(); renderStatus(); renderResults(); setScreen("vote");
    showToast("Urna reiniciada.");
  });
  window.addEventListener("storage", e => { if (e.key === VOTES_KEY || e.key === CLOSED_KEY) { renderResults(); renderStatus(); } });
  document.getElementById("year").textContent = new Date().getFullYear();
  renderEntry(); renderStatus(); renderResults();
})();