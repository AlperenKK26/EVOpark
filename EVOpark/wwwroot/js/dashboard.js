(() => {
    "use strict";

    const firstName = EVO.qs("[data-user-first-name]");
    const userName = EVO.qs("[data-user-name]");
    const initials = EVO.qs("[data-user-initials]");
    const today = EVO.qs("[data-today]");
    const statusMessage = (message) => {
        const toast = document.createElement("div");
        toast.className = "toast-message";
        toast.setAttribute("role", "status");
        toast.textContent = message;
        document.body.append(toast);
        window.setTimeout(() => toast.remove(), 4000);
    };
    const isPreviewMode = new URLSearchParams(window.location.search).get("preview") === "1";

    if (today) today.textContent = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date()).toLocaleUpperCase("tr-TR");

    const setUser = (user) => {
        const name = user?.firstName?.trim() || "EVOpark";
        EVO.setText(firstName, name);
        EVO.setText(userName, name);
        EVO.setText(initials, name.charAt(0).toUpperCase());
    };

    const loadUser = async () => {
        if (isPreviewMode) {
            setUser({ firstName: "Demo kullanıcı" });
            return;
        }
        try {
            const user = await EVO.api.get("/api/auth/me");
            setUser(user);
        } catch (error) {
            if (error?.status === 401) {
                window.location.replace("/login.html");
                return;
            }
            EVO.setText(firstName, "orada");
        }
    };

    const logout = async () => {
        const buttons = EVO.qsa("[data-logout]");
        buttons.forEach((button) => { button.disabled = true; button.textContent = "Çıkılıyor..."; });
        try {
            await EVO.api.post("/api/auth/logout", {});
            window.location.replace("/");
        } catch {
            buttons.forEach((button) => { button.disabled = false; button.textContent = "Çıkış"; });
            statusMessage("Çıkış yapılamadı. Lütfen tekrar deneyin.");
        }
    };
    EVO.qsa("[data-logout]").forEach((button) => button.addEventListener("click", logout));

    const menu = EVO.qs("[data-dashboard-menu]");
    const mobileNav = EVO.qs("[data-dashboard-mobile-nav]");
    if (menu && mobileNav) {
        menu.addEventListener("click", () => {
            const isOpen = menu.getAttribute("aria-expanded") === "true";
            menu.setAttribute("aria-expanded", String(!isOpen));
            mobileNav.hidden = isOpen;
        });
        EVO.qsa("a", mobileNav).forEach((link) => link.addEventListener("click", () => { menu.setAttribute("aria-expanded", "false"); mobileNav.hidden = true; }));
    }

    EVO.qsa("[data-coming-soon]").forEach((link) => link.addEventListener("click", (event) => {
        event.preventDefault();
        statusMessage("Bu özellik bir sonraki geliştirme adımında aktif olacak.");
    }));

    EVO.qsa("[data-booking-panel]").forEach((panel) => {
        const toggle = EVO.qs(".booking-panel-toggle", panel);
        const content = EVO.qs(".booking-panel-content", panel);
        const selectedLabel = EVO.qs("[data-selected-label]", panel);
        const choiceLabel = EVO.qs("[data-choice-label]", panel);
        const reservationButton = EVO.qs("[data-reservation]", panel);
        const availableSlots = EVO.qsa(".space-slot:not(.is-busy)", panel);
        const initiallyOpen = panel.classList.contains("is-open");
        if (content) {
            content.hidden = false;
            content.setAttribute("aria-hidden", String(!initiallyOpen));
        }

        toggle?.addEventListener("click", () => {
            const open = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!open));
            panel.classList.toggle("is-open", !open);
            if (content) {
                content.hidden = false;
                content.setAttribute("aria-hidden", String(open));
            }
        });

        availableSlots.forEach((slot) => slot.addEventListener("click", () => {
            availableSlots.forEach((item) => item.classList.remove("is-selected"));
            slot.classList.add("is-selected");
            EVO.setText(selectedLabel, `${slot.textContent.trim()} seçildi`);
            EVO.setText(choiceLabel, slot.textContent.trim());
            if (reservationButton) reservationButton.disabled = false;
        }));

        reservationButton?.addEventListener("click", () => {
            const selected = EVO.qs(".space-slot.is-selected", panel);
            if (!selected) {
                statusMessage("Devam etmek için önce boş bir alan seçin.");
                return;
            }
            statusMessage(`${reservationButton.dataset.serviceName} randevu akışı backend bağlantısı tamamlandığında aktif olacak.`);
        });
        if (reservationButton) reservationButton.disabled = true;
    });

    EVO.qsa("[data-booking-jump]").forEach((link) => link.addEventListener("click", () => {
        const panel = EVO.qs(link.getAttribute("href"));
        const toggle = EVO.qs(".booking-panel-toggle", panel);
        if (panel && toggle?.getAttribute("aria-expanded") !== "true") toggle.click();
    }));

    EVO.qsa("[data-plan-slot]").forEach((slot) => slot.addEventListener("click", () => {
        const parkingPanel = EVO.qs("#booking-parking");
        const panelSlots = EVO.qsa(".space-slot", parkingPanel);
        EVO.qsa("[data-plan-slot]").forEach((item) => item.classList.remove("is-selected"));
        panelSlots.forEach((item) => item.classList.remove("is-selected"));
        slot.classList.add("is-selected");
        const slotCode = slot.dataset.space || slot.textContent.trim();
        EVO.setText(EVO.qs("[data-selected-label]", parkingPanel), `${slotCode} seçildi`);
        EVO.setText(EVO.qs("[data-choice-label]", parkingPanel), slotCode);
        const reservationButton = EVO.qs("[data-reservation]", parkingPanel);
        if (reservationButton) reservationButton.disabled = false;
    }));

    const facilityBooking = EVO.qs("[data-facility-booking]");
    if (facilityBooking) {
        const facilityMap = EVO.qs("[data-facility-map]", facilityBooking);
        const facilityTitle = EVO.qs("[data-facility-title]", facilityBooking);
        const facilitySubtitle = EVO.qs("[data-facility-subtitle]", facilityBooking);
        const summaryTitle = EVO.qs("[data-facility-summary-title]", facilityBooking);
        const summaryCopy = EVO.qs("[data-facility-summary-copy]", facilityBooking);
        const choiceLabel = EVO.qs("[data-facility-choice]", facilityBooking);
        const priceLabel = EVO.qs("[data-facility-price]", facilityBooking);
        const dateInput = EVO.qs("[data-facility-date]", facilityBooking);
        const timeInput = EVO.qs("[data-facility-time]", facilityBooking);
        const reserveButton = EVO.qs("[data-facility-reserve]", facilityBooking);
        const tabs = EVO.qsa("[data-facility-tab]", facilityBooking);
        const selectedByService = { parking: "", wash: "", charge: "" };

        const services = {
            parking: {
                title: "Otoparkı yukarıdan gör.",
                subtitle: "A, B ve C blokları · EVOpark Adalar",
                summary: "Otopark randevusu",
                instruction: "Haritadaki yeşil park alanlarından birini seçin.",
                price: "₺85 / saat",
                aria: "Üstten otopark planı",
                blocks: [
                    { name: "A BLOK", slots: [["A01", "free"], ["A02", "busy"], ["A03", "free"], ["A04", "reserved"], ["A05", "free"], ["A06", "busy"], ["A07", "free"], ["A08", "free"], ["A09", "busy"], ["A10", "free"], ["A11", "reserved"], ["A12", "free"]] },
                    { name: "B BLOK", slots: [["B01", "free"], ["B02", "busy"], ["B03", "free"], ["B04", "free"], ["B05", "reserved"], ["B06", "free"], ["B07", "busy"], ["B08", "free"], ["B09", "free"], ["B10", "busy"], ["B11", "free"], ["B12", "reserved"]] },
                    { name: "C BLOK", slots: [["C01", "free"], ["C02", "free"], ["C03", "busy"], ["C04", "reserved"], ["C05", "free"], ["C06", "free"], ["C07", "reserved"], ["C08", "free"], ["C09", "busy"], ["C10", "free"], ["C11", "free"], ["C12", "busy"]] }
                ]
            },
            wash: {
                title: "Yıkama kabinlerini yukarıdan gör.",
                subtitle: "Üstten kabin yerleşimi · EVOpark Adalar",
                summary: "Yıkama randevusu",
                instruction: "Yeşil durumdaki uygun yıkama kabinini seçin.",
                price: "₺320 / yıkama",
                aria: "Üstten oto yıkama kabini planı",
                slots: [["W01", "free"], ["W02", "busy"], ["W03", "free"], ["W04", "free"], ["W05", "busy"], ["W06", "busy"]]
            },
            charge: {
                title: "Şarj istasyonlarını yukarıdan gör.",
                subtitle: "Üstten şarj yerleşimi · EVOpark Adalar",
                summary: "EV şarj randevusu",
                instruction: "Mavi-yeşil durumdaki uygun şarj noktasını seçin.",
                price: "₺9,80 / kWh",
                aria: "Üstten EV şarj istasyonu planı",
                slots: [["E01", "free"], ["E02", "busy"], ["E03", "free"], ["E04", "busy"]]
            }
        };
        let activeService = "parking";

        const allSlots = (service) => service.blocks ? service.blocks.flatMap((block) => block.slots) : service.slots;
        const statusText = (status) => status === "busy" ? "dolu" : status === "reserved" ? "rezerve" : "boş";
        const carMarkup = (status) => status === "busy" ? '<span class="top-car" aria-hidden="true"></span>' : "";
        const serviceDecor = (type) => type === "wash"
            ? '<span class="wash-rail wash-rail-left" aria-hidden="true"></span><span class="wash-rail wash-rail-right" aria-hidden="true"></span><span class="wash-spray" aria-hidden="true"></span>'
            : type === "charge" ? '<span class="charger-post" aria-hidden="true">ϟ</span><span class="charge-cable" aria-hidden="true"></span>' : "";
        const slotMarkup = ([code, status], type) => {
            const selected = selectedByService[type] === code;
            const classes = `facility-slot is-${status}${selected ? " is-selected" : ""}`;
            const disabled = status !== "free" ? " disabled" : "";
            return `<button class="${classes}" type="button" data-facility-space="${code}"${disabled} aria-label="${code} ${statusText(status)}">${serviceDecor(type)}${carMarkup(status)}<span class="slot-code">${code}</span></button>`;
        };

        const updateReserveState = () => {
            const hasSelection = Boolean(selectedByService[activeService]);
            const ready = hasSelection && Boolean(dateInput?.value) && Boolean(timeInput?.value);
            if (reserveButton) reserveButton.disabled = !ready;
        };

        const renderMap = () => {
            const service = services[activeService];
            if (!facilityMap) return;
            facilityMap.className = `facility-map facility-map-${activeService}${activeService === "parking" ? "" : " facility-map-service"}`;
            facilityMap.setAttribute("aria-label", service.aria);
            if (activeService === "parking") {
                facilityMap.innerHTML = `${service.blocks.map((block) => `<section class="facility-block" aria-label="${block.name}"><h5>${block.name}</h5><div class="facility-slot-grid">${block.slots.map((slot) => slotMarkup(slot, activeService)).join("")}</div></section>`).join("")}<span class="facility-road-arrow" aria-hidden="true">→</span><span class="facility-gate facility-gate-entry">GİRİŞ <b>→</b></span><span class="facility-gate facility-gate-exit"><b>→</b> ÇIKIŞ</span>`;
            } else {
                const mapLabel = activeService === "wash" ? "YIKAMA KABİNLERİ" : "ŞARJ İSTASYONLARI";
                facilityMap.innerHTML = `<div class="facility-service-title">${mapLabel}</div><div class="facility-service-grid">${service.slots.map((slot) => slotMarkup(slot, activeService)).join("")}</div><span class="facility-service-direction" aria-hidden="true">→</span>`;
            }
            EVO.qsa("[data-facility-space]", facilityMap).forEach((slot) => slot.addEventListener("click", () => {
                selectedByService[activeService] = slot.dataset.facilitySpace || "";
                EVO.qsa("[data-facility-space]", facilityMap).forEach((item) => item.classList.remove("is-selected"));
                slot.classList.add("is-selected");
                EVO.setText(choiceLabel, selectedByService[activeService]);
                reserveButton?.classList.remove("is-confirmed");
                if (reserveButton) reserveButton.innerHTML = 'Randevu al <span aria-hidden="true">↗</span>';
                updateReserveState();
            }));
        };

        const setService = (serviceName, animate = true) => {
            if (!services[serviceName]) return;
            activeService = serviceName;
            const service = services[activeService];
            tabs.forEach((tab) => {
                const selected = tab.dataset.facilityTab === activeService;
                tab.classList.toggle("is-active", selected);
                tab.setAttribute("aria-selected", String(selected));
            });
            EVO.setText(facilityTitle, service.title);
            EVO.setText(facilitySubtitle, service.subtitle);
            EVO.setText(summaryTitle, service.summary);
            EVO.setText(summaryCopy, service.instruction);
            EVO.setText(choiceLabel, selectedByService[activeService] || "Henüz seçilmedi");
            EVO.setText(priceLabel, service.price);
            reserveButton?.classList.remove("is-confirmed");
            if (reserveButton) reserveButton.innerHTML = 'Randevu al <span aria-hidden="true">↗</span>';
            if (animate && facilityMap) {
                facilityMap.classList.add("is-changing");
                window.setTimeout(renderMap, 130);
            } else {
                renderMap();
            }
            updateReserveState();
        };

        const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        if (dateInput) {
            dateInput.min = localToday;
            dateInput.value = localToday;
            dateInput.addEventListener("change", () => {
                reserveButton?.classList.remove("is-confirmed");
                updateReserveState();
            });
        }
        timeInput?.addEventListener("change", () => {
            reserveButton?.classList.remove("is-confirmed");
            updateReserveState();
        });
        tabs.forEach((tab) => tab.addEventListener("click", () => setService(tab.dataset.facilityTab || "parking")));
        EVO.qsa("[data-facility-jump]").forEach((link) => link.addEventListener("click", () => setService(link.dataset.facilityJump || "parking")));
        reserveButton?.addEventListener("click", () => {
            const selected = selectedByService[activeService];
            if (!selected || !dateInput?.value || !timeInput?.value) return;
            reserveButton.classList.add("is-confirmed");
            reserveButton.innerHTML = 'Randevu hazır <span aria-hidden="true">✓</span>';
            statusMessage(`${selected} alanı için ${dateInput.value} · ${timeInput.value} demo randevusu hazırlandı.`);
        });
        Object.entries(services).forEach(([key, service]) => {
            const tab = tabs.find((item) => item.dataset.facilityTab === key);
            const count = allSlots(service).filter(([, status]) => status === "free").length;
            EVO.setText(EVO.qs("small", tab), `${count} boş`);
        });
        setService("parking", false);
    }

    const magneticItems = EVO.qsa("[data-magnetic]");
    const canTilt = window.matchMedia?.("(pointer: fine)").matches && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (canTilt) magneticItems.forEach((item) => {
        item.addEventListener("pointermove", (event) => {
            const bounds = item.getBoundingClientRect();
            item.style.transform = `translate(${(((event.clientX - bounds.left) / bounds.width - .5) * 4).toFixed(1)}px, ${(((event.clientY - bounds.top) / bounds.height - .5) * 4).toFixed(1)}px)`;
        });
        item.addEventListener("pointerleave", () => { item.style.transform = ""; });
    });

    loadUser();
    EVO.enablePageTransitions?.();
})();
