import { api } from "./api.js";

const state = {
  user: null,
  clients: [],
  clientUsers: [],
  banks: [],
  vehicles: [],
  carCatalog: [],
  municipalities: [],
  vehiclePhotos: [],
  requests: [],
  view: "inicio",
  authMode: "login",
  editingRequestId: null,
  editingVehicleId: null,
  pendingView: null,
  pendingVehicleId: null,
  selectedRequestId: null,
  rejectingRequestId: null,
  rejectionDraft: "",
  galleryVehicleId: null,
  galleryPhotoIndex: 0,
  pendingVehiclePhotoDataUrl: null,
  vehiclePhotoProcessing: false,
  pendingCnhPhotos: { front: null, back: null },
  cnhPhotoProcessing: new Set(),
  currentPage: "inicio",
  catalogCategory: "Todos",
  catalogState: "",
  catalogCity: "",
  requestStep: 1,
};

const views = new Set(["inicio", "veiculos", "cadastro", "solicitar", "pedidos", "analise", "clientes", "frota"]);
const pageFiles = {
  inicio: "index.html",
  veiculos: "veiculos.html",
  cadastro: "cadastro.html",
  solicitar: "solicitar.html",
  pedidos: "pedidos.html",
  analise: "analise.html",
  clientes: "clientes.html",
  frota: "frota.html",
};
const staffRoles = new Set(["agent", "company", "bank"]);

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

function municipalitiesForState(uf) {
  return state.municipalities.filter((municipality) => municipality.uf === uf);
}

function municipalityById(id) {
  return state.municipalities.find((municipality) => String(municipality.ibge) === String(id));
}

function addSelectOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function populateStateSelect(select, includeAll, selectedUf = "") {
  if (!select) return;
  select.replaceChildren();
  addSelectOption(select, "", includeAll ? "Todos os estados" : "Selecione o estado");
  const states = [...new Map(state.municipalities.map((municipality) => [
    municipality.uf,
    { uf: municipality.uf, name: municipality.state },
  ])).values()].sort((a, b) => a.uf.localeCompare(b.uf, "pt-BR"));
  states.forEach((item) => addSelectOption(select, item.uf, `${item.uf} — ${item.name}`));
  select.value = selectedUf;
}

function populateMunicipalitySelect(select, uf, includeAll, selectedCity = "") {
  if (!select) return;
  select.replaceChildren();
  addSelectOption(select, "", includeAll ? "Todas as cidades" : "Selecione o município");
  if (uf) {
    municipalitiesForState(uf).forEach((municipality) => {
      addSelectOption(select, String(municipality.ibge), municipality.name);
    });
  }
  select.disabled = !uf;
  select.value = selectedCity;
}

function setupMunicipalitySelectors() {
  const query = new URLSearchParams(location.search);
  const selectorPairs = [
    { stateId: "home-state", cityId: "home-city", state: "", city: "", includeAll: false },
    {
      stateId: "catalog-state",
      cityId: "catalog-city",
      state: query.get("state") || "",
      city: query.get("city") || "",
      includeAll: true,
    },
    { stateId: "profile-state", cityId: "profile-city", state: "", city: "", includeAll: false },
    { stateId: "vehicle-state", cityId: "vehicle-city", state: "", city: "", includeAll: false },
  ];

  selectorPairs.forEach(({ stateId, cityId, state: selectedState, city: selectedCity, includeAll }) => {
    const stateSelect = document.getElementById(stateId);
    const citySelect = document.getElementById(cityId);
    if (!stateSelect || !citySelect) return;
    populateStateSelect(stateSelect, includeAll, selectedState);
    populateMunicipalitySelect(citySelect, stateSelect.value, includeAll, selectedCity);
    stateSelect.addEventListener("change", () => {
      populateMunicipalitySelect(citySelect, stateSelect.value, includeAll);
      if (stateId === "catalog-state") {
        state.catalogState = stateSelect.value;
        state.catalogCity = "";
        renderCatalog();
      }
    });
    if (stateId === "catalog-state") {
      state.catalogState = selectedState;
      state.catalogCity = citySelect.value;
      citySelect.addEventListener("change", () => {
        state.catalogCity = citySelect.value;
        renderCatalog();
      });
    }
  });
}

function toast(message, isError = false) {
  const region = document.getElementById("toast-region");
  if (!region) return;
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
  const needsClientData = ["cadastro", "solicitar", "pedidos", "analise", "clientes"].includes(state.currentPage);
  const [clients, vehicles, requests, banks, clientUsers] = await Promise.all([
    needsClientData ? api.get("/clients") : Promise.resolve([]),
    api.get("/vehicles"),
    api.get("/requests"),
    api.get("/users?role=bank"),
    state.currentPage === "clientes" ? api.get("/users?role=client") : Promise.resolve([]),
  ]);
  state.clients = clients;
  state.clientUsers = clientUsers.filter((user) => user.role === "client");
  state.vehicles = vehicles;
  state.requests = requests;
  state.banks = banks.filter((user) => user.role === "bank");
  renderAll();
}

async function loadVehiclePhotos() {
  let response;
  try {
    response = await fetch(new URL("./data/vehicle-photos.json", import.meta.url));
  } catch (error) {
    throw new Error(`Não foi possível carregar as fotos da frota. ${error.message}`);
  }
  if (!response.ok) {
    throw new Error(`Não foi possível carregar as fotos da frota (${response.status}).`);
  }

  const catalog = await response.json();
  if (!catalog || !Array.isArray(catalog.photos) || catalog.photos.some((photo) =>
    !photo || !Number.isInteger(Number(photo.vehicleId)) ||
    (photo.path !== null && typeof photo.path !== "string") ||
    ("flipHorizontal" in photo && typeof photo.flipHorizontal !== "boolean"),
  )) {
    throw new Error("O catálogo de fotos dos veículos está em um formato inválido.");
  }
  state.vehiclePhotos = catalog.photos;
}

async function loadMunicipalities() {
  let response;
  try {
    response = await fetch(new URL("./data/municipalities.json", import.meta.url));
  } catch (error) {
    throw new Error(`Não foi possível carregar a base de municípios. ${error.message}`);
  }
  if (!response.ok) {
    throw new Error(`Não foi possível carregar a base de municípios (${response.status}).`);
  }

  const catalog = await response.json();
  if (!catalog || !Array.isArray(catalog.municipalities) || catalog.municipalities.length !== catalog.count ||
    catalog.municipalities.some((municipality) =>
      !municipality || !Number.isInteger(municipality.ibge) ||
      typeof municipality.name !== "string" || typeof municipality.uf !== "string" ||
      typeof municipality.state !== "string",
    )) {
    throw new Error("A base de municípios está em um formato inválido.");
  }
  state.municipalities = catalog.municipalities;
  setupMunicipalitySelectors();
  const datalist = document.getElementById("municipality-options");
  if (datalist) {
    datalist.replaceChildren();
    state.municipalities.forEach((municipality) => {
      const option = document.createElement("option");
      option.value = `${municipality.name} - ${municipality.uf}`;
      datalist.append(option);
    });
  }
}

async function loadCarCatalog() {
  let response;
  try {
    response = await fetch(new URL("./data/brazilian-cars.json", import.meta.url));
  } catch (error) {
    throw new Error(`Não foi possível carregar a base de marcas e modelos. ${error.message}`);
  }
  if (!response.ok) {
    throw new Error(`Não foi possível carregar a base de marcas e modelos (${response.status}).`);
  }

  const catalog = await response.json();
  if (!catalog || !Array.isArray(catalog.brands) || catalog.brands.some((item) =>
    !item || typeof item.brand !== "string" || !Array.isArray(item.models) || item.models.some((model) => typeof model !== "string"),
  )) {
    throw new Error("A base de marcas e modelos está em um formato inválido.");
  }
  state.carCatalog = catalog.brands;
  const modelCount = state.carCatalog.reduce((total, item) => total + item.models.length, 0);
  const status = document.getElementById("vehicle-catalog-status");
  if (status) {
    status.textContent = `Sugestões carregadas: ${state.carCatalog.length} marcas e ${modelCount.toLocaleString("pt-BR")} modelos. Você também pode digitar outro valor.`;
  }
  updateVehicleSuggestions();
}

function updateVehicleSuggestions() {
  const brandInput = document.getElementById("vehicle-brand");
  const brandOptions = document.getElementById("vehicle-brand-options");
  const modelOptions = document.getElementById("vehicle-model-options");
  if (!brandInput || !brandOptions || !modelOptions) return;

  brandOptions.replaceChildren();
  state.carCatalog.forEach(({ brand }) => {
    const option = document.createElement("option");
    option.value = brand;
    brandOptions.append(option);
  });

  const selectedBrand = state.carCatalog.find(({ brand }) =>
    brand.toLocaleLowerCase("pt-BR") === brandInput.value.trim().toLocaleLowerCase("pt-BR"),
  );
  modelOptions.replaceChildren();
  selectedBrand?.models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    modelOptions.append(option);
  });
}

function renderAll() {
  renderShell();
  renderHomeVehicles();
  renderCatalog();
  renderProfile();
  renderRequestForm();
  renderOrders();
  renderAnalysis();
  renderClients();
  renderFleet();
}

async function loadSharedLayout() {
  const slots = [...document.querySelectorAll("[data-layout]")];
  await Promise.all(slots.map(async (slot) => {
    const name = slot.dataset.layout;
    const response = await fetch(`partials/${name}.html?v=1.8.17`);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o componente compartilhado "${name}" (${response.status}).`);
    }
    slot.innerHTML = await response.text();
  }));
}

function renderShell() {
  const authenticated = Boolean(state.user);
  document.querySelectorAll(".auth-nav").forEach((item) => {
    item.hidden = !authenticated || isStaff();
  });
  document.querySelectorAll(".agent-nav").forEach((item) => {
    item.hidden = !isStaff();
  });
  const loginButton = document.getElementById("login-open");
  if (loginButton) loginButton.hidden = authenticated;
  const registerButton = document.getElementById("register-open");
  if (registerButton) registerButton.hidden = authenticated;
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) logoutButton.hidden = !authenticated;
  const accountName = document.getElementById("account-name");
  if (accountName) {
    accountName.hidden = !authenticated;
    accountName.textContent = authenticated ? state.user.name : "";
  }
  const homeAuthPanel = document.getElementById("home-auth-panel");
  if (homeAuthPanel) homeAuthPanel.hidden = authenticated;
  const homeSessionPanel = document.getElementById("home-session-panel");
  if (homeSessionPanel) homeSessionPanel.hidden = !authenticated;
  if (authenticated && homeSessionPanel) {
    document.getElementById("home-session-name").textContent = state.user.name.split(" ")[0];
    document.getElementById("home-session-description").textContent = isStaff()
      ? "Acesse as análises financeiras e a gestão da frota."
      : "Consulte seus pedidos e acompanhe seus contratos.";
    const action = document.getElementById("home-session-action");
    action.dataset.nav = isStaff() ? "analise" : "pedidos";
    action.textContent = isStaff() ? "Acessar painel do agente" : "Acessar meus pedidos";
  }
  document.querySelectorAll(".footer-copy").forEach((footer) => {
    footer.textContent = `© ${new Date().getFullYear()} Rota. Feito para ir mais longe.`;
  });
  const footerClientLink = document.getElementById("footer-client-link");
  if (footerClientLink) {
    footerClientLink.href = isStaff() ? pageFiles.clientes : pageFiles.cadastro;
    footerClientLink.textContent = isStaff() ? "Cadastro de clientes" : authenticated ? "Meu cadastro" : "Cadastro do cliente";
  }
  const footerOrdersLink = document.getElementById("footer-orders-link");
  if (footerOrdersLink && isStaff()) footerOrdersLink.href = pageFiles.analise;
  document.querySelectorAll(".nav-link").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === state.currentPage);
  });
}

function routeTo(view) {
  if (!views.has(view)) view = "inicio";
  if (view === "como-funciona") {
    if (state.currentPage !== "inicio") {
      location.href = "index.html#como-funciona";
    } else {
      document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
    }
    return;
  }
  if (view === "cadastro" || view === "pedidos" || view === "solicitar") {
    if (!state.user) {
      state.pendingView = view;
      sessionStorage.setItem("rota-pending-view", view);
      openModal("auth-modal", "login");
      return;
    }
    if (isStaff()) {
      toast("Esta área é exclusiva para clientes.", true);
      view = "inicio";
    }
    if (view === "solicitar" && !isProfileComplete(currentClient())) {
      toast("Complete seu cadastro antes de solicitar um aluguel.", true);
      state.pendingView = "solicitar";
      sessionStorage.setItem("rota-pending-view", "solicitar");
      view = "cadastro";
    }
  }
  if ((view === "analise" || view === "clientes" || view === "frota") && !isStaff()) {
    toast("Esta área é exclusiva para agentes, empresas e bancos.", true);
    view = "inicio";
  }

  if (view !== state.currentPage) {
    if (state.pendingVehicleId) sessionStorage.setItem("rota-pending-vehicle-id", state.pendingVehicleId);
    if (state.editingRequestId) sessionStorage.setItem("rota-editing-request-id", state.editingRequestId);
    location.href = pageFiles[view];
    return;
  }

  state.view = view;
  document.querySelector(".main-nav")?.classList.remove("is-open");
  document.querySelector(".mobile-menu-toggle")?.setAttribute("aria-expanded", "false");
  if (view === "solicitar") {
    renderRequestForm();
    if (state.pendingVehicleId) {
      document.getElementById("request-vehicle").value = String(state.pendingVehicleId);
      state.pendingVehicleId = null;
      sessionStorage.removeItem("rota-pending-vehicle-id");
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
    client.city?.trim() &&
    client.state?.trim() &&
    client.profession?.trim() &&
    client.cnhNumber?.trim() &&
    client.cnhCategory?.trim() &&
    client.cnhExpiry?.trim() &&
    client.cnhPhotoFrontDataUrl?.startsWith("data:image/jpeg;base64,") &&
    client.cnhPhotoBackDataUrl?.startsWith("data:image/jpeg;base64,") &&
    Array.isArray(client.employers) &&
    client.employers.length > 0,
  );
}

function vehiclePhotoFor(vehicle) {
  if (typeof vehicle?.photoDataUrl === "string" && vehicle.photoDataUrl.startsWith("data:image/jpeg;base64,")) {
    return {
      vehicleId: vehicle.id,
      path: vehicle.photoDataUrl,
      uploaded: true,
      flipHorizontal: false,
    };
  }
  return state.vehiclePhotos.find((photo) => Number(photo.vehicleId) === Number(vehicle?.id)) || null;
}

function vehicleCategory(vehicle) {
  if (vehicle?.category) return vehicle.category;
  const model = `${vehicle?.brand || ""} ${vehicle?.model || ""}`.toLocaleLowerCase("pt-BR");
  if (/strada|toro|saveiro|hilux|ranger/.test(model)) return "Picape";
  if (/spin|minivan|7 lugares/.test(model)) return "Minivan";
  if (/corolla(?! cross)|city|virtus|sedan|sedã/.test(model)) return "Sedã";
  if (/polo|onix|argo|hb20|hatch/.test(model)) return "Hatch";
  if (/kwid|mobi|compacto/.test(model)) return "Compacto";
  return "SUV";
}

function carIllustration(vehicle, loading = "lazy", alt = "Foto ilustrativa de veículo") {
  const photo = vehiclePhotoFor(vehicle);
  if (!photo?.path) {
    return `<div class="vehicle-photo-placeholder" role="img" aria-label="Foto de ${escapeHtml(alt)} indisponível"><span aria-hidden="true">▰</span><strong>Foto não disponível</strong></div>`;
  }
  return `<img class="vehicle-illustration${photo.flipHorizontal ? " is-flipped" : ""}" src="${escapeHtml(photo.path)}" alt="${escapeHtml(alt)}" title="Foto de referência; a versão pode variar." loading="${loading}" decoding="async">`;
}

function vehicleCard(vehicle, index, compact = false) {
  const available = vehicle.status === "Disponível";
  const title = `${vehicle.brand} ${vehicle.model}`;
  const photo = vehiclePhotoFor(vehicle);
  const category = vehicleCategory(vehicle);
  const button = available
    ? `<button class="vehicle-action" type="button" data-request-vehicle="${escapeHtml(vehicle.id)}">Solicitar aluguel →</button>`
    : `<span class="vehicle-action text-secondary">Indisponível</span>`;
  return `<div class="${compact ? "col-md-6 col-lg-4" : "col-sm-6 col-lg-4"}">
    <article class="vehicle-card">
      <div class="vehicle-visual tone-${index % 4}">
        <span class="vehicle-tag${available ? "" : " unavailable"}">${available ? "● Disponível" : "● Indisponível"}</span>
        ${carIllustration(vehicle, compact ? "lazy" : "eager", title)}
        <button class="vehicle-gallery-open" type="button" data-gallery-vehicle="${escapeHtml(vehicle.id)}" aria-label="${photo?.path ? `Ver foto e créditos de ${escapeHtml(title)}` : `Buscar fotos de ${escapeHtml(title)}`}"><span aria-hidden="true">⌕</span>${photo?.path ? "Ver foto" : "Buscar fotos"}</button>
      </div>
      <div class="vehicle-body">
        <div class="vehicle-meta"><span class="vehicle-category">${escapeHtml(category)}</span><span>${escapeHtml(vehicle.ownerType || "Frota")}</span></div>
        <h3><span>${escapeHtml(vehicle.brand)}</span> <small>${escapeHtml(vehicle.model)}</small></h3>
        ${vehicle.city && vehicle.state ? `<p class="vehicle-location">${escapeHtml(vehicle.city)} - ${escapeHtml(vehicle.state)}</p>` : ""}
        <dl class="vehicle-specs">
          <div><dt>Matrícula</dt><dd>${escapeHtml(vehicle.matricula || "—")}</dd></div>
          <div><dt>Ano</dt><dd>${escapeHtml(vehicle.year || "—")}</dd></div>
          <div><dt>Placa</dt><dd>${escapeHtml(vehicle.plate || "—")}</dd></div>
          <div><dt>Câmbio</dt><dd>${escapeHtml(vehicle.transmission || "Não informado")}</dd></div>
          <div><dt>Combustível</dt><dd>${escapeHtml(vehicle.fuel || "Não informado")}</dd></div>
        </dl>
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
  if (!target) return;
  const available = state.vehicles.filter((vehicle) => vehicle.status === "Disponível").slice(0, 3);
  target.innerHTML = available.length
    ? available.map((vehicle, index) => vehicleCard(vehicle, index, false)).join("")
    : `<div class="empty-state"><strong>Novos carros estão chegando</strong>Volte em breve para conferir o catálogo.</div>`;
}

function renderCatalog() {
  const target = document.getElementById("catalog-vehicles");
  if (!target) return;
  const search = document.getElementById("catalog-search")?.value.trim().toLocaleLowerCase("pt-BR") || "";
  const sort = document.getElementById("catalog-sort")?.value || "featured";
  const vehicles = state.vehicles
    .filter((vehicle) => state.catalogCategory === "Todos" || vehicleCategory(vehicle) === state.catalogCategory)
    .filter((vehicle) => !state.catalogState || vehicle.state === state.catalogState)
    .filter((vehicle) => !state.catalogCity || String(vehicle.cityIbge) === state.catalogCity)
    .filter((vehicle) => `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.matricula} ${vehicle.plate} ${vehicle.city || ""} ${vehicle.state || ""}`.toLocaleLowerCase("pt-BR").includes(search))
    .sort((a, b) => {
      if (sort === "price-asc") return Number(a.dailyRate) - Number(b.dailyRate);
      if (sort === "price-desc") return Number(b.dailyRate) - Number(a.dailyRate);
      return Number(a.id) - Number(b.id);
    });
  const catalogCount = document.getElementById("catalog-count");
  const city = municipalityById(state.catalogCity);
  const locationDescription = city
    ? `em ${escapeHtml(city.name)} - ${escapeHtml(city.uf)}`
    : state.catalogState
      ? `no estado ${escapeHtml(state.catalogState)}`
      : "no catálogo";
  if (catalogCount) {
    const categoryDescription = state.catalogCategory === "Todos" ? "" : ` na categoria ${escapeHtml(state.catalogCategory)}`;
    catalogCount.innerHTML = `<strong>${vehicles.length} ${vehicles.length === 1 ? "veículo" : "veículos"}</strong> ${locationDescription}${categoryDescription}`;
  }
  target.innerHTML = vehicles.length
    ? vehicles.map((vehicle, index) => vehicleCard(vehicle, index, true)).join("")
    : `<div class="empty-state"><strong>Nenhum veículo encontrado</strong>Tente buscar por outra marca ou modelo.</div>`;
}

function galleryPhotosFor(vehicle) {
  const photo = vehiclePhotoFor(vehicle);
  return photo?.path ? [photo] : [];
}

function renderVehicleGallery() {
  if (!document.getElementById("gallery-modal")) return;
  const vehicle = state.vehicles.find((item) => Number(item.id) === Number(state.galleryVehicleId));
  if (!vehicle) return;
  const photos = galleryPhotosFor(vehicle);
  const photo = photos[state.galleryPhotoIndex];
  const vehicleName = `${vehicle.brand} ${vehicle.model}`;
  const galleryPhoto = document.getElementById("gallery-photo");
  const galleryPlaceholder = document.getElementById("gallery-placeholder");
  const sourceLink = document.getElementById("gallery-source-link");
  const galleryLinks = document.querySelector(".gallery-links");
  document.getElementById("gallery-title").textContent = vehicleName;
  galleryPhoto.hidden = !photo;
  galleryPlaceholder.hidden = Boolean(photo);
  if (photo) {
    galleryPhoto.src = photo.path;
    galleryPhoto.alt = photo.uploaded
      ? `Foto enviada da frota: ${vehicleName}.`
      : `Foto de referência de ${vehicleName}; ano ou versão podem variar.`;
    document.getElementById("gallery-caption").textContent = photo.uploaded
      ? "Foto enviada pela equipe responsável pela frota."
      : `Crédito: ${photo.author} · Licença ${photo.license}. Ano e versão podem variar.`;
  } else {
    galleryPhoto.removeAttribute("src");
    galleryPhoto.alt = "";
    document.getElementById("gallery-caption").textContent = "Foto desta geração indisponível.";
  }
  document.querySelectorAll("[data-gallery-step]").forEach((button) => { button.hidden = photos.length < 2; });
  const thumbnails = document.getElementById("gallery-thumbnails");
  thumbnails.hidden = photos.length < 2;
  thumbnails.innerHTML = photos.map((item, index) =>
    `<button class="gallery-thumbnail${index === state.galleryPhotoIndex ? " is-active" : ""}" type="button" data-gallery-index="${index}" aria-label="Ver foto ${index + 1}" aria-pressed="${index === state.galleryPhotoIndex}"><img src="${escapeHtml(item.path)}" alt="" loading="lazy"></button>`,
  ).join("");
  sourceLink.hidden = !photo || photo.uploaded;
  galleryLinks.hidden = !photo || photo.uploaded;
  if (photo && !photo.uploaded && photo.sourceUrl) {
    sourceLink.href = photo.sourceUrl;
  } else {
    sourceLink.removeAttribute("href");
  }
  galleryPhoto.classList.toggle("is-flipped", Boolean(photo?.flipHorizontal));
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
  if (!document.getElementById("profile-form") || !state.user || isStaff()) return;
  const client = currentClient();
  const user = state.user;
  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-rg").value = client?.rg || "";
  document.getElementById("profile-cpf").value = client?.cpf || "";
  document.getElementById("profile-address").value = client?.address || "";
  const profileState = document.getElementById("profile-state");
  const profileCity = document.getElementById("profile-city");
  profileState.value = client?.state || "";
  populateMunicipalitySelect(profileCity, profileState.value, false, client?.cityIbge ? String(client.cityIbge) : "");
  document.getElementById("profile-profession").value = client?.profession || "";
  document.getElementById("profile-cnh-number").value = client?.cnhNumber || "";
  document.getElementById("profile-cnh-category").value = client?.cnhCategory || "";
  document.getElementById("profile-cnh-expiry").value = client?.cnhExpiry || "";
  updateCnhPhotoPreview("front", client);
  updateCnhPhotoPreview("back", client);
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
  const bankSelect = document.getElementById("request-credit-bank");
  bankSelect.innerHTML = `<option value="">Selecione um banco</option>${state.banks.map((bank) =>
    `<option value="${escapeHtml(bank.id)}">${escapeHtml(bank.name)}</option>`,
  ).join("")}`;
  if (editing) {
    select.value = String(editing.vehicleId);
    document.getElementById("request-start").value = editing.startDate;
    document.getElementById("request-end").value = editing.endDate;
    document.getElementById("request-pickup-location").value = editing.pickupLocation || "";
    document.getElementById("request-return-location").value = editing.returnLocation || "";
    document.getElementById("request-notes").value = editing.notes || "";
    document.getElementById("request-contract-type").value = editing.contractType || "";
    document.getElementById("request-property-option").value = editing.propertyOption || "";
    document.getElementById("request-credit-requested").checked = Boolean(editing.creditRequested);
    bankSelect.value = editing.creditBankId ? String(editing.creditBankId) : "";
    document.getElementById("request-credit-amount").value = editing.creditAmount || "";
    document.getElementById("request-cancel-edit").hidden = false;
  } else {
    if (state.pendingVehicleId) select.value = String(state.pendingVehicleId);
    else if (allowedVehicles.some((vehicle) => String(vehicle.id) === previous)) select.value = previous;
    document.getElementById("request-start").value = "";
    document.getElementById("request-end").value = "";
    document.getElementById("request-pickup-location").value = "";
    document.getElementById("request-return-location").value = "";
    document.getElementById("request-notes").value = "";
    document.getElementById("request-contract-type").value = "";
    document.getElementById("request-property-option").value = "";
    document.getElementById("request-credit-requested").checked = false;
    bankSelect.value = "";
    document.getElementById("request-credit-amount").value = "";
    document.getElementById("request-cancel-edit").hidden = true;
  }
  const today = new Date();
  document.getElementById("request-start").min = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  document.getElementById("request-message").textContent = "";
  state.requestStep = 1;
  updateCreditFields();
  setRequestStep(1);
  updateEstimate();
}

function updateCreditFields() {
  const requested = document.getElementById("request-credit-requested")?.checked || false;
  const fields = document.getElementById("request-credit-fields");
  if (!fields) return;
  fields.hidden = !requested;
  document.getElementById("request-credit-bank").required = requested;
  document.getElementById("request-credit-amount").required = requested;
}

function renderRequestVehiclePreview() {
  const target = document.getElementById("request-vehicle-preview");
  if (!target) return;
  const vehicle = state.vehicles.find((item) => String(item.id) === document.getElementById("request-vehicle").value);
  if (!vehicle) {
    target.innerHTML = `<p class="form-hint">As informações do veículo selecionado aparecerão aqui.</p>`;
    return;
  }
  target.innerHTML = `<div class="request-vehicle-card"><div class="request-vehicle-image">${carIllustration(vehicle, "eager", `${vehicle.brand} ${vehicle.model}`)}</div>
    <div><span class="vehicle-category">${escapeHtml(vehicleCategory(vehicle))}</span><h4>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</h4><p>${escapeHtml(vehicle.year)} · ${escapeHtml(vehicle.matricula)} · ${escapeHtml(vehicle.plate)}</p>
    <div class="request-vehicle-specs"><span>${escapeHtml(vehicle.transmission || "Não informado")}</span><span>${escapeHtml(vehicle.fuel || "Não informado")}</span><strong>${formatCurrency(vehicle.dailyRate)} / diária</strong></div></div></div>`;
}

function renderRequestReview() {
  const target = document.getElementById("request-review");
  if (!target) return;
  const vehicle = state.vehicles.find((item) => String(item.id) === document.getElementById("request-vehicle").value);
  const start = document.getElementById("request-start").value;
  const end = document.getElementById("request-end").value;
  const days = start && end && dateSpan(start, end) > 0 ? dateSpan(start, end) : 0;
  const total = vehicle ? days * Number(vehicle.dailyRate) : 0;
  const creditRequested = document.getElementById("request-credit-requested").checked;
  const bank = state.banks.find((item) => String(item.id) === document.getElementById("request-credit-bank").value);
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
  target.innerHTML = `<div class="request-review-vehicle">${vehicle ? carIllustration(vehicle, "lazy", `${vehicle.brand} ${vehicle.model}`) : ""}<div><small>VEÍCULO</small><strong>${vehicle ? `${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}` : "Não selecionado"}</strong><span>${vehicle ? `${escapeHtml(vehicle.year)} · ${escapeHtml(vehicle.plate)}` : ""}</span></div></div>
    <dl class="request-review-details">
      ${detail("Retirada", `${formatDate(start)} · ${document.getElementById("request-pickup-location").value.trim()}`)}
      ${detail("Devolução", `${formatDate(end)} · ${document.getElementById("request-return-location").value.trim()}`)}
      ${detail("Contrato", document.getElementById("request-contract-type").value)}
      ${detail("Propriedade", document.getElementById("request-property-option").value)}
      ${detail("Crédito bancário", creditRequested ? `${bank?.name || "Banco não selecionado"} · ${formatCurrency(document.getElementById("request-credit-amount").value)}` : "Não solicitado")}
      ${detail("Período e valor", vehicle && days ? `${days} ${days === 1 ? "diária" : "diárias"} · ${formatCurrency(total)}` : "Informe as datas")}
    </dl>${document.getElementById("request-notes").value.trim() ? `<p class="request-review-note"><strong>Observações:</strong> ${escapeHtml(document.getElementById("request-notes").value.trim())}</p>` : ""}`;
}

function setRequestStep(step) {
  state.requestStep = step;
  document.querySelectorAll("[data-request-stage]").forEach((section) => {
    section.hidden = Number(section.dataset.requestStage) !== step;
  });
  document.querySelectorAll("[data-step-label]").forEach((item) => {
    const itemStep = Number(item.dataset.stepLabel);
    item.classList.toggle("is-current", itemStep === step);
    item.classList.toggle("is-done", itemStep < step);
    if (itemStep === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  const editing = Boolean(state.editingRequestId);
  document.getElementById("request-step").textContent = `${editing ? "EDITAR PEDIDO" : "NOVO PEDIDO"} · ETAPA ${step} DE 5`;
  document.getElementById("request-progress-bar").style.width = `${((step - 1) / 4) * 100}%`;
  document.getElementById("request-previous").hidden = step === 1;
  document.getElementById("request-next").hidden = step === 5;
  document.getElementById("request-submit").hidden = step !== 5;
  document.getElementById("request-submit").innerHTML = editing
    ? "Salvar alterações <span aria-hidden=\"true\">→</span>"
    : "Enviar pedido <span aria-hidden=\"true\">→</span>";
  if (step === 5) renderRequestReview();
}

function validateRequestStep(step) {
  const message = document.getElementById("request-message");
  message.textContent = "";
  if (step === 1) {
    const selected = document.getElementById("request-vehicle").value;
    const editing = state.requests.find((item) => Number(item.id) === Number(state.editingRequestId));
    const vehicle = state.vehicles.find((item) => String(item.id) === selected);
    if (!vehicle || (vehicle.status !== "Disponível" && Number(editing?.vehicleId) !== Number(vehicle.id))) {
      message.textContent = "Selecione um veículo disponível.";
      return false;
    }
  } else if (step === 2) {
    const start = document.getElementById("request-start").value;
    const end = document.getElementById("request-end").value;
    const pickup = document.getElementById("request-pickup-location").value.trim();
    const returnLocation = document.getElementById("request-return-location").value.trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!start || !end || dateSpan(start, end) < 1) {
      message.textContent = "Informe datas válidas; a devolução deve ser igual ou posterior à retirada.";
      return false;
    }
    if (new Date(`${start}T00:00:00`) < today) {
      message.textContent = "A data de retirada não pode estar no passado.";
      return false;
    }
    if (!pickup || !returnLocation) {
      message.textContent = "Informe os locais de retirada e devolução.";
      return false;
    }
  } else if (step === 3) {
    if (!document.getElementById("request-contract-type").value || !document.getElementById("request-property-option").value) {
      message.textContent = "Selecione o tipo de contrato e a condição de propriedade.";
      return false;
    }
  } else if (step === 4 && document.getElementById("request-credit-requested").checked) {
    const bankId = document.getElementById("request-credit-bank").value;
    const creditAmount = Number(document.getElementById("request-credit-amount").value);
    if (!bankId || !Number.isFinite(creditAmount) || creditAmount <= 0) {
      message.textContent = "Selecione um banco e informe um valor de crédito maior que zero.";
      return false;
    }
    const vehicle = state.vehicles.find((item) => String(item.id) === document.getElementById("request-vehicle").value);
    const days = dateSpan(document.getElementById("request-start").value, document.getElementById("request-end").value);
    if (vehicle && creditAmount > days * Number(vehicle.dailyRate)) {
      message.textContent = "O crédito solicitado não pode exceder o valor estimado do aluguel.";
      return false;
    }
  }
  return true;
}

function moveRequestStep(direction) {
  if (direction > 0 && !validateRequestStep(state.requestStep)) return;
  document.getElementById("request-message").textContent = "";
  setRequestStep(Math.max(1, Math.min(5, state.requestStep + direction)));
}

function dateSpan(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.floor((end - start) / 86400000) + 1;
}

function updateEstimate() {
  const select = document.getElementById("request-vehicle");
  const estimate = document.getElementById("request-estimate");
  if (!select) return;
  const vehicle = state.vehicles.find((item) => String(item.id) === select.value);
  const start = document.getElementById("request-start").value;
  const end = document.getElementById("request-end").value;
  if (estimate) {
    if (!vehicle || !start || !end || dateSpan(start, end) < 1) {
      estimate.innerHTML = `<span>Estimativa do aluguel</span><strong>Selecione um veículo e as datas</strong>`;
    } else {
      const days = dateSpan(start, end);
      estimate.innerHTML = `<span>${days} ${days === 1 ? "diária" : "diárias"} · ${formatCurrency(vehicle.dailyRate)} por dia</span><strong>${formatCurrency(days * Number(vehicle.dailyRate))}</strong>`;
    }
  }
  renderRequestVehiclePreview();
  if (state.requestStep === 5) renderRequestReview();
}

function statusClass(status = "") {
  return `status-${status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-")}`;
}

function statusBadge(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

function renderOrders() {
  if (!document.getElementById("orders-list") || !state.user || isStaff()) return;
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
          <span class="order-car-thumb">${carIllustration(vehicle, "lazy", order.vehicleName)}</span>
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
      <article class="detail-panel detail-vehicle"><h3>Veículo solicitado</h3><div class="detail-car-image">${carIllustration(vehicle, "lazy", selectedOrder.vehicleName)}</div><strong>${escapeHtml(selectedOrder.vehicleName)}</strong><p>${escapeHtml(vehicle?.year || "—")} · Matrícula ${escapeHtml(vehicle?.matricula || "—")} · Placa ${escapeHtml(vehicle?.plate || "—")} · ${escapeHtml(vehicle?.transmission || "Câmbio não informado")} · ${escapeHtml(vehicle?.fuel || "Combustível não informado")}</p><span class="detail-price">${formatCurrency(selectedOrder.totalValue)} <small>valor total</small></span></article>
      <article class="detail-panel"><h3>Dados do pedido</h3><dl class="detail-list"><div><dt>Retirada</dt><dd>${formatDate(selectedOrder.startDate)} · ${escapeHtml(selectedOrder.pickupLocation || "Local não informado")}</dd></div><div><dt>Devolução</dt><dd>${formatDate(selectedOrder.endDate)} · ${escapeHtml(selectedOrder.returnLocation || "Local não informado")}</dd></div><div><dt>Período</dt><dd>${escapeHtml(selectedOrder.days)} ${Number(selectedOrder.days) === 1 ? "diária" : "diárias"}</dd></div><div><dt>Tipo de contrato</dt><dd>${escapeHtml(selectedOrder.contractType || "Não informado")}</dd></div><div><dt>Propriedade</dt><dd>${escapeHtml(selectedOrder.propertyOption || "Não informada")}</dd></div><div><dt>Crédito bancário</dt><dd>${selectedOrder.creditRequested ? `${escapeHtml(selectedOrder.creditBankName || "Banco")} · ${formatCurrency(selectedOrder.creditAmount)}` : "Não solicitado"}</dd></div><div><dt>Profissão</dt><dd>${escapeHtml(client?.profession || "Não informada")}</dd></div><div><dt>Renda mensal</dt><dd>${formatCurrency(totalIncome(client))}</dd></div></dl>${selectedOrder.notes ? `<p class="detail-note"><strong>Observação:</strong> ${escapeHtml(selectedOrder.notes)}</p>` : ""}</article>
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
  return (client?.employers || []).slice(0, 3).reduce((total, employer) => total + Number(employer.monthlyIncome || 0), 0);
}

function showClientProfile(client, clientName) {
  if (!isStaff()) {
    toast("Esta informação é exclusiva para agentes, empresas e bancos.", true);
    return;
  }
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${escapeHtml(value || "Não informado")}</dd></div>`;
  const employers = (client?.employers || []).slice(0, 3);
  const incomeDetails = employers.length
    ? `<ul class="client-detail-income">${employers.map((employer) =>
      `<li><span>${escapeHtml(employer.name || "Fonte de renda")}</span><strong>${formatCurrency(employer.monthlyIncome)}/mês</strong></li>`,
    ).join("")}</ul>`
    : `<p class="client-detail-empty">Nenhuma fonte de renda informada.</p>`;
  const cnhPhoto = (label, value) => value?.startsWith("data:image/jpeg;base64,")
    ? `<figure class="client-cnh-photo"><img src="${escapeHtml(value)}" alt="${escapeHtml(label)}" /><figcaption>${escapeHtml(label)}</figcaption></figure>`
    : `<p class="client-detail-empty">${escapeHtml(label)} não enviada.</p>`;
  document.getElementById("client-detail-title").textContent = clientName || "Dados do cliente";
  document.getElementById("client-detail-content").innerHTML = `
    <dl class="client-detail-grid">
      ${detail("Nome completo", clientName)}
      ${detail("RG", client?.rg)}
      ${detail("CPF", client?.cpf)}
      ${detail("Profissão", client?.profession)}
      ${detail("Endereço", client?.address)}
      ${detail("Município", client?.city && client?.state ? `${client.city} - ${client.state}` : "")}
      ${detail("Número de registro da CNH", client?.cnhNumber)}
      ${detail("Categoria da CNH", client?.cnhCategory)}
      ${detail("Validade da CNH", client?.cnhExpiry ? formatDate(client.cnhExpiry) : "")}
    </dl>
    <section class="client-detail-income-section">
      <div><h3>Fotos da CNH</h3><span>Frente e verso</span></div>
      <div class="client-cnh-photos">
        ${cnhPhoto("Frente da CNH", client?.cnhPhotoFrontDataUrl)}
        ${cnhPhoto("Verso da CNH", client?.cnhPhotoBackDataUrl)}
      </div>
    </section>
    <section class="client-detail-income-section">
      <div><h3>Entidades empregadoras e rendimentos</h3><span>${employers.length} de 3 fontes</span></div>
      ${incomeDetails}
      <p class="client-detail-total">Renda mensal total <strong>${formatCurrency(totalIncome(client))}</strong></p>
    </section>
    ${client ? "" : `<p class="client-detail-empty">O cliente ainda não possui cadastro completo no sistema.</p>`}`;
  openModal("client-detail-modal");
}

function showClientDetails(requestId) {
  const requestItem = state.requests.find((item) => Number(item.id) === Number(requestId));
  if (!requestItem) {
    toast("Não foi possível localizar o pedido selecionado.", true);
    return;
  }
  showClientProfile(clientForRequest(requestItem), requestItem.clientName);
}

function showClientRecord(clientId) {
  const client = state.clients.find((item) => Number(item.id) === Number(clientId));
  if (!client) {
    toast("Não foi possível localizar o cadastro selecionado.", true);
    return;
  }
  const user = state.clientUsers.find((item) => Number(item.id) === Number(client.userId));
  showClientProfile(client, user?.name || "Cliente");
}

function renderClients() {
  const target = document.getElementById("client-directory-list");
  if (!target || !isStaff()) return;
  const search = document.getElementById("client-directory-search")?.value.trim().toLocaleLowerCase("pt-BR") || "";
  const accountsById = new Map(state.clientUsers.map((user) => [Number(user.id), user]));
  const clients = state.clients
    .map((client) => ({ client, user: accountsById.get(Number(client.userId)) }))
    .filter(({ client, user }) =>
      `${user?.name || ""} ${user?.email || ""} ${client.cpf || ""} ${client.city || ""} ${client.state || ""}`
        .toLocaleLowerCase("pt-BR").includes(search),
    )
    .sort((a, b) => String(a.user?.name || "").localeCompare(String(b.user?.name || ""), "pt-BR"));
  const completeCount = state.clients.filter(isProfileComplete).length;
  const summary = document.getElementById("client-directory-summary");
  if (summary) {
    summary.innerHTML = `<span class="form-step">BASE DE CLIENTES</span><h2>${state.clients.length} ${state.clients.length === 1 ? "cadastro" : "cadastros"}</h2><p>${completeCount} completos · ${state.clients.length - completeCount} precisam de informações</p>`;
  }
  target.innerHTML = clients.length ? clients.map(({ client, user }) => {
    const complete = isProfileComplete(client);
    return `<article class="client-directory-card">
      <div class="client-directory-person">
        <span class="client-directory-avatar" aria-hidden="true">${escapeHtml((user?.name || "C").trim().charAt(0).toLocaleUpperCase("pt-BR"))}</span>
        <div><h3>${escapeHtml(user?.name || "Conta de cliente indisponível")}</h3><p>${escapeHtml(user?.email || "E-mail não disponível")}</p></div>
      </div>
      <div class="client-directory-meta"><span>CPF</span><strong>${escapeHtml(client.cpf || "Não informado")}</strong></div>
      <div class="client-directory-meta"><span>Profissão</span><strong>${escapeHtml(client.profession || "Não informada")}</strong></div>
      <div class="client-directory-meta"><span>Município</span><strong>${escapeHtml(client.city && client.state ? `${client.city} - ${client.state}` : "Não informado")}</strong></div>
      <span class="client-directory-status ${complete ? "is-complete" : ""}">${complete ? "Cadastro completo" : "Cadastro incompleto"}</span>
      <div class="client-directory-actions">
        <button class="button button-outline button-small" type="button" data-view-client-record="${escapeHtml(client.id)}">Visualizar cadastro</button>
        <button class="button button-danger button-small" type="button" data-delete-client="${escapeHtml(client.id)}">Excluir</button>
      </div>
    </article>`;
  }).join("") : `<div class="empty-state"><strong>${state.clients.length ? "Nenhum cliente encontrado" : "Nenhum cadastro de cliente"}</strong>${state.clients.length ? "Tente buscar por outro nome, e-mail ou CPF." : "Os cadastros de clientes aparecerão aqui."}</div>`;
}

function renderAnalysis() {
  if (!document.getElementById("analysis-list") || !isStaff()) return;
  const pending = state.requests.filter((item) => item.status === "Em análise");
  const approved = state.requests.filter((item) => item.status === "Aprovado").length;
  const rejected = state.requests.filter((item) => item.status === "Rejeitado").length;
  const cancelled = state.requests.filter((item) => item.status === "Cancelado").length;
  document.getElementById("analysis-stats").innerHTML = [
    ["Pedidos recebidos", state.requests.length, "Total de solicitações"],
    ["Em análise", pending.length, "Aguardando avaliação"],
    ["Aprovados", approved, "Contratos aprovados"],
    ["Rejeitados", rejected, "Pedidos não aprovados"],
    ["Cancelados", cancelled, "Pedidos cancelados"],
  ].map(([label, count, description]) =>
    `<article class="analysis-stat"><span>${label}</span><strong>${count}</strong><small>${description}</small></article>`,
  ).join("");
  document.getElementById("analysis-summary").innerHTML = `<span class="form-step">PEDIDOS RECEBIDOS</span><h2>${state.requests.length} ${state.requests.length === 1 ? "pedido recebido" : "pedidos recebidos"}</h2><p>${pending.length} aguardando análise · ${state.requests.length - pending.length} com status atualizado.</p>`;
  const target = document.getElementById("analysis-list");
  const statusOrder = { "Em análise": 0, Aprovado: 1, Rejeitado: 2, Cancelado: 3 };
  const orders = [...state.requests].sort((a, b) =>
    (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4) ||
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
  target.innerHTML = orders.length ? orders.map((order) => {
    const client = clientForRequest(order);
    const income = totalIncome(client) || Number(order.monthlyIncome) || 0;
    const ratio = income ? (Number(order.totalValue) / income) * 100 : null;
    const employers = (client?.employers || []).slice(0, 3);
    const incomeSources = employers.length
      ? `<ul class="analysis-employers">${employers.map((employer) => `<li><span>${escapeHtml(employer.name)}</span><strong>${formatCurrency(employer.monthlyIncome)}/mês</strong></li>`).join("")}</ul>`
      : `<span class="text-muted">Renda não informada</span>`;
    return `<article class="analysis-card">
      <div class="analysis-top"><div><h3>${escapeHtml(order.clientName)} · ${escapeHtml(order.vehicleName)}</h3><p>Pedido #${escapeHtml(order.id)} · Enviado em ${formatDate(String(order.createdAt || "").slice(0, 10))}</p></div>${statusBadge(order.status)}</div>
      <div class="analysis-metrics">
        <div class="metric-box"><span>Renda mensal declarada</span><strong>${formatCurrency(income)}</strong></div>
        <div class="metric-box"><span>Valor do pedido</span><strong>${formatCurrency(order.totalValue)}</strong></div>
        <div class="metric-box"><span>Período solicitado</span><strong>${escapeHtml(order.days)} ${Number(order.days) === 1 ? "dia" : "dias"}</strong></div>
        <div class="metric-box"><span>Comprometimento estimado</span><strong>${ratio === null ? "Sem renda" : `${ratio.toFixed(1).replace(".", ",")}%`}</strong></div>
      </div>
      <div class="analysis-client-summary"><div><span>Profissão</span><strong>${escapeHtml(client?.profession || "Não informada")}</strong></div><div><span>Fontes de renda · até 3</span>${incomeSources}</div></div>
      <div class="analysis-client-actions"><button class="button button-outline button-small" type="button" data-view-client="${escapeHtml(order.id)}">Ver cadastro completo <span aria-hidden="true">→</span></button></div>
      <p class="analysis-note"><strong>Contrato:</strong> ${escapeHtml(order.contractType || "Não informado")} · <strong>Propriedade:</strong> ${escapeHtml(order.propertyOption || "Não informada")}<br /><strong>Retirada:</strong> ${escapeHtml(order.pickupLocation || "Local não informado")} · <strong>Devolução:</strong> ${escapeHtml(order.returnLocation || "Local não informado")}${order.creditRequested ? `<br /><strong>Crédito bancário solicitado:</strong> ${escapeHtml(order.creditBankName || "Banco")} · ${formatCurrency(order.creditAmount)}` : ""}${order.notes ? `<br /><strong>Observação:</strong> ${escapeHtml(order.notes)}` : ""}</p>
      ${order.status === "Em análise"
        ? state.rejectingRequestId === String(order.id)
          ? `<div class="analysis-rejection-form" data-rejection-form="${escapeHtml(order.id)}"><label class="form-field"><span>Motivo da rejeição <b>*</b></span><textarea name="rejection-reason" data-rejection-reason required maxlength="500" rows="3" placeholder="Explique ao cliente por que o pedido não foi aprovado.">${escapeHtml(state.rejectionDraft)}</textarea></label><div class="analysis-actions"><button class="button button-outline" type="button" data-cancel-rejection>Cancelar</button><button class="button button-danger" type="button" data-submit-rejection>Confirmar rejeição</button></div></div>`
          : `<div class="analysis-actions"><button class="button button-danger" type="button" data-start-rejection="${escapeHtml(order.id)}">Rejeitar pedido</button><button class="button button-primary" type="button" data-review-order="${escapeHtml(order.id)}" data-review-status="Aprovado">Aprovar contrato</button></div>`
        : `<p class="analysis-note"><strong>Parecer:</strong> ${escapeHtml(order.analysisNote || `Pedido ${String(order.status).toLocaleLowerCase("pt-BR")}.`)}${order.reviewedBy ? ` · Avaliado por ${escapeHtml(order.reviewedBy)}` : ""}</p>`}
    </article>`;
  }).join("") : `<div class="empty-state"><strong>Nenhum pedido recebido</strong>Os pedidos enviados pelos clientes aparecerão aqui.</div>`;
}

function renderFleet() {
  if (!document.getElementById("fleet-list") || !isStaff()) return;
  const target = document.getElementById("fleet-list");
  target.innerHTML = state.vehicles.length ? state.vehicles.map((vehicle) =>
    `<article class="fleet-row">
      <div class="fleet-vehicle"><div class="order-car-thumb">${carIllustration(vehicle)}</div><div><strong>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</strong><small>${escapeHtml(vehicle.year)} · ${escapeHtml(vehicle.city || "Cidade não informada")} - ${escapeHtml(vehicle.state || "—")} · Mat. ${escapeHtml(vehicle.matricula || "—")} · Placa ${escapeHtml(vehicle.plate)} · ${escapeHtml(vehicleCategory(vehicle))} · ${escapeHtml(vehicle.transmission || "Câmbio não informado")} · ${escapeHtml(vehicle.fuel || "Combustível não informado")}</small></div></div>
      <div class="fleet-cell"><span>Diária</span><strong>${formatCurrency(vehicle.dailyRate)}</strong></div>
      <div class="fleet-cell"><span>Proprietário</span><strong>${escapeHtml(vehicle.ownerType)} · ${escapeHtml(vehicle.ownerName)}</strong></div>
      <div class="fleet-cell"><span>Status</span><strong>${escapeHtml(vehicle.status)}</strong></div>
      <div class="fleet-actions"><button class="button button-outline" type="button" data-edit-vehicle="${escapeHtml(vehicle.id)}">Editar</button><button class="button button-danger" type="button" data-delete-vehicle="${escapeHtml(vehicle.id)}" aria-label="Excluir veículo ${escapeHtml(vehicle.model)}">Excluir</button></div>
    </article>`,
  ).join("") : `<div class="empty-state"><strong>Nenhum veículo cadastrado</strong>Cadastre o primeiro veículo para exibi-lo no catálogo.</div>`;
}

function updateVehiclePhotoPreview(vehicle = null) {
  const preview = document.getElementById("vehicle-photo-preview");
  const label = document.getElementById("vehicle-photo-preview-label");
  if (!preview || !label) return;
  const path = state.pendingVehiclePhotoDataUrl || vehiclePhotoFor(vehicle)?.path;
  preview.hidden = !path;
  label.hidden = !path;
  if (path) {
    preview.src = path;
    label.textContent = state.pendingVehiclePhotoDataUrl ? "Pré-visualização da nova foto" : "Foto atual";
  } else {
    preview.removeAttribute("src");
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("A imagem selecionada não pôde ser preparada."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

async function prepareCnhPhoto(file) {
  const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!acceptedTypes.has(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP para a CNH.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Cada foto da CNH deve ter no máximo 8 MB.");
  }

  let bitmap;
  let canvas;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / bitmap.width, 1000 / bitmap.height);
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Não foi possível preparar a foto da CNH.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let optimizedBlob = null;
    for (const quality of [0.8, 0.68, 0.55, 0.42]) {
      optimizedBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (optimizedBlob && optimizedBlob.size <= 600_000) break;
    }
    if (!optimizedBlob || optimizedBlob.size > 600_000) {
      throw new Error("A foto continua muito grande após a otimização. Escolha uma imagem menor.");
    }
    return await blobToDataUrl(optimizedBlob);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("A foto")) throw error;
    throw new Error(`Não foi possível processar a foto da CNH. ${error.message}`);
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

function updateCnhPhotoPreview(side, client = currentClient()) {
  const preview = document.getElementById(`profile-cnh-${side}-preview`);
  const label = document.getElementById(`profile-cnh-${side}-status`);
  if (!preview || !label) return;
  const photo = state.pendingCnhPhotos[side] || client?.[`cnhPhoto${side === "front" ? "Front" : "Back"}DataUrl`];
  preview.hidden = !photo;
  if (photo) {
    preview.src = photo;
    label.textContent = state.pendingCnhPhotos[side] ? "Nova foto pronta para salvar" : "Foto cadastrada";
  } else {
    preview.removeAttribute("src");
    label.textContent = "Nenhuma foto cadastrada";
  }
}

async function handleCnhPhotoChange(event) {
  const input = event.currentTarget;
  const side = input.dataset.cnhSide;
  const file = input.files?.[0];
  if (!file || !["front", "back"].includes(side)) return;
  const message = document.getElementById("profile-message");
  message.textContent = "";
  state.cnhPhotoProcessing.add(side);
  try {
    state.pendingCnhPhotos[side] = await prepareCnhPhoto(file);
    updateCnhPhotoPreview(side);
  } catch (error) {
    input.value = "";
    state.pendingCnhPhotos[side] = null;
    updateCnhPhotoPreview(side);
    message.textContent = error.message;
  } finally {
    state.cnhPhotoProcessing.delete(side);
  }
}

async function prepareVehiclePhoto(file) {
  const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!acceptedTypes.has(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 12 MB.");
  }

  let bitmap;
  let canvas;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bitmap.width, 1200 / bitmap.height);
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Não foi possível preparar a imagem para o catálogo.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let optimizedBlob = null;
    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      optimizedBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (optimizedBlob && optimizedBlob.size <= 1_200_000) break;
    }
    if (!optimizedBlob || optimizedBlob.size > 1_200_000) {
      throw new Error("A imagem continua muito grande após a otimização. Escolha uma imagem menor.");
    }
    return await blobToDataUrl(optimizedBlob);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("A imagem")) throw error;
    throw new Error(`Não foi possível processar a imagem selecionada. ${error.message}`);
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

async function handleVehiclePhotoChange(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  const message = document.getElementById("vehicle-message");
  state.vehiclePhotoProcessing = true;
  message.textContent = "";
  try {
    state.pendingVehiclePhotoDataUrl = await prepareVehiclePhoto(file);
    updateVehiclePhotoPreview(state.vehicles.find((vehicle) => Number(vehicle.id) === Number(state.editingVehicleId)));
  } catch (error) {
    input.value = "";
    state.pendingVehiclePhotoDataUrl = null;
    updateVehiclePhotoPreview(state.vehicles.find((vehicle) => Number(vehicle.id) === Number(state.editingVehicleId)));
    message.textContent = error.message;
  } finally {
    state.vehiclePhotoProcessing = false;
  }
}

function openModal(id, authMode) {
  const modal = document.getElementById(id);
  if (!modal) return;
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
  const nextView = state.pendingView || (isStaff() ? "analise" : state.currentPage);
  state.pendingView = null;
  sessionStorage.removeItem("rota-pending-view");
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
        cnhNumber: "",
        cnhCategory: "",
        cnhExpiry: "",
        cnhPhotoFrontDataUrl: "",
        cnhPhotoBackDataUrl: "",
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
  if (state.cnhPhotoProcessing.size) {
    message.textContent = "Aguarde a preparação das fotos da CNH antes de salvar.";
    return;
  }
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
  const cnhNumber = document.getElementById("profile-cnh-number").value.trim();
  const cnhCategory = document.getElementById("profile-cnh-category").value;
  const cnhExpiry = document.getElementById("profile-cnh-expiry").value;
  if (!cnhNumber || !cnhCategory || !cnhExpiry) {
    message.textContent = "Preencha o número, a categoria e a validade da CNH.";
    return;
  }
  if (cnhExpiry < new Date().toISOString().slice(0, 10)) {
    message.textContent = "A CNH informada está vencida. Atualize a validade para continuar.";
    return;
  }
  const client = currentClient();
  const cnhPhotoFrontDataUrl = state.pendingCnhPhotos.front || client?.cnhPhotoFrontDataUrl;
  const cnhPhotoBackDataUrl = state.pendingCnhPhotos.back || client?.cnhPhotoBackDataUrl;
  if (!cnhPhotoFrontDataUrl || !cnhPhotoBackDataUrl) {
    message.textContent = "Envie fotos legíveis da frente e do verso da CNH.";
    return;
  }
  const profileCity = municipalityById(document.getElementById("profile-city").value);
  if (!profileCity || profileCity.uf !== document.getElementById("profile-state").value) {
    message.textContent = "Selecione um município válido para o estado escolhido.";
    return;
  }
  const clientData = {
    userId: state.user.id,
    rg: document.getElementById("profile-rg").value.trim(),
    cpf: document.getElementById("profile-cpf").value.trim(),
    address: document.getElementById("profile-address").value.trim(),
    cityIbge: profileCity.ibge,
    city: profileCity.name,
    state: profileCity.uf,
    stateName: profileCity.state,
    profession: document.getElementById("profile-profession").value.trim(),
    cnhNumber,
    cnhCategory,
    cnhExpiry,
    cnhPhotoFrontDataUrl,
    cnhPhotoBackDataUrl,
    employers,
  };
  try {
    await Promise.all([
      client ? api.patch(`/clients/${client.id}`, clientData) : api.post("/clients", clientData),
      api.patch(`/users/${state.user.id}`, { name: fullName }),
    ]);
    state.user = { ...state.user, name: fullName };
    state.pendingCnhPhotos = { front: null, back: null };
    document.getElementById("profile-cnh-front").value = "";
    document.getElementById("profile-cnh-back").value = "";
    await loadData();
    document.getElementById("profile-message").textContent = "Cadastro salvo com sucesso.";
    toast("Seus dados foram atualizados.");
    if (state.pendingView === "solicitar" || sessionStorage.getItem("rota-pending-view") === "solicitar") {
      state.pendingView = null;
      sessionStorage.removeItem("rota-pending-view");
      routeTo("solicitar");
    } else if (state.pendingView) {
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
  for (let step = 1; step <= 4; step += 1) {
    if (!validateRequestStep(step)) {
      setRequestStep(step);
      return;
    }
  }

  const vehicle = state.vehicles.find((item) => String(item.id) === document.getElementById("request-vehicle").value);
  const startDate = document.getElementById("request-start").value;
  const endDate = document.getElementById("request-end").value;
  if (!vehicle) return;
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
    pickupLocation: document.getElementById("request-pickup-location").value.trim(),
    returnLocation: document.getElementById("request-return-location").value.trim(),
    contractType: document.getElementById("request-contract-type").value,
    propertyOption: document.getElementById("request-property-option").value,
    creditRequested: document.getElementById("request-credit-requested").checked,
    creditBankId: document.getElementById("request-credit-requested").checked
      ? document.getElementById("request-credit-bank").value
      : "",
    creditBankName: document.getElementById("request-credit-requested").checked
      ? state.banks.find((bank) => String(bank.id) === document.getElementById("request-credit-bank").value)?.name || ""
      : "",
    creditAmount: document.getElementById("request-credit-requested").checked
      ? Number(document.getElementById("request-credit-amount").value)
      : 0,
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
    sessionStorage.removeItem("rota-editing-request-id");
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
  sessionStorage.setItem("rota-editing-request-id", String(order.id));
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

async function reviewRequest(id, status, rejectionReason = "") {
  if (!isStaff() || !["Aprovado", "Rejeitado"].includes(status)) return;
  const order = state.requests.find((item) => Number(item.id) === Number(id));
  if (!order || order.status !== "Em análise") return;
  const reason = rejectionReason.trim();
  if (status === "Rejeitado" && !reason) {
    toast("Informe o motivo da rejeição para continuar.", true);
    return;
  }
  const analysisNote = status === "Aprovado"
    ? "Renda e valor do pedido avaliados. Contrato aprovado."
    : reason;
  try {
    await api.patch(`/requests/${id}`, {
      status,
      reviewedBy: state.user.name,
      reviewedAt: new Date().toISOString(),
      analysisNote,
    });
    state.rejectingRequestId = null;
    state.rejectionDraft = "";
    await loadData();
    toast(`Pedido ${status.toLocaleLowerCase("pt-BR")}.`);
  } catch (error) {
    reportError(error);
  }
}

function openVehicleDialog(vehicle = null) {
  if (!isStaff()) return;
  state.editingVehicleId = vehicle?.id || null;
  state.pendingVehiclePhotoDataUrl = null;
  state.vehiclePhotoProcessing = false;
  document.getElementById("vehicle-modal-title").textContent = vehicle ? "Editar veículo" : "Cadastrar veículo";
  document.getElementById("vehicle-brand").value = vehicle?.brand || "";
  document.getElementById("vehicle-model").value = vehicle?.model || "";
  document.getElementById("vehicle-year").value = vehicle?.year || new Date().getFullYear();
  document.getElementById("vehicle-registration").value = vehicle?.matricula || "";
  document.getElementById("vehicle-plate").value = vehicle?.plate || "";
  const vehicleState = document.getElementById("vehicle-state");
  const vehicleCity = document.getElementById("vehicle-city");
  vehicleState.value = vehicle?.state || "";
  populateMunicipalitySelect(vehicleCity, vehicleState.value, false, vehicle?.cityIbge ? String(vehicle.cityIbge) : "");
  document.getElementById("vehicle-category").value = vehicleCategory(vehicle || {});
  document.getElementById("vehicle-transmission").value = vehicle?.transmission || "Automático";
  document.getElementById("vehicle-fuel").value = vehicle?.fuel || "Flex";
  document.getElementById("vehicle-rate").value = vehicle?.dailyRate || "";
  document.getElementById("vehicle-status").value = vehicle?.status || "Disponível";
  document.getElementById("vehicle-owner-type").value = vehicle?.ownerType || "Empresa";
  document.getElementById("vehicle-owner-name").value = vehicle?.ownerName || "";
  document.getElementById("vehicle-photo-upload").value = "";
  document.getElementById("vehicle-message").textContent = "";
  updateVehiclePhotoPreview(vehicle);
  updateVehicleSuggestions();
  openModal("vehicle-modal");
}

async function handleVehicleSubmit(event) {
  event.preventDefault();
  const message = document.getElementById("vehicle-message");
  if (state.vehiclePhotoProcessing) {
    message.textContent = "Aguarde a preparação da imagem antes de salvar.";
    return;
  }
  const selectedCity = municipalityById(document.getElementById("vehicle-city").value);
  if (!selectedCity || selectedCity.uf !== document.getElementById("vehicle-state").value) {
    message.textContent = "Selecione um município válido para o estado escolhido.";
    return;
  }
  const payload = {
    brand: document.getElementById("vehicle-brand").value.trim(),
    model: document.getElementById("vehicle-model").value.trim(),
    year: Number(document.getElementById("vehicle-year").value),
    matricula: document.getElementById("vehicle-registration").value.trim().toLocaleUpperCase("pt-BR"),
    plate: document.getElementById("vehicle-plate").value.trim().toLocaleUpperCase("pt-BR"),
    cityIbge: selectedCity.ibge,
    city: selectedCity.name,
    state: selectedCity.uf,
    stateName: selectedCity.state,
    category: document.getElementById("vehicle-category").value,
    transmission: document.getElementById("vehicle-transmission").value,
    fuel: document.getElementById("vehicle-fuel").value,
    dailyRate: Number(document.getElementById("vehicle-rate").value),
    status: document.getElementById("vehicle-status").value,
    ownerType: document.getElementById("vehicle-owner-type").value,
    ownerName: document.getElementById("vehicle-owner-name").value.trim(),
  };
  if (state.pendingVehiclePhotoDataUrl) payload.photoDataUrl = state.pendingVehiclePhotoDataUrl;
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

async function deleteClientRecord(clientId) {
  if (!isStaff()) {
    toast("Esta ação é exclusiva para agentes, empresas e bancos.", true);
    return;
  }
  const client = state.clients.find((item) => Number(item.id) === Number(clientId));
  if (!client) {
    toast("Não foi possível localizar o cadastro selecionado.", true);
    return;
  }
  const user = state.clientUsers.find((item) => Number(item.id) === Number(client.userId));
  const clientName = user?.name || "este cliente";
  if (!window.confirm(`Excluir o cadastro de ${clientName}? A conta de acesso e o histórico de pedidos serão mantidos.`)) return;
  try {
    await api.delete(`/clients/${client.id}`);
    await loadData();
    toast("Cadastro do cliente excluído. A conta e o histórico de pedidos foram mantidos.");
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
  sessionStorage.removeItem("rota-pending-view");
  sessionStorage.removeItem("rota-pending-vehicle-id");
  sessionStorage.removeItem("rota-editing-request-id");
  closeModals();
  renderShell();
  routeTo("inicio");
  toast("Você saiu da sua conta.");
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button, [data-nav]");
  if (!target) return;
  try {
    if (target.matches("[data-nav]")) {
      const next = target.dataset.nav;
      routeTo(next);
      return;
    }
    if (target.matches("[data-auth-mode]")) {
      openModal("auth-modal", target.dataset.authMode);
    } else if (target.matches("[data-category]")) {
      state.catalogCategory = target.dataset.category;
      document.querySelectorAll("[data-category]").forEach((button) => {
        const selected = button.dataset.category === state.catalogCategory;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      renderCatalog();
    } else if (target.id === "request-next") moveRequestStep(1);
    else if (target.id === "request-previous") moveRequestStep(-1);
    else if (target.id === "login-open") openModal("auth-modal", "login");
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
      sessionStorage.setItem("rota-pending-vehicle-id", state.pendingVehicleId);
      routeTo("solicitar");
    } else if (target.matches("[data-select-order]")) {
      state.selectedRequestId = target.dataset.selectOrder;
      renderOrders();
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
    else if (target.matches("[data-start-rejection]")) {
      state.rejectingRequestId = String(target.dataset.startRejection);
      state.rejectionDraft = "";
      renderAnalysis();
      document.querySelector("[data-rejection-reason]")?.focus();
    } else if (target.matches("[data-cancel-rejection]")) {
      state.rejectingRequestId = null;
      state.rejectionDraft = "";
      renderAnalysis();
    } else if (target.matches("[data-submit-rejection]")) {
      const form = target.closest("[data-rejection-form]");
      const reasonInput = form.querySelector("[data-rejection-reason]");
      const reason = reasonInput.value.trim();
      if (!reason) {
        reasonInput.setCustomValidity("Informe o motivo da rejeição.");
        reasonInput.reportValidity();
        return;
      }
      reasonInput.setCustomValidity("");
      await reviewRequest(form.dataset.rejectionForm, "Rejeitado", reason);
    }
    else if (target.matches("[data-review-order]")) await reviewRequest(target.dataset.reviewOrder, target.dataset.reviewStatus);
    else if (target.matches("[data-view-client]")) showClientDetails(target.dataset.viewClient);
    else if (target.matches("[data-view-client-record]")) showClientRecord(target.dataset.viewClientRecord);
    else if (target.matches("[data-delete-client]")) await deleteClientRecord(target.dataset.deleteClient);
    else if (target.id === "request-cancel-edit") {
      state.editingRequestId = null;
      sessionStorage.removeItem("rota-editing-request-id");
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
      const menuButton = document.querySelector(".mobile-menu-toggle");
      if (!menu || !menuButton) return;
      const isOpen = menu.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    }
  } catch (error) {
    reportError(error);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-rejection-reason]")) {
    state.rejectionDraft = event.target.value;
    event.target.setCustomValidity("");
  }
});

function registerEventListeners() {
  document.getElementById("auth-form")?.addEventListener("submit", handleAuthSubmit);
  document.getElementById("home-login-form")?.addEventListener("submit", handleHomeLogin);
  document.getElementById("profile-form")?.addEventListener("submit", handleProfileSubmit);
  document.getElementById("profile-cnh-front")?.addEventListener("change", handleCnhPhotoChange);
  document.getElementById("profile-cnh-back")?.addEventListener("change", handleCnhPhotoChange);
  document.getElementById("client-directory-search")?.addEventListener("input", renderClients);
  document.getElementById("request-form")?.addEventListener("submit", handleRequestSubmit);
  document.getElementById("vehicle-form")?.addEventListener("submit", handleVehicleSubmit);
  document.getElementById("vehicle-photo-upload")?.addEventListener("change", handleVehiclePhotoChange);
  document.getElementById("catalog-search")?.addEventListener("input", renderCatalog);
  document.getElementById("catalog-sort")?.addEventListener("change", renderCatalog);
  document.getElementById("vehicle-brand")?.addEventListener("input", updateVehicleSuggestions);
  document.getElementById("request-vehicle")?.addEventListener("change", updateEstimate);
  document.getElementById("request-start")?.addEventListener("change", updateEstimate);
  document.getElementById("request-end")?.addEventListener("change", updateEstimate);
  document.getElementById("request-pickup-location")?.addEventListener("input", () => {
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("request-return-location")?.addEventListener("input", () => {
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("request-contract-type")?.addEventListener("change", () => {
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("request-property-option")?.addEventListener("change", () => {
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("request-credit-requested")?.addEventListener("change", () => {
    updateCreditFields();
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("request-credit-bank")?.addEventListener("change", () => {
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("request-credit-amount")?.addEventListener("input", () => {
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("request-notes")?.addEventListener("input", () => {
    if (state.requestStep === 5) renderRequestReview();
  });
  document.getElementById("hero-register-open")?.addEventListener("click", () => openModal("auth-modal", "register"));
  document.querySelectorAll(".modal-backdrop").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModals();
    });
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModals();
  });
}

async function refreshLiveData() {
  if (document.visibilityState === "hidden") return;
  try {
    const needsClientData = ["cadastro", "solicitar", "pedidos", "analise", "clientes"].includes(state.currentPage);
    const [vehicles, requests, clients, clientUsers] = await Promise.all([
      api.get("/vehicles"),
      api.get("/requests"),
      needsClientData ? api.get("/clients") : Promise.resolve([]),
      state.currentPage === "clientes" ? api.get("/users?role=client") : Promise.resolve([]),
    ]);
    state.vehicles = vehicles;
    state.requests = requests;
    state.clients = clients;
    state.clientUsers = clientUsers.filter((user) => user.role === "client");
    renderHomeVehicles();
    renderCatalog();
    renderOrders();
    renderAnalysis();
    renderClients();
    renderFleet();
    updateEstimate();
  } catch (error) {
    reportError(error);
  }
}

async function initialize() {
  await loadSharedLayout();
  registerEventListeners();
  state.currentPage = document.body.dataset.page || "inicio";
  state.view = state.currentPage;
  state.pendingView = sessionStorage.getItem("rota-pending-view");
  state.pendingVehicleId = sessionStorage.getItem("rota-pending-vehicle-id");
  state.editingRequestId = sessionStorage.getItem("rota-editing-request-id");

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
    await loadVehiclePhotos();
  } catch (error) {
    reportError(error);
  }
  try {
    await loadMunicipalities();
    const catalogSearch = document.getElementById("catalog-search");
    if (catalogSearch) catalogSearch.value = new URLSearchParams(location.search).get("search") || "";
  } catch (error) {
    reportError(error);
  }
  if (["cadastro", "pedidos", "solicitar"].includes(state.currentPage) && !state.user) {
    state.pendingView = state.currentPage;
    sessionStorage.setItem("rota-pending-view", state.currentPage);
    openModal("auth-modal", "login");
    return;
  }
  if (["analise", "clientes", "frota"].includes(state.currentPage) && !isStaff()) {
    routeTo("inicio");
    return;
  }
  if (state.currentPage === "cadastro" && isStaff()) {
    routeTo("inicio");
    return;
  }
  try {
    await loadData();
    if (state.currentPage === "frota") {
      try {
        await loadCarCatalog();
      } catch (error) {
        const status = document.getElementById("vehicle-catalog-status");
        if (status) status.textContent = "Base de sugestões indisponível. Você ainda pode digitar marca e modelo.";
        reportError(error);
      }
    }
    routeTo(state.currentPage);
    if (state.currentPage === "inicio" && location.hash === "#como-funciona") {
      document.getElementById("como-funciona")?.scrollIntoView();
    }
    window.setInterval(refreshLiveData, 15000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshLiveData();
    });
  } catch (error) {
    renderShell();
    reportError(error);
  }
}

initialize().catch((error) => {
  console.error("Não foi possível iniciar a aplicação.", error);
  const message = document.createElement("p");
  message.className = "empty-state";
  message.textContent = error.message;
  document.body.append(message);
});
