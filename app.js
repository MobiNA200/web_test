(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const numberFormat = new Intl.NumberFormat("fa-IR");
  const categoryLabels = { all: "همه", daily: "روزمره", sport: "ورزشی", patterned: "طرح‌دار", crew: "ساق‌بلند" };
  const state = { filter: "all", query: "", sort: "featured", favorites: new Set(readStorage("joft-favorites", [])), cart: readStorage("joft-cart", {}), dialogProduct: null, cartReturnFocus: null, toastTimer: null };
  const grid = $("#product-grid");
  const dialog = $("#product-dialog");

  function readStorage(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  }
  function saveStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { showToast("ذخیره‌سازی در این مرورگر در دسترس نیست."); }
  }
  function money(amount) { return `${numberFormat.format(amount)} <small>تومان</small>`; }
  function icon(name) {
    const shapes = {
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
      bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
      search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      minus: '<path d="M5 12h14"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shapes[name] || ""}</svg>`;
  }
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
  }
  function filteredProducts() {
    let items = [...PRODUCTS];
    if (state.filter === "favorites") items = items.filter(item => state.favorites.has(item.id));
    else if (state.filter !== "all") items = items.filter(item => item.category === state.filter);
    const query = state.query.trim().toLocaleLowerCase("fa-IR");
    if (query) items = items.filter(item => `${item.name} ${item.description} ${item.categoryLabel}`.toLocaleLowerCase("fa-IR").includes(query));
    if (state.sort === "price-low") items.sort((a, b) => a.price - b.price);
    if (state.sort === "price-high") items.sort((a, b) => b.price - a.price);
    if (state.sort === "name") items.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    return items;
  }
  function productCard(item, index) {
    const favorite = state.favorites.has(item.id);
    return `<article class="product-card" style="--card-index:${index}" data-product-id="${item.id}">
      <div class="product-photo">
        <img src="${item.image}" alt="${item.alt}" loading="lazy">
        <span class="product-tag">${item.tag}</span>
        <button class="favorite-button ${favorite ? "is-favorite" : ""}" type="button" data-favorite="${item.id}" aria-label="${favorite ? "حذف از" : "افزودن به"} علاقه‌مندی‌ها" aria-pressed="${favorite}">${icon("heart")}</button>
        <button class="quick-view" type="button" data-details="${item.id}">جزئیات <span aria-hidden="true">↖</span></button>
      </div>
      <div class="product-meta"><span>${item.categoryLabel}</span><span class="color-swatches" aria-label="رنگ‌های دیده‌شده">${item.colors.map(color => `<i style="--swatch:${color}"></i>`).join("")}</span></div>
      <div class="product-info"><button class="product-name" type="button" data-details="${item.id}">${item.name}</button><span class="product-price">${money(item.price)}</span></div>
      <div class="product-buy-row"><span class="sample-price">قیمت نمونه</span><button class="add-button" type="button" data-add="${item.id}" aria-label="افزودن ${item.name} به سبد">افزودن به سبد ${icon("plus")}</button></div>
    </article>`;
  }
  function renderProducts() {
    if (typeof PRODUCTS === "undefined" || !Array.isArray(PRODUCTS)) {
      $("#catalog-error").hidden = false;
      grid.innerHTML = "";
      return;
    }
    $("#catalog-error").hidden = true;
    const items = filteredProducts();
    grid.innerHTML = items.map(productCard).join("");
    $("#result-count").textContent = `${numberFormat.format(items.length)} محصول`;
    $("#empty-results").hidden = items.length !== 0;
    $$(".filter-chip").forEach(button => {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const allCount = $('.filter-chip[data-filter="all"] span');
    if (allCount) allCount.textContent = numberFormat.format(PRODUCTS.length);
    $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.navFilter === state.filter));
  }
  function setFilter(value) {
    state.filter = value;
    renderProducts();
  }
  function addToCart(id, amount = 1) {
    state.cart[id] = (state.cart[id] || 0) + amount;
    saveStorage("joft-cart", state.cart);
    updateCart();
    showToast("به سبد اضافه شد.");
  }
  function updateCart() {
    const entries = Object.entries(state.cart).filter(([id, qty]) => PRODUCTS.some(item => item.id === id) && qty > 0);
    const count = entries.reduce((sum, [, qty]) => sum + qty, 0);
    const total = entries.reduce((sum, [id, qty]) => sum + PRODUCTS.find(item => item.id === id).price * qty, 0);
    $("#cart-count").textContent = numberFormat.format(count);
    $("#drawer-count").textContent = `(${numberFormat.format(count)})`;
    $("#cart-empty").hidden = count > 0;
    $("#cart-summary").hidden = count === 0;
    $("#cart-items").innerHTML = entries.map(([id, qty]) => {
      const item = PRODUCTS.find(product => product.id === id);
      return `<article class="cart-item"><img src="${item.image}" alt="" loading="lazy"><div class="cart-item-info"><h3>${item.name}</h3><span class="cart-item-price">${money(item.price)}</span><div class="quantity-control"><button type="button" data-quantity="${id}" data-step="-1" aria-label="کاهش تعداد ${item.name}">${icon("minus")}</button><span>${numberFormat.format(qty)}</span><button type="button" data-quantity="${id}" data-step="1" aria-label="افزایش تعداد ${item.name}">${icon("plus")}</button></div></div><button class="remove-item" type="button" data-remove="${id}" aria-label="حذف ${item.name}">${icon("close")}</button></article>`;
    }).join("");
    $("#cart-total").innerHTML = money(total);
    $("#cart-items").hidden = count === 0;
    saveStorage("joft-cart", state.cart);
  }
  function openCart() {
    state.cartReturnFocus = document.activeElement;
    $("#overlay").hidden = false;
    $("#cart-drawer").hidden = false;
    document.body.classList.add("drawer-open");
    $(".close-drawer").focus();
  }
  function closeCart() {
    $("#overlay").hidden = true;
    $("#cart-drawer").hidden = true;
    document.body.classList.remove("drawer-open");
    const returnFocus = state.cartReturnFocus;
    state.cartReturnFocus = null;
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
    else $("#cart-open").focus();
  }
  function closeMobileMenu() {
    $("#primary-nav").classList.remove("is-open");
    $("#mobile-menu-toggle").setAttribute("aria-expanded", "false");
  }
  function cartFocusables() {
    return $$("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])", $("#cart-drawer"))
      .filter(element => !element.closest("[hidden]") && element.getClientRects().length > 0);
  }
  function openDetails(id) {
    const item = PRODUCTS.find(product => product.id === id);
    if (!item) return;
    state.dialogProduct = item;
    $("#dialog-image").src = item.image;
    $("#dialog-image").alt = item.alt;
    $("#dialog-category").textContent = item.categoryLabel;
    $("#dialog-title").textContent = item.name;
    $("#dialog-description").textContent = item.description;
    $("#dialog-price").innerHTML = money(item.price);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    $(".dialog-close").focus();
  }
  function closeDetails() { if (dialog.open) dialog.close(); else dialog.removeAttribute("open"); }

  grid.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    const favorite = event.target.closest("[data-favorite]");
    const details = event.target.closest("[data-details]");
    if (add) addToCart(add.dataset.add);
    else if (favorite) {
      const id = favorite.dataset.favorite;
      state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
      saveStorage("joft-favorites", [...state.favorites]);
      renderProducts();
    } else if (details) openDetails(details.dataset.details);
  });
  grid.addEventListener("keydown", event => {
    const target = event.target.closest("[data-details]");
    if (target && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openDetails(target.dataset.details); }
  });
  $$(".filter-chip").forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
  $$("[data-nav-filter]").forEach(link => link.addEventListener("click", () => setFilter(link.dataset.navFilter)));
  $$("[data-footer-filter]").forEach(link => link.addEventListener("click", () => setFilter(link.dataset.footerFilter)));
  $$("[data-category]").forEach(button => button.addEventListener("click", () => { setFilter(button.dataset.category); $("#products").scrollIntoView({ behavior: "smooth" }); }));
  $("#favorites-toggle").addEventListener("click", () => { setFilter(state.filter === "favorites" ? "all" : "favorites"); $("#products").scrollIntoView({ behavior: "smooth" }); });
  $("#search-input").addEventListener("input", event => { state.query = event.target.value; renderProducts(); });
  $("#sort-select").addEventListener("change", event => { state.sort = event.target.value; renderProducts(); });
  $("#clear-filters").addEventListener("click", () => { state.filter = "all"; state.query = ""; $("#search-input").value = ""; renderProducts(); });
  $("#cart-open").addEventListener("click", openCart);
  $(".close-drawer").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  $("#empty-shop").addEventListener("click", () => { closeCart(); $("#products").scrollIntoView({ behavior: "smooth" }); });
  $("#cart-items").addEventListener("click", event => {
    const qtyButton = event.target.closest("[data-quantity]");
    const remove = event.target.closest("[data-remove]");
    if (qtyButton) {
      const id = qtyButton.dataset.quantity;
      state.cart[id] = (state.cart[id] || 0) + Number(qtyButton.dataset.step);
      if (state.cart[id] <= 0) delete state.cart[id];
      updateCart();
    } else if (remove) { delete state.cart[remove.dataset.remove]; updateCart(); }
  });
  $("#demo-checkout").addEventListener("click", () => { $("#checkout-feedback").textContent = "برای پرداخت واقعی، درگاه و سامانهٔ سفارش باید به سایت وصل شوند."; });
  $(".dialog-close").addEventListener("click", closeDetails);
  dialog.addEventListener("click", event => { if (event.target === dialog) closeDetails(); });
  $("#dialog-add").addEventListener("click", () => { if (state.dialogProduct) addToCart(state.dialogProduct.id); closeDetails(); });
  $("#wholesale-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const requests = readStorage("joft-wholesale-demo", []);
    requests.push({ ...data, createdAt: new Date().toISOString() });
    saveStorage("joft-wholesale-demo", requests);
    $("#form-feedback").textContent = "درخواست نمونه در همین مرورگر ذخیره شد. برای دریافت پاسخ، راه ارتباطی فروشگاه را تنظیم کنید.";
    form.reset();
  });
  $("#mobile-menu-toggle").addEventListener("click", event => {
    const button = event.currentTarget;
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    $("#primary-nav").classList.toggle("is-open", open);
  });
  $$(".nav-link").forEach(link => link.addEventListener("click", closeMobileMenu));
  document.addEventListener("pointerdown", event => {
    const nav = $("#primary-nav");
    const toggle = $("#mobile-menu-toggle");
    if (nav.classList.contains("is-open") && !nav.contains(event.target) && !toggle.contains(event.target)) closeMobileMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); $("#search-input").focus(); }
    if (event.key === "Escape") {
      if (!$("#cart-drawer").hidden) closeCart();
      else if ($("#primary-nav").classList.contains("is-open")) { closeMobileMenu(); $("#mobile-menu-toggle").focus(); }
    }
    if (event.key === "Tab" && !$("#cart-drawer").hidden) {
      const focusables = cartFocusables();
      if (!focusables.length) { event.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || !$("#cart-drawer").contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !$("#cart-drawer").contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  });

  renderProducts();
  if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS)) updateCart();
})();
