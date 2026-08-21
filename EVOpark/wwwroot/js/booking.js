(() => {
    "use strict";

    const original = document.querySelector("[data-facility-booking]");
    if (!original || new URLSearchParams(window.location.search).get("preview") === "1") return;

    // dashboard.js içindeki eski demo dinleyicilerini taşımadan görünümü korur.
    const booking = original.cloneNode(true);
    original.replaceWith(booking);

    // 0 gönderildiğinde backend, hizmete sahip ilk aktif tesisi güvenli biçimde seçer.
    const facilityId = 0;
    const serviceCodes = {
        parking: "PARKING",
        wash: "WASH",
        charge: "CHARGE"
    };
    const serviceUi = {
        parking: {
            title: "Otoparkı yukarıdan gör.",
            summary: "Otopark randevusu",
            instruction: "Uygun park alanlarından birini seçin.",
            aria: "Otopark alan planı"
        },
        wash: {
            title: "Yıkama kabinlerini yukarıdan gör.",
            summary: "Yıkama randevusu",
            instruction: "Uygun yıkama kabinlerinden birini seçin.",
            aria: "Oto yıkama kabini planı"
        },
        charge: {
            title: "Şarj istasyonlarını yukarıdan gör.",
            summary: "EV şarj randevusu",
            instruction: "Uygun EV şarj noktasını seçin.",
            aria: "EV şarj istasyonu planı"
        }
    };

    const map = booking.querySelector("[data-facility-map]");
    const title = booking.querySelector("[data-facility-title]");
    const subtitle = booking.querySelector("[data-facility-subtitle]");
    const summaryTitle = booking.querySelector("[data-facility-summary-title]");
    const summaryCopy = booking.querySelector("[data-facility-summary-copy]");
    const choice = booking.querySelector("[data-facility-choice]");
    const price = booking.querySelector("[data-facility-price]");
    const dateInput = booking.querySelector("[data-facility-date]");
    const timeInput = booking.querySelector("[data-facility-time]");
    const reserveButton = booking.querySelector("[data-facility-reserve]");
    const demoNote = booking.querySelector(".facility-demo-note");
    const tabs = [...booking.querySelectorAll("[data-facility-tab]")];

    let activeService = "parking";
    let selectedResourceId = null;
    let selectedResourceCode = "";
    let requestSequence = 0;
    let isSaving = false;

    const localDate = (date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 10);
    };

    const selectedStart = () => {
        if (!dateInput?.value || !timeInput?.value) return "";
        return `${dateInput.value}T${timeInput.value}:00`;
    };

    const statusText = (status) => ({
        FREE: "boş",
        OCCUPIED: "dolu",
        RESERVED: "rezerve",
        MAINTENANCE: "bakımda",
        OFFLINE: "kullanılamıyor"
    }[status] || "kullanılamıyor");

    const cssStatus = (status) => ({
        FREE: "free",
        RESERVED: "reserved"
    }[status] || "busy");

    const pricingText = (value, unit) => {
        const amount = new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY"
        }).format(value);
        const suffix = unit === "HOUR" ? " / saat" : unit === "KWH" ? " / kWh" : " / işlem";
        return `${amount}${suffix}`;
    };

    const notify = (message) => {
        const toast = document.createElement("div");
        toast.className = "toast-message";
        toast.setAttribute("role", "status");
        toast.textContent = message;
        document.body.append(toast);
        window.setTimeout(() => toast.remove(), 4500);
    };

    const requestJson = async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers || {})
            }
        });

        const payload = await response.json().catch(() => null);
        if (response.status === 401) {
            window.location.replace("/login.html");
            throw new Error("Oturumunuz sona erdi.");
        }
        if (!response.ok) {
            throw new Error(payload?.message || "İstek tamamlanamadı.");
        }
        return payload;
    };

    const availabilityUrl = (serviceName) => {
        const parameters = new URLSearchParams({
            facilityId: String(facilityId),
            serviceCode: serviceCodes[serviceName]
        });
        const startAt = selectedStart();
        if (startAt) parameters.set("startAt", startAt);
        return `/api/bookings/availability?${parameters}`;
    };

    const updateReserveState = () => {
        if (!reserveButton) return;
        reserveButton.disabled = isSaving || !selectedResourceId || !selectedStart();
    };

    const createSlot = (resource) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `facility-slot is-${cssStatus(resource.status)}`;
        button.dataset.facilityResourceId = String(resource.resourceId);
        button.dataset.facilitySpace = resource.code;
        button.disabled = resource.status !== "FREE";
        button.setAttribute("aria-label", `${resource.code} ${statusText(resource.status)}`);
        button.title = `${resource.code}: ${statusText(resource.status)}`;

        if (activeService === "wash") {
            ["wash-rail wash-rail-left", "wash-rail wash-rail-right", "wash-spray"]
                .forEach((className) => {
                    const decoration = document.createElement("span");
                    decoration.className = className;
                    decoration.setAttribute("aria-hidden", "true");
                    button.append(decoration);
                });
        } else if (activeService === "charge") {
            const charger = document.createElement("span");
            charger.className = "charger-post";
            charger.setAttribute("aria-hidden", "true");
            charger.textContent = "ϟ";
            button.append(charger);
        } else if (resource.status === "OCCUPIED") {
            const car = document.createElement("span");
            car.className = "top-car";
            car.setAttribute("aria-hidden", "true");
            button.append(car);
        }

        const code = document.createElement("span");
        code.className = "slot-code";
        code.textContent = resource.code;
        button.append(code);

        if (!button.disabled) {
            button.addEventListener("click", () => {
                map.querySelectorAll(".facility-slot.is-selected")
                    .forEach((item) => item.classList.remove("is-selected"));
                button.classList.add("is-selected");
                selectedResourceId = resource.resourceId;
                selectedResourceCode = resource.code;
                choice.textContent = resource.code;
                updateReserveState();
            });
        }
        return button;
    };

    const renderResources = (data) => {
        const ui = serviceUi[activeService];
        map.replaceChildren();
        map.className = `facility-map facility-map-${activeService}${activeService === "parking" ? "" : " facility-map-service"}`;
        map.setAttribute("aria-label", ui.aria);

        if (activeService === "parking") {
            const groups = new Map();
            data.resources.forEach((resource) => {
                const block = resource.blockCode || "OTOPARK";
                if (!groups.has(block)) groups.set(block, []);
                groups.get(block).push(resource);
            });
            groups.forEach((resources, blockName) => {
                const section = document.createElement("section");
                section.className = "facility-block";
                section.setAttribute("aria-label", blockName);
                const heading = document.createElement("h5");
                heading.textContent = blockName;
                const grid = document.createElement("div");
                grid.className = "facility-slot-grid";
                resources.forEach((resource) => grid.append(createSlot(resource)));
                section.append(heading, grid);
                map.append(section);
            });
        } else {
            const label = document.createElement("div");
            label.className = "facility-service-title";
            label.textContent = activeService === "wash" ? "YIKAMA KABİNLERİ" : "ŞARJ İSTASYONLARI";
            const grid = document.createElement("div");
            grid.className = "facility-service-grid";
            data.resources.forEach((resource) => grid.append(createSlot(resource)));
            map.append(label, grid);
        }

        const selectedStillFree = data.resources.some((resource) =>
            resource.resourceId === selectedResourceId && resource.status === "FREE");
        if (!selectedStillFree) {
            selectedResourceId = null;
            selectedResourceCode = "";
            choice.textContent = "Henüz seçilmedi";
        }

        title.textContent = ui.title;
        subtitle.textContent = `${data.facilityName} · ${data.facilityAddress}`;
        summaryTitle.textContent = ui.summary;
        summaryCopy.textContent = ui.instruction;
        price.textContent = pricingText(data.price, data.pricingUnit);
        const tab = tabs.find((item) => item.dataset.facilityTab === activeService);
        const count = tab?.querySelector("small");
        if (count) count.textContent = `${data.availableCount} boş`;
        updateReserveState();
    };

    const refresh = async ({ silent = false } = {}) => {
        const sequence = ++requestSequence;
        if (!silent) {
            map.setAttribute("aria-busy", "true");
            reserveButton.disabled = true;
        }
        try {
            const data = await requestJson(availabilityUrl(activeService));
            if (sequence !== requestSequence) return;
            renderResources(data);
        } catch (error) {
            if (sequence !== requestSequence) return;
            selectedResourceId = null;
            selectedResourceCode = "";
            choice.textContent = error.message || "Veri alınamadı";
            map.replaceChildren();
            if (!silent) notify(error.message);
        } finally {
            if (sequence === requestSequence) map.removeAttribute("aria-busy");
            updateReserveState();
        }
    };

    const setService = async (serviceName) => {
        if (!serviceCodes[serviceName]) return;
        activeService = serviceName;
        selectedResourceId = null;
        selectedResourceCode = "";
        choice.textContent = "Henüz seçilmedi";
        tabs.forEach((tab) => {
            const active = tab.dataset.facilityTab === serviceName;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        await refresh();
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => {
        setService(tab.dataset.facilityTab || "parking");
    }));

    document.querySelectorAll("[data-facility-jump]").forEach((link) => {
        link.addEventListener("click", () => setService(link.dataset.facilityJump || "parking"));
    });

    if (dateInput) {
        dateInput.min = localDate(new Date());
        dateInput.max = localDate(new Date(Date.now() + 90 * 86400000));
        dateInput.value = localDate(new Date());
        dateInput.addEventListener("change", () => refresh());
    }
    timeInput?.addEventListener("change", () => refresh());

    reserveButton?.addEventListener("click", async () => {
        if (!selectedResourceId || !selectedStart() || isSaving) return;
        isSaving = true;
        updateReserveState();
        reserveButton.textContent = "Kaydediliyor...";
        try {
            const result = await requestJson("/api/bookings", {
                method: "POST",
                body: JSON.stringify({
                    resourceId: selectedResourceId,
                    startAt: selectedStart()
                })
            });
            notify(result.message || `${selectedResourceCode} için randevu oluşturuldu.`);
            selectedResourceId = null;
            selectedResourceCode = "";
            choice.textContent = "Henüz seçilmedi";
            await refresh({ silent: true });
        } catch (error) {
            notify(error.message);
            await refresh({ silent: true });
        } finally {
            isSaving = false;
            reserveButton.innerHTML = 'Randevu al <span aria-hidden="true">↗</span>';
            updateReserveState();
        }
    });

    if (demoNote) {
        demoNote.textContent = "Doluluk ve randevu bilgileri güvenli biçimde EVOpark sunucusundan alınır.";
    }

    refresh();
    window.setInterval(() => {
        if (document.visibilityState === "visible" && !isSaving) refresh({ silent: true });
    }, 10000);
})();
