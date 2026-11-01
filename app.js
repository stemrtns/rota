import { api } from "./api.js";

const state = {
  user: null,
  clients: [],
  vehicles: [],
  requests: [],
  view: "inicio",
  authMode: "login",
  editingRequestId: null,
  editingVehicleId: null,
  pendingView: null,
  pendingVehicleId: null,
  selectedRequestId: null,
  galleryVehicleId: null,
  galleryPhotoIndex: 0,
};

const views = new Set(["inicio", "veiculos", "cadastro", "solicitar", "pedidos", "analise", "frota"]);
const staffRoles = new Set(["agent", "company", "bank"]);
const carPhotos = [
  "photo-1503376780353-7e6692767b70",
  "photo-1552519507-da3b142c6e3d",
  "photo-1492144534655-ae79c964c9d7",
  "photo-1502877338535-766e1452684a",
  "photo-1533473359331-0135ef1b58bf",
  "photo-1489824904134-891ab64532f1",
  "photo-1503736334956-4c8f8e92946d",
  "photo-1549317661-bd32c8ce0db2",
  "photo-1550355291-bbee04a92027",
  "photo-1519641471654-76ce0107ad1b",
  "photo-1494976388531-d1058494cdd8",
  "photo-1542362567-b07e54358753",
  "photo-1551830820-330a71b99659",
  "photo-1553440569-bcc63803a83d",
  "photo-1555215695-3004980ad54e",
];

function isStaff() {
  return Boolean(state.user && staffRoles.has(state.user.role));
}

function currentClient() {
  return state.clients.find((client) => Number(client.userId) === Number(state.user?.id));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function toast(message, isError = false) {
  const region = document.getElementById("toast-region");
  const item = document.createElement("div");
  item.className = `toast-message${isError ? " error" : ""}`;
  item.textContent = message;
  region.append(item);
  window.setTimeout(() => item.remove(), 4800);
}

function reportError(error) {
  console.error(error);
  toast(error instanceof Error ? error.message : "Não foi possível concluir a ação.", true);
}

async function loadData() {
  const [clients, vehicles, requests] = await Promise.all([
    api.get("/clients"),
    api.get("/vehicles"),
    api.get("/requests"),
  ]);
  state.clients = clients;
  state.vehicles = vehicles;
  state.requests = requests;
  renderAll();
}

function renderAll() {
  renderShell();
  renderHomeVehicles();
  renderCatalog();
  renderProfile();
  renderRequestForm();
  renderOrders();
  renderAnalysis();
  renderFleet();
}

function renderShell() {
  const authenticated = Boolean(state.user);
  document.querySelectorAll(".auth-nav").forEach((item) => {
    item.hidden = !authenticated || isStaff();
  });
  document.querySelectorAll(".agent-nav").forEach((item) => {
    item.hidden = !isStaff();
  });
  document.getElementById("login-open").hidden = authenticated;
  document.getElementById("register-open").hidden = authenticated;
  document.getElementById("logout-button").hidden = !authenticated;
  const accountName = document.getElementById("account-name");
  accountName.hidden = !authenticated;
  accountName.textContent = authenticated ? state.user.name : "";
  document.getElementById("home-auth-panel").hidden = authenticated;
  document.getElementById("home-session-panel").hidden = !authenticated;
  if (authenticated) {
    document.getElementById("home-session-name").textContent = state.user.name.split(" ")[0];
    document.getElementById("home-session-description").textContent = isStaff()
      ? "Acesse as análises financeiras e a gestão da frota."
      : "Consulte seus pedidos e acompanhe seus contratos.";
    const action = document.getElementById("home-session-action");
    action.dataset.nav = isStaff() ? "analise" : "pedidos";
    action.textContent = isStaff() ? "Acessar painel do agente" : "Acessar meus pedidos";
  }
  document.querySelector(".footer-copy").textContent = `© ${new Date().getFullYear()} Rota. Feito para ir mais longe.`;
}

function routeTo(view, options = {}) {
  if (!views.has(view)) view = "inicio";
  if (view === "cadastro" || view === "pedidos" || view === "solicitar") {
    if (!state.user) {
      state.pendingView = view;
      openModal("auth-modal", "login");
      return;
    }
    if (isStaff()) {
      toast("Esta área é exclusiva para clientes.", true);
      view = "inicio";
    }
    if (view === "solicitar" && !isProfileComplete(currentClient())) {
      toast("Complete seu cadastro antes de solicitar um aluguel.", true);
      view = "cadastro";
    }
  }
  if ((view === "analise" || view === "frota") && !isStaff()) {
    toast("Esta área é exclusiva para agentes, empresas e bancos.", true);
    view = "inicio";
  }

  state.view = view;
  if (options.replaceHash) history.replaceState(null, "", `#${view}`);
  else if (location.hash !== `#${view}`) location.hash = view;
  document.querySelectorAll("[data-view]").forEach((section) => {
    const active = section.dataset.view === view;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  document.querySelectorAll(".nav-link").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === view);
  });
  document.querySelector(".main-nav").classList.remove("is-open");
  document.querySelector(".mobile-menu-toggle").setAttribute("aria-expanded", "false");
  if (view === "solicitar") {
    renderRequestForm();
    if (state.pendingVehicleId) {
      document.getElementById("request-vehicle").value = String(state.pendingVehicleId);
      state.pendingVehicleId = null;
      updateEstimate();
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function isProfileComplete(client) {
  return Boolean(
    client &&
    client.rg?.trim() &&
    client.cpf?.trim() &&
    client.address?.trim() &&
    client.profession?.trim() &&
    Array.isArray(client.employers) &&
    client.employers.length > 0,
  );
}

function carIllustration(index = 0, loading = "lazy", alt = "Foto ilustrativa de veículo") {
  const photo = carPhotos[index % carPhotos.length];
  return `<img class="vehicle-illustration" src="https://images.unsplash.com/${photo}?auto=format&amp;fit=crop&amp;w=800&amp;q=80" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async">`;
}

function vehicleCard(vehicle, index, compact = false) {
  const available = vehicle.status === "Disponível";
  const title = `${vehicle.brand} ${vehicle.model}`;
  const button = available
    ? `<button class="vehicle-action" type="button" data-request-vehicle="${escapeHtml(vehicle.id)}">Solicitar aluguel →</button>`
    : `<span class="vehicle-action text-secondary">Indisponível</span>`;
  return `<div class="${compact ? "col-md-6 col-lg-4" : "col-sm-6 col-lg-4"}">
    <article class="vehicle-card">
      <div class="vehicle-visual tone-${index % 4}">
        <span class="vehicle-tag${available ? "" : " unavailable"}">${available ? "● Disponível" : "● Indisponível"}</span>
        ${carIllustration(Number(vehicle.id) - 1, compact ? "lazy" : "eager", `Foto ilustrativa de ${title}`)}
        <button class="vehicle-gallery-open" type="button" data-gallery-vehicle="${escapeHtml(vehicle.id)}" aria-label="Ver três fotos de ${escapeHtml(title)}"><span aria-hidden="true">⌕</span> Ver fotos</button>
      </div>
      <div class="vehicle-body">
        <div class="vehicle-meta"><span>${escapeHtml(vehicle.year)} · ${escapeHtml(vehicle.matricula || "—")} · ${escapeHtml(vehicle.plate)}</span><span>${escapeHtml(vehicle.ownerType || "Frota")}</span></div>
        <h3>${escapeHtml(vehicle.brand)} <small>${escapeHtml(vehicle.model)}</small></h3>
        <div class="vehicle-card-footer">
          <span class="vehicle-price"><strong>${formatCurrency(vehicle.dailyRate)}<span>/ diária</span></strong></span>
          ${button}
        </div>
      </div>
    </article>
  </div>`;
}

function renderHomeVehicles() {
  const target = document.getElementById("home-vehicles");
  const available = state.vehicles.filter((vehicle) => vehicle.status === "Disponível").slice(0, 3);
  target.innerHTML = available.length
    ? available.map((vehicle, index) => vehicleCard(vehicle, index, false)).join("")
    : `<div class="empty-state"><strong>Novos carros estão chegando</strong>Volte em breve para conferir o catálogo.</div>`;
}

function renderCatalog() {
  const target = document.getElementById("catalog-vehicles");
  const search = document.getElementById("catalog-search").value.trim().toLocaleLowerCase("pt-BR");
  const sort = document.getElementById("catalog-sort").value;
  const vehicles = state.vehicles
    .filter((vehicle) => `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.matricula} ${vehicle.plate}`.toLocaleLowerCase("pt-BR").includes(search))
    .sort((a, b) => {
      if (sort === "price-asc") return Number(a.dailyRate) - Number(b.dailyRate);
      if (sort === "price-desc") return Number(b.dailyRate) - Number(a.dailyRate);
      return Number(a.id) - Number(b.id);
    });
  document.getElementById("catalog-count").innerHTML = `<strong>${vehicles.length} veículos</strong> no catálogo`;
  target.innerHTML = vehicles.length
    ? vehicles.map((vehicle, index) => vehicleCard(vehicle, index, true)).join("")
    : `<div class="empty-state"><strong>Nenhum veículo encontrado</strong>Tente buscar por outra marca ou modelo.</div>`;
}

function galleryPhotosFor(vehicle) {
  const firstPhoto = (Number(vehicle.id) - 1) % carPhotos.length;
  return Array.from({ length: 3 }, (_, offset) => carPhotos[(firstPhoto + offset) % carPhotos.length]);
}

function renderVehicleGallery() {
  const vehicle = state.vehicles.find((item) => Number(item.id) === Number(state.galleryVehicleId));
  if (!vehicle) return;
  const photos = galleryPhotosFor(vehicle);
  const photo = photos[state.galleryPhotoIndex];
  const vehicleName = `${vehicle.brand} ${vehicle.model}`;
  document.getElementById("gallery-title").textContent = vehicleName;
  document.getElementById("gallery-photo").src = `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1200&q=85`;
  document.getElementById("gallery-photo").alt = `Foto ilustrativa ${state.galleryPhotoIndex + 1} de ${vehicleName}`;
  document.getElementById("gallery-caption").textContent = `Fotos ilustrativas · ${state.galleryPhotoIndex + 1} de ${photos.length}`;
  document.getElementById("gallery-thumbnails").innerHTML = photos.map((photoId, index) =>
    `<button class="gallery-thumbnail${index === state.galleryPhotoIndex ? " is-active" : ""}" type="button" data-gallery-index="${index}" aria-label="Ver foto ${index + 1}" aria-pressed="${index === state.galleryPhotoIndex}"><img src="https://images.unsplash.com/${photoId}?auto=format&amp;fit=crop&amp;w=180&amp;h=120&amp;q=70" alt="" loading="lazy"></button>`,
  ).join("");
}

function openVehicleGallery(id) {
  const vehicle = state.vehicles.find((item) => Number(item.id) === Number(id));
  if (!vehicle) return;
  state.galleryVehicleId = vehicle.id;
  state.galleryPhotoIndex = 0;
  renderVehicleGallery();
  openModal("gallery-modal");
}

function addEmployerRow(employer = {}) {
  const list = document.getElementById("employer-list");
  if (list.querySelectorAll("[data-employer-row]").length >= 3) {
    toast("Você pode cadastrar no máximo 3 fontes de renda.", true);
    return;
  }
  const row = document.createElement("div");
  row.className = "employer-row";
  row.dataset.employerRow = "";
  row.innerHTML = `<label class="form-field"><span>Entidade empregadora / fonte de renda <b>*</b></span><input data-employer-name required value="${escapeHtml(employer.name || "")}" placeholder="Nome da empresa ou entidade" /></label>
    <label class="form-field"><span>Rendimento mensal (R$) <b>*</b></span><input data-employer-income type="number" min="1" step="0.01" required value="${Number(employer.monthlyIncome) || ""}" placeholder="0,00" /></label>
    <button class="remove-employer" type="button" data-remove-employer aria-label="Remover fonte de renda">×</button>`;
  list.append(row);
}

function renderProfile() {
  if (!state.user || isStaff()) return;
  const client = currentClient();
  const user = state.user;
  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-rg").value = client?.rg || "";
  document.getElementById("profile-cpf").value = client?.cpf || "";
  document.getElementById("profile-address").value = client?.address || "";
  document.getElementById("profile-profession").value = client?.profession || "";
  document.getElementById("employer-list").replaceChildren();
  const employers = client?.employers?.length ? client.employers.slice(0, 3) : [{}];
  employers.forEach((employer) => addEmployerRow(employer));
  document.getElementById("delete-profile").hidden = !client;
  document.getElementById("profile-message").textContent = "";
}

function renderRequestForm() {
  const select = document.getElementById("request-vehicle");
  if (!select) return;
  const editing = state.requests.find((item) => Number(item.id) === Number(state.editingRequestId));
  const allowedVehicles = state.vehicles.filter((vehicle) =>
    vehicle.status === "Disponível" || (editing && Number(editing.vehicleId) === Number(vehicle.id)),
  );
  const previous = select.value;
  select.innerHTML = `<option value="">Selecione um veículo</option>${allowedVehicles.map((vehicle) =>
    `<option value="${escapeHtml(vehicle.id)}">${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} · ${formatCurrency(vehicle.dailyRate)}/dia</option>`,
  ).join("")}`;
  if (editing) {
    document.getElementById("request-step").textContent = "EDITAR PEDIDO";
    select.value = String(editing.vehicleId);
    document.getElementById("request-start").value = editing.startDate;
    document.getElementById("request-end").value = editing.endDate;
    document.getElementById("request-notes").value = editing.notes || "";
    document.querySelector("#request-form button[type='submit']").innerHTML = "Salvar alterações <span aria-hidden=\"true\">→</span>";
    document.getElementById("request-cancel-edit").hidden = false;
  } else {
    document.getElementById("request-step").textContent = "NOVO PEDIDO";
    if (state.pendingVehicleId) select.value = String(state.pendingVehicleId);
    else if (allowedVehicles.some((vehicle) => String(vehicle.id) === previous)) select.value = previous;
    document.getElementById("request-start").value = "";
    document.getElementById("request-end").value = "";
    document.getElementById("request-notes").value = "";
    document.querySelector("#request-form button[type='submit']").innerHTML = "Enviar pedido <span aria-hidden=\"true\">→</span>";
    document.getElementById("request-cancel-edit").hidden = true;
  }
  document.getElementById("request-message").textContent = "";
  updateEstimate();
}

function dateSpan(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.floor((end - start) / 86400000) + 1;
}

function updateEstimate() {
  const vehicle = state.vehicles.find((item) => String(item.id) === document.getElementById("request-vehicle").value);
  const start = document.getElementById("request-start").value;
  const end = document.getElementById("request-end").value;
  const estimate = document.getElementById("request-estimate");
  if (!vehicle || !start || !end || dateSpan(start, end) < 1) {
    estimate.innerHTML = `<span>Estimativa do aluguel</span><strong>Selecione um veículo e as datas</strong>`;
    return;
  }
  const days = dateSpan(start, end);
  estimate.innerHTML = `<span>${days} ${days === 1 ? "diária" : "diárias"} · ${formatCurrency(vehicle.dailyRate)} por dia</span><strong>${formatCurrency(days * Number(vehicle.dailyRate))}</strong>`;
}

function statusClass(status = "") {
  return `status-${status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-")}`;
}

function statusBadge(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

function renderOrders() {
  if (!state.user || isStaff()) return;
  const orders = state.requests.filter((item) => Number(item.userId) === Number(state.user.id))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  document.getElementById("orders-summary").innerHTML = `<span class="form-step">VISÃO GERAL</span><h2>${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}</h2><p>Seu histórico de solicitações e contratos.</p>`;
  const target = document.getElementById("orders-list");
  const selectedOrder = orders.find((order) => Number(order.id) === Number(state.selectedRequestId)) || orders[0];
  state.selectedRequestId = selectedOrder?.id || null;
  target.innerHTML = orders.length ? orders.map((order) => {
      const canEdit = order.status === "Em análise";
      const selected = Number(order.id) === Number(selectedOrder?.id);
      const vehicle = state.vehicles.find((item) => Number(item.id) === Number(order.vehicleId));
      return `<article class="order-card${selected ? " is-selected" : ""}">
        <button class="order-card-select" type="button" data-select-order="${escapeHtml(order.id)}" aria-pressed="${selected}">
          <span class="order-car-thumb">${carIllustration(Number(order.vehicleId) - 1, "lazy", `Foto ilustrativa de ${order.vehicleName}`)}</span>
          <span class="order-card-main"><span class="order-card-heading"><strong>${escapeHtml(order.vehicleName)}</strong>${statusBadge(order.status)}</span><small>Pedido #${escapeHtml(order.id)} · ${escapeHtml(vehicle?.year || "—")} · ${escapeHtml(order.days)} ${Number(order.days) === 1 ? "diária" : "diárias"}</small></span>
          <span class="order-card-dates"><small>PERÍODO</small><strong>${formatDate(order.startDate)} <span aria-hidden="true">→</span> ${formatDate(order.endDate)}</strong></span>
          <span class="order-card-total"><small>VALOR TOTAL</small><strong>${formatCurrency(order.totalValue)}</strong></span>
        </button>
        ${canEdit ? `<div class="order-actions"><button class="button button-outline" type="button" data-edit-order="${escapeHtml(order.id)}">Editar pedido</button><button class="button button-danger" type="button" data-cancel-order="${escapeHtml(order.id)}">Cancelar</button></div>` : ""}
      </article>`;
    }).join("") : `<div class="empty-state"><strong>Você ainda não fez nenhum pedido</strong>Encontre um carro e comece a planejar sua próxima viagem.<br /><button class="button button-primary mt-3" type="button" data-nav="veiculos">Explorar veículos</button></div>`;

  const details = document.getElementById("order-details");
  if (!selectedOrder) {
    details.innerHTML = "";
    return;
  }
  const client = currentClient();
  const vehicle = state.vehicles.find((item) => Number(item.id) === Number(selectedOrder.vehicleId));
  const reviewed = ["Aprovado", "Rejeitado", "Cancelado"].includes(selectedOrder.status);
  const approved = selectedOrder.status === "Aprovado";
  details.innerHTML = `<div class="order-details-heading"><div><span class="form-step">DETALHES DA SOLICITAÇÃO</span><h2>Pedido #${escapeHtml(selectedOrder.id)}</h2></div>${statusBadge(selectedOrder.status)}</div>
    <div class="order-details-grid">
      <article class="detail-panel detail-vehicle"><h3>Veículo solicitado</h3><div class="detail-car-image">${carIllustration(Number(selectedOrder.vehicleId) - 1 || 0, "lazy", `Foto ilustrativa de ${selectedOrder.vehicleName}`)}</div><strong>${escapeHtml(selectedOrder.vehicleName)}</strong><p>${escapeHtml(vehicle?.year || "—")} · Matrícula ${escapeHtml(vehicle?.matricula || "—")} · Placa ${escapeHtml(vehicle?.plate || "—")}</p><span class="detail-price">${formatCurrency(selectedOrder.totalValue)} <small>valor total</small></span></article>
      <article class="detail-panel"><h3>Dados do pedido</h3><dl class="detail-list"><div><dt>Data de retirada</dt><dd>${formatDate(selectedOrder.startDate)}</dd></div><div><dt>Data de devolução</dt><dd>${formatDate(selectedOrder.endDate)}</dd></div><div><dt>Período</dt><dd>${escapeHtml(selectedOrder.days)} ${Number(selectedOrder.days) === 1 ? "diária" : "diárias"}</dd></div><div><dt>Profissão</dt><dd>${escapeHtml(client?.profession || "Não informada")}</dd></div><div><dt>Renda mensal</dt><dd>${formatCurrency(totalIncome(client))}</dd></div></dl>${selectedOrder.notes ? `<p class="detail-note"><strong>Observação:</strong> ${escapeHtml(selectedOrder.notes)}</p>` : ""}</article>
      <article class="detail-panel detail-progress"><h3>Acompanhamento</h3><ol class="status-timeline">
        <li class="is-done"><span></span><strong>Pedido enviado</strong><small>${formatDate(String(selectedOrder.createdAt || "").slice(0, 10))}</small></li>
        <li class="${reviewed ? "is-done" : "is-current"}"><span></span><strong>Análise financeira</strong><small>${reviewed ? "Análise concluída" : "Aguardando avaliação"}</small></li>
        <li class="${approved ? "is-done" : ""}"><span></span><strong>${approved ? "Contrato aprovado" : selectedOrder.status === "Rejeitado" ? "Pedido não aprovado" : selectedOrder.status === "Cancelado" ? "Pedido cancelado" : "Resultado da análise"}</strong><small>${selectedOrder.analysisNote ? escapeHtml(selectedOrder.analysisNote) : approved ? "Seu pedido foi aprovado." : "Aguardando decisão do agente."}</small></li>
      </ol></article>
    </div>`;
}

function clientForRequest(requestItem) {
  return state.clients.find((client) => Number(client.id) === Number(requestItem.clientId));
}

function totalIncome(client) {
  return (client?.employers || []).reduce((total, employer) => total + Number(employer.monthlyIncome || 0), 0);
}

function renderAnalysis() {
  if (!isStaff()) return;
  const pending = state.requests.filter((item) => item.status === "Em análise");
  const approved = state.requests.filter((item) => item.status === "Aprovado").length;
  const rejected = state.requests.filter((item) => item.status === "Rejeitado").length;
  document.getElementById("analysis-stats").innerHTML = [
    ["Pedidos recebidos", state.requests.length, "Total de solicitações"],
    ["Em análise", pending.length, "Aguardando avaliação"],
    ["Aprovados", approved, "Contratos aprovados"],
    ["Rejeitados", rejected, "Pedidos não aprovados"],
  ].map(([label, count, description]) =>
    `<article class="analysis-stat"><span>${label}</span><strong>${count}</strong><small>${description}</small></article>`,
  ).join("");
  document.getElementById("analysis-summary").innerHTML = `<span class="form-step">FILA DE ANÁLISE</span><h2>${pending.length} ${pending.length === 1 ? "pedido aguardando" : "pedidos aguardando"}</h2><p>Pedidos avaliados: ${state.requests.length - pending.length}.</p>`;
  const target = document.getElementById("analysis-list");
  target.innerHTML = pending.length ? pending.map((order, index) => {
    const client = clientForRequest(order);
    const income = totalIncome(client) || Number(order.monthlyIncome) || 0;
    const ratio = income ? (Number(order.totalValue) / income) * 100 : null;
    const incomeSources = client?.employers?.map((employer) => `${employer.name}: ${formatCurrency(employer.monthlyIncome)}`).join(" · ") || "Renda não informada";
    return `<article class="analysis-card">
      <div class="analysis-top"><div><h3>${escapeHtml(order.clientName)} · ${escapeHtml(order.vehicleName)}</h3><p>Pedido #${escapeHtml(order.id)} · Enviado em ${formatDate(String(order.createdAt || "").slice(0, 10))}</p></div>${statusBadge(order.status)}</div>
      <div class="analysis-metrics">
        <div class="metric-box"><span>Renda mensal declarada</span><strong>${formatCurrency(income)}</strong></div>
        <div class="metric-box"><span>Valor do pedido</span><strong>${formatCurrency(order.totalValue)}</strong></div>
        <div class="metric-box"><span>Período solicitado</span><strong>${escapeHtml(order.days)} ${Number(order.days) === 1 ? "dia" : "dias"}</strong></div>
        <div class="metric-box"><span>Comprometimento estimado</span><strong>${ratio === null ? "Sem renda" : `${ratio.toFixed(1).replace(".", ",")}%`}</strong></div>
      </div>
      <p class="analysis-note"><strong>Fontes:</strong> ${escapeHtml(incomeSources)}${order.notes ? `<br /><strong>Observação:</strong> ${escapeHtml(order.notes)}` : ""}</p>
      <div class="analysis-actions"><button class="button button-danger" type="button" data-review-order="${escapeHtml(order.id)}" data-review-status="Rejeitado">Rejeitar pedido</button><button class="button button-primary" type="button" data-review-order="${escapeHtml(order.id)}" data-review-status="Aprovado">Aprovar contrato</button></div>
    </article>`;
  }).join("") : `<div class="empty-state"><strong>Nenhum pedido aguardando análise</strong>Os novos pedidos enviados pelos clientes aparecerão aqui.</div>`;
}

function renderFleet() {
  if (!isStaff()) return;
  const target = document.getElementById("fleet-list");
  target.innerHTML = state.vehicles.length ? state.vehicles.map((vehicle, index) =>
    `<article class="fleet-row">
      <div class="fleet-vehicle"><div class="order-car-thumb">${carIllustration(index)}</div><div><strong>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</strong><small>${escapeHtml(vehicle.year)} · Mat. ${escapeHtml(vehicle.matricula || "—")} · Placa ${escapeHtml(vehicle.plate)}</small></div></div>
      <div class="fleet-cell"><span>Diária</span><strong>${formatCurrency(vehicle.dailyRate)}</strong></div>
      <div class="fleet-cell"><span>Proprietário</span><strong>${escapeHtml(vehicle.ownerType)} · ${escapeHtml(vehicle.ownerName)}</strong></div>
      <div class="fleet-cell"><span>Status</span><strong>${escapeHtml(vehicle.status)}</strong></div>
      <div class="fleet-actions"><button class="button button-outline" type="button" data-edit-vehicle="${escapeHtml(vehicle.id)}">Editar</button><button class="button button-danger" type="button" data-delete-vehicle="${escapeHtml(vehicle.id)}" aria-label="Excluir veículo ${escapeHtml(vehicle.model)}">Excluir</button></div>
    </article>`,
  ).join("") : `<div class="empty-state"><strong>Nenhum veículo cadastrado</strong>Cadastre o primeiro veículo para exibi-lo no catálogo.</div>`;
}

function openModal(id, authMode) {
  const modal = document.getElementById(id);
  if (id === "auth-modal") setAuthMode(authMode || "login");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const firstInput = [...modal.querySelectorAll("input:not([type='hidden']):not([hidden])")]
    .find((input) => !input.closest("[hidden]"));
  const focusTarget = firstInput || modal.querySelector("[data-close-modal]");
  if (focusTarget) window.setTimeout(() => focusTarget.focus(), 50);
}

function closeModals() {
  document.querySelectorAll(".modal-backdrop.is-open").forEach((modal) => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  });
  document.body.style.overflow = "";
}

function setAuthMode(mode) {
  state.authMode = mode;
  const registering = mode === "register";
  document.querySelectorAll(".register-only").forEach((element) => { element.hidden = !registering; });
  const nameInput = document.getElementById("auth-name");
  nameInput.required = registering;
  document.getElementById("auth-eyebrow").textContent = registering ? "BORA COMEÇAR" : "BEM-VINDO À ROTA";
  document.getElementById("auth-title").textContent = registering ? "Crie sua conta" : "Entre na sua conta";
  document.getElementById("auth-description").textContent = registering
    ? "Cadastre-se para enviar e acompanhar seus pedidos."
    : "Acesse seus pedidos e continue de onde parou.";
  document.getElementById("auth-submit").innerHTML = registering
    ? "Criar minha conta <span aria-hidden=\"true\">→</span>"
    : "Entrar na minha conta <span aria-hidden=\"true\">→</span>";
  document.getElementById("auth-switch-copy").textContent = registering ? "Já tem uma conta?" : "Ainda não tem uma conta?";
  document.getElementById("auth-switch").textContent = registering ? "Entrar" : "Criar conta";
  document.getElementById("auth-message").textContent = "";
  document.getElementById("auth-password").autocomplete = registering ? "new-password" : "current-password";
}

async function completeLogin(user) {
  state.user = user;
  localStorage.setItem("rota-user-id", String(user.id));
  closeModals();
  await loadData();
  toast(`Que bom ter você por aqui, ${user.name.split(" ")[0]}!`);
  const nextView = state.pendingView || (isStaff() ? "analise" : "inicio");
  state.pendingView = null;
  routeTo(nextView);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const message = document.getElementById("auth-message");
  message.textContent = "";
  const email = document.getElementById("auth-email").value.trim().toLocaleLowerCase("pt-BR");
  const password = document.getElementById("auth-password").value;
  try {
    if (state.authMode === "login") {
      const users = await api.get(`/users?email=${encodeURIComponent(email)}`);
      const user = users.find((item) => item.password === password);
      if (!user) {
        message.textContent = "E-mail ou senha incorretos.";
        return;
      }
      await completeLogin(user);
      return;
    }

    const name = document.getElementById("auth-name").value.trim();
    if (password.length < 6) {
      message.textContent = "A senha deve ter pelo menos 6 caracteres.";
      return;
    }
    const existing = await api.get(`/users?email=${encodeURIComponent(email)}`);
    if (existing.length) {
      message.textContent = "Já existe uma conta com este e-mail.";
      return;
    }
    const user = await api.post("/users", { name, email, password, role: "client" });
    try {
      await api.post("/clients", {
        userId: user.id,
        rg: "",
        cpf: "",
        address: "",
        profession: "",
        employers: [],
      });
    } catch (clientError) {
      try {
        await api.delete(`/users/${user.id}`);
      } catch (rollbackError) {
        throw new Error(`${clientError.message} A conta criada não pôde ser removida: ${rollbackError.message}`);
      }
      throw clientError;
    }
    await completeLogin(user);
    routeTo("cadastro");
  } catch (error) {
    message.textContent = error.message;
    console.error(error);
  }
}

async function handleHomeLogin(event) {
  event.preventDefault();
  const message = document.getElementById("home-login-message");
  message.textContent = "";
  const email = document.getElementById("home-login-email").value.trim().toLocaleLowerCase("pt-BR");
  const password = document.getElementById("home-login-password").value;
  try {
    const users = await api.get(`/users?email=${encodeURIComponent(email)}`);
    const user = users.find((item) => item.password === password);
    if (!user) {
      message.textContent = "E-mail ou senha incorretos.";
      return;
    }
    await completeLogin(user);
  } catch (error) {
    message.textContent = error.message;
    console.error(error);
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const message = document.getElementById("profile-message");
  message.textContent = "";
  const employerRows = [...document.querySelectorAll("[data-employer-row]")];
  if (employerRows.length > 3) {
    message.textContent = "Cadastre no máximo 3 fontes de renda.";
    return;
  }
  const employers = employerRows.map((row) => ({
    name: row.querySelector("[data-employer-name]").value.trim(),
    monthlyIncome: Number(row.querySelector("[data-employer-income]").value),
  }));
  if (!employers.length || employers.some((employer) => !employer.name || employer.monthlyIncome <= 0)) {
    message.textContent = "Informe ao menos uma fonte de renda com valor mensal maior que zero.";
    return;
  }

  const fullName = document.getElementById("profile-name").value.trim();
  const clientData = {
    userId: state.user.id,
    rg: document.getElementById("profile-rg").value.trim(),
    cpf: document.getElementById("profile-cpf").value.trim(),
    address: document.getElementById("profile-address").value.trim(),
    profession: document.getElementById("profile-profession").value.trim(),
    employers,
  };
  const client = currentClient();
  try {
    await Promise.all([
      client ? api.patch(`/clients/${client.id}`, clientData) : api.post("/clients", clientData),
      api.patch(`/users/${state.user.id}`, { name: fullName }),
    ]);
    state.user = { ...state.user, name: fullName };
    await loadData();
    document.getElementById("profile-message").textContent = "Cadastro salvo com sucesso.";
    toast("Seus dados foram atualizados.");
    if (state.pendingView === "solicitar" || !state.pendingView) {
      state.pendingView = null;
    }
  } catch (error) {
    message.textContent = error.message;
    reportError(error);
  }
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  const message = document.getElementById("request-message");
  message.textContent = "";
  const client = currentClient();
  if (!isProfileComplete(client)) {
    message.textContent = "Complete seu cadastro e informe sua renda antes de solicitar.";
    routeTo("cadastro");
    return;
  }

  const vehicle = state.vehicles.find((item) => String(item.id) === document.getElementById("request-vehicle").value);
  const startDate = document.getElementById("request-start").value;
  const endDate = document.getElementById("request-end").value;
  if (!vehicle) {
    message.textContent = "Selecione um veículo disponível.";
    return;
  }
  const editingOrder = state.requests.find((item) => Number(item.id) === Number(state.editingRequestId));
  if (vehicle.status !== "Disponível" && Number(editingOrder?.vehicleId) !== Number(vehicle.id)) {
    message.textContent = "Este veículo não está mais disponível para novas solicitações.";
    return;
  }
  if (!startDate || !endDate || dateSpan(startDate, endDate) < 1) {
    message.textContent = "A data de devolução deve ser igual ou posterior à retirada.";
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${startDate}T00:00:00`) < today) {
    message.textContent = "A data de retirada não pode estar no passado.";
    return;
  }
  const hasDateConflict = state.requests.some((order) =>
    Number(order.vehicleId) === Number(vehicle.id) &&
    Number(order.id) !== Number(state.editingRequestId) &&
    !["Cancelado", "Rejeitado"].includes(order.status) &&
    startDate <= order.endDate &&
    endDate >= order.startDate,
  );
  if (hasDateConflict) {
    message.textContent = "Este veículo já tem um pedido ativo para alguma dessas datas. Escolha outro período ou veículo.";
    return;
  }
  const days = dateSpan(startDate, endDate);
  const payload = {
    clientId: client.id,
    userId: state.user.id,
    clientName: state.user.name,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.brand} ${vehicle.model}`,
    startDate,
    endDate,
    days,
    totalValue: days * Number(vehicle.dailyRate),
    monthlyIncome: totalIncome(client),
    notes: document.getElementById("request-notes").value.trim(),
    status: "Em análise",
    updatedAt: new Date().toISOString(),
  };
  try {
    if (state.editingRequestId) {
      await api.patch(`/requests/${state.editingRequestId}`, payload);
      toast("Seu pedido foi atualizado e voltou para análise.");
    } else {
      await api.post("/requests", { ...payload, createdAt: new Date().toISOString() });
      toast("Pedido enviado! Você pode acompanhar a análise em Meus pedidos.");
    }
    state.editingRequestId = null;
    await loadData();
    routeTo("pedidos");
  } catch (error) {
    message.textContent = error.message;
    reportError(error);
  }
}

function startEditingRequest(id) {
  const order = state.requests.find((item) => Number(item.id) === Number(id));
  if (!order || Number(order.userId) !== Number(state.user?.id) || order.status !== "Em análise") {
    toast("Este pedido não pode mais ser alterado.", true);
    return;
  }
  state.editingRequestId = order.id;
  routeTo("solicitar");
}

async function cancelRequest(id) {
  const order = state.requests.find((item) => Number(item.id) === Number(id));
  if (!order || Number(order.userId) !== Number(state.user?.id) || order.status !== "Em análise") return;
  if (!window.confirm("Deseja cancelar este pedido?")) return;
  try {
    await api.patch(`/requests/${id}`, { status: "Cancelado", cancelledAt: new Date().toISOString() });
    await loadData();
    toast("Pedido cancelado.");
  } catch (error) {
    reportError(error);
  }
}

async function reviewRequest(id, status) {
  if (!isStaff() || !["Aprovado", "Rejeitado"].includes(status)) return;
  const order = state.requests.find((item) => Number(item.id) === Number(id));
  if (!order || order.status !== "Em análise") return;
  const analysisNote = status === "Aprovado"
    ? "Renda e valor do pedido avaliados. Contrato aprovado."
    : "Pedido não aprovado pela análise financeira.";
  try {
    await api.patch(`/requests/${id}`, {
      status,
      reviewedBy: state.user.name,
      reviewedAt: new Date().toISOString(),
      analysisNote,
    });
    await loadData();
    toast(`Pedido ${status.toLocaleLowerCase("pt-BR")}.`);
  } catch (error) {
    reportError(error);
  }
}

function openVehicleDialog(vehicle = null) {
  if (!isStaff()) return;
  state.editingVehicleId = vehicle?.id || null;
  document.getElementById("vehicle-modal-title").textContent = vehicle ? "Editar veículo" : "Cadastrar veículo";
  document.getElementById("vehicle-brand").value = vehicle?.brand || "";
  document.getElementById("vehicle-model").value = vehicle?.model || "";
  document.getElementById("vehicle-year").value = vehicle?.year || new Date().getFullYear();
  document.getElementById("vehicle-registration").value = vehicle?.matricula || "";
  document.getElementById("vehicle-plate").value = vehicle?.plate || "";
  document.getElementById("vehicle-rate").value = vehicle?.dailyRate || "";
  document.getElementById("vehicle-status").value = vehicle?.status || "Disponível";
  document.getElementById("vehicle-owner-type").value = vehicle?.ownerType || "Empresa";
  document.getElementById("vehicle-owner-name").value = vehicle?.ownerName || "";
  document.getElementById("vehicle-message").textContent = "";
  openModal("vehicle-modal");
}

async function handleVehicleSubmit(event) {
  event.preventDefault();
  const message = document.getElementById("vehicle-message");
  const payload = {
    brand: document.getElementById("vehicle-brand").value.trim(),
    model: document.getElementById("vehicle-model").value.trim(),
    year: Number(document.getElementById("vehicle-year").value),
    matricula: document.getElementById("vehicle-registration").value.trim().toLocaleUpperCase("pt-BR"),
    plate: document.getElementById("vehicle-plate").value.trim().toLocaleUpperCase("pt-BR"),
    dailyRate: Number(document.getElementById("vehicle-rate").value),
    status: document.getElementById("vehicle-status").value,
    ownerType: document.getElementById("vehicle-owner-type").value,
    ownerName: document.getElementById("vehicle-owner-name").value.trim(),
  };
  if (!payload.brand || !payload.model || !payload.matricula || !payload.plate || !payload.ownerName || payload.dailyRate <= 0) {
    message.textContent = "Preencha os campos obrigatórios com valores válidos.";
    return;
  }
  try {
    if (state.editingVehicleId) {
      await api.patch(`/vehicles/${state.editingVehicleId}`, payload);
      toast("Veículo atualizado.");
    } else {
      await api.post("/vehicles", payload);
      toast("Veículo cadastrado no catálogo.");
    }
    closeModals();
    await loadData();
  } catch (error) {
    message.textContent = error.message;
    reportError(error);
  }
}

async function deleteVehicle(id) {
  if (!isStaff()) return;
  const vehicle = state.vehicles.find((item) => Number(item.id) === Number(id));
  if (!vehicle || !window.confirm(`Excluir ${vehicle.brand} ${vehicle.model} do catálogo?`)) return;
  try {
    await api.delete(`/vehicles/${id}`);
    await loadData();
    toast("Veículo removido do catálogo.");
  } catch (error) {
    reportError(error);
  }
}

async function deleteProfile() {
  const client = currentClient();
  if (!client || !window.confirm("Deseja realmente excluir seu cadastro de cliente?")) return;
  try {
    await api.delete(`/clients/${client.id}`);
    await loadData();
    toast("Cadastro de cliente excluído. Sua conta continua ativa.");
  } catch (error) {
    reportError(error);
  }
}

async function logout() {
  localStorage.removeItem("rota-user-id");
  state.user = null;
  state.pendingView = null;
  state.editingRequestId = null;
  state.pendingVehicleId = null;
  closeModals();
  renderShell();
  routeTo("inicio");
  toast("Você saiu da sua conta.");
}

document.getElementById("orders-list").addEventListener("click", (event) => {
  const selection = event.target.closest("[data-select-order]");
  if (!selection) return;
  state.selectedRequestId = selection.dataset.selectOrder;
  renderOrders();
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button, [data-nav]");
  if (!target) return;
  try {
    if (target.matches("[data-nav]")) {
      const next = target.dataset.nav;
      if (next === "como-funciona") {
        routeTo("inicio");
        window.setTimeout(() => document.getElementById("como-funciona").scrollIntoView({ behavior: "smooth" }), 80);
        return;
      }
      routeTo(next);
      return;
    }
    if (target.id === "login-open") openModal("auth-modal", "login");
    else if (target.id === "register-open") openModal("auth-modal", "register");
    else if (target.id === "logout-button") await logout();
    else if (target.id === "auth-switch") setAuthMode(state.authMode === "login" ? "register" : "login");
    else if (target.matches("[data-close-modal]")) closeModals();
    else if (target.id === "add-employer") addEmployerRow();
    else if (target.matches("[data-remove-employer]")) {
      const rows = document.querySelectorAll("[data-employer-row]");
      if (rows.length === 1) {
        toast("Mantenha ao menos uma fonte de renda no cadastro.", true);
        return;
      }
      target.closest("[data-employer-row]").remove();
    } else if (target.matches("[data-request-vehicle]")) {
      state.pendingVehicleId = target.dataset.requestVehicle;
      routeTo("solicitar");
    } else if (target.matches("[data-gallery-vehicle]")) {
      openVehicleGallery(target.dataset.galleryVehicle);
    } else if (target.matches("[data-gallery-step]")) {
      const vehicle = state.vehicles.find((item) => Number(item.id) === Number(state.galleryVehicleId));
      if (!vehicle) return;
      const photoCount = galleryPhotosFor(vehicle).length;
      state.galleryPhotoIndex = (state.galleryPhotoIndex + Number(target.dataset.galleryStep) + photoCount) % photoCount;
      renderVehicleGallery();
    } else if (target.matches("[data-gallery-index]")) {
      state.galleryPhotoIndex = Number(target.dataset.galleryIndex);
      renderVehicleGallery();
    } else if (target.matches("[data-edit-order]")) startEditingRequest(target.dataset.editOrder);
    else if (target.matches("[data-cancel-order]")) await cancelRequest(target.dataset.cancelOrder);
    else if (target.matches("[data-review-order]")) await reviewRequest(target.dataset.reviewOrder, target.dataset.reviewStatus);
    else if (target.id === "request-cancel-edit") {
      state.editingRequestId = null;
      renderRequestForm();
      routeTo("pedidos");
    } else if (target.id === "new-vehicle") openVehicleDialog();
    else if (target.matches("[data-edit-vehicle]")) {
      const vehicle = state.vehicles.find((item) => Number(item.id) === Number(target.dataset.editVehicle));
      openVehicleDialog(vehicle);
    } else if (target.matches("[data-delete-vehicle]")) await deleteVehicle(target.dataset.deleteVehicle);
    else if (target.id === "delete-profile") await deleteProfile();
    else if (target.id === "mobile-menu-toggle" || target.closest(".mobile-menu-toggle")) {
      const menu = document.querySelector(".main-nav");
      const isOpen = menu.classList.toggle("is-open");
      document.querySelector(".mobile-menu-toggle").setAttribute("aria-expanded", String(isOpen));
    }
  } catch (error) {
    reportError(error);
  }
});

document.getElementById("auth-form").addEventListener("submit", handleAuthSubmit);
document.getElementById("home-login-form").addEventListener("submit", handleHomeLogin);
document.getElementById("profile-form").addEventListener("submit", handleProfileSubmit);
document.getElementById("request-form").addEventListener("submit", handleRequestSubmit);
document.getElementById("vehicle-form").addEventListener("submit", handleVehicleSubmit);
document.getElementById("catalog-search").addEventListener("input", renderCatalog);
document.getElementById("catalog-sort").addEventListener("change", renderCatalog);
document.getElementById("request-vehicle").addEventListener("change", updateEstimate);
document.getElementById("request-start").addEventListener("change", updateEstimate);
document.getElementById("request-end").addEventListener("change", updateEstimate);
document.getElementById("hero-register-open").addEventListener("click", () => openModal("auth-modal", "register"));
document.querySelectorAll(".modal-backdrop").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModals();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});
window.addEventListener("hashchange", () => {
  const requested = location.hash.slice(1) || "inicio";
  if (requested !== state.view) routeTo(requested, { replaceHash: true });
});

async function initialize() {
  const userId = localStorage.getItem("rota-user-id");
  if (userId) {
    try {
      state.user = await api.get(`/users/${encodeURIComponent(userId)}`);
    } catch (error) {
      localStorage.removeItem("rota-user-id");
      console.error("A sessão salva não pôde ser recuperada.", error);
    }
  }
  try {
    await loadData();
    const requestedView = location.hash.slice(1);
    routeTo(views.has(requestedView) ? requestedView : "inicio", { replaceHash: true });
  } catch (error) {
    renderShell();
    reportError(error);
  }
}

initialize();
