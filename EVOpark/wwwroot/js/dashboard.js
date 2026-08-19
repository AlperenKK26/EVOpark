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

    if (today) today.textContent = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date()).toLocaleUpperCase("tr-TR");

    const setUser = (user) => {
        const name = user?.firstName?.trim() || "EVOpark";
        EVO.setText(firstName, name);
        EVO.setText(userName, name);
        EVO.setText(initials, name.charAt(0).toUpperCase());
    };

    const loadUser = async () => {
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
