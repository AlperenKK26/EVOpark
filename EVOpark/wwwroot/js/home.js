(() => {
    "use strict";

    const toggle = EVO.qs("[data-menu-toggle]");
    const nav = EVO.qs("[data-mobile-nav]");
    if (toggle && nav) {
        const closeMenu = () => {
            toggle.setAttribute("aria-expanded", "false");
            toggle.querySelector(".sr-only").textContent = "Menüyü aç";
            nav.hidden = true;
        };
        toggle.addEventListener("click", () => {
            const open = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!open));
            toggle.querySelector(".sr-only").textContent = open ? "Menüyü aç" : "Menüyü kapat";
            nav.hidden = open;
        });
        EVO.qsa("a", nav).forEach((link) => link.addEventListener("click", closeMenu));
        document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
    }

    EVO.qsa("[data-unavailable-link]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const message = document.createElement("div");
            message.className = "toast-message";
            message.setAttribute("role", "status");
            message.textContent = "Bu özellik backend entegrasyonu tamamlandığında kullanılabilir olacak.";
            document.body.append(message);
            window.setTimeout(() => message.remove(), 4200);
        });
    });

    document.documentElement.classList.add("js-enabled");

    const revealItems = EVO.qsa(".reveal");
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.14, rootMargin: "0px 0px -36px" });
        revealItems.forEach((item) => revealObserver.observe(item));
    } else {
        revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    const tiltCard = EVO.qs("[data-tilt-card]");
    const canTilt = window.matchMedia?.("(pointer: fine)").matches && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (tiltCard && canTilt) {
        tiltCard.addEventListener("pointermove", (event) => {
            const bounds = tiltCard.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            tiltCard.style.setProperty("--tilt-x", `${(x * 6).toFixed(2)}deg`);
            tiltCard.style.setProperty("--tilt-y", `${(-y * 6).toFixed(2)}deg`);
        });
        tiltCard.addEventListener("pointerleave", () => {
            tiltCard.style.setProperty("--tilt-x", "0deg");
            tiltCard.style.setProperty("--tilt-y", "0deg");
        });
    }

    const magneticItems = EVO.qsa("[data-magnetic]");
    if (canTilt) {
        magneticItems.forEach((item) => {
            item.addEventListener("pointermove", (event) => {
                const bounds = item.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                item.style.transform = `translate(${(x * 5).toFixed(1)}px, ${(y * 5).toFixed(1)}px)`;
            });
            item.addEventListener("pointerleave", () => { item.style.transform = ""; });
        });
    }

    EVO.qsa("[data-service-card]").forEach((card) => {
        card.addEventListener("pointermove", (event) => {
            const bounds = card.getBoundingClientRect();
            card.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
            card.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
        });
        card.addEventListener("pointerleave", () => {
            card.style.removeProperty("--pointer-x");
            card.style.removeProperty("--pointer-y");
        });
    });

    const countTargets = EVO.qsa("[data-count]");
    const animateCount = (element) => {
        if (element.dataset.counted) return;
        element.dataset.counted = "true";
        const target = Number(element.dataset.count);
        const started = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - started) / 900, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = String(Math.round(target * eased));
            if (progress < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
    };
    countTargets.forEach((element) => window.setTimeout(() => animateCount(element), 350));

    const slots = EVO.qsa("[data-parking-slots] .parking-slot-3d");
    const liveCount = EVO.qs("[data-available-count]");
    const liveLabel = EVO.qs(".parking-item .availability");
    const liveTime = EVO.qs("[data-live-time]");
    let simulatedAvailability = Number(liveCount?.dataset.count || 68);
    const updateParkingSimulation = () => {
        if (document.visibilityState === "hidden" || !slots.length || !liveCount) return;
        simulatedAvailability = Math.max(8, Math.min(94, simulatedAvailability + (Math.random() > .5 ? 1 : -1)));
        liveCount.textContent = String(simulatedAvailability);
        if (liveLabel) liveLabel.textContent = `● ${simulatedAvailability} yer`;
        if (liveTime) liveTime.textContent = "az önce";
        const availableSlots = Math.round((simulatedAvailability / 100) * slots.length);
        const order = [...slots].sort(() => Math.random() - .5);
        order.forEach((slot, index) => {
            const wasOccupied = slot.classList.contains("is-occupied");
            const shouldBeOccupied = index >= availableSlots;
            slot.classList.toggle("is-occupied", shouldBeOccupied);
            if (wasOccupied && !shouldBeOccupied) {
                slot.classList.remove("is-newly-available");
                window.requestAnimationFrame(() => slot.classList.add("is-newly-available"));
            }
        });
    };
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) window.setInterval(updateParkingSimulation, 5600);

    const journeyTrack = EVO.qs("[data-journey-track]");
    const updateJourney = () => {
        if (!journeyTrack) return;
        const bounds = journeyTrack.getBoundingClientRect();
        const start = window.innerHeight * .78;
        const end = -bounds.height * .25;
        const progress = Math.max(0, Math.min(1, (start - bounds.top) / (start - end)));
        journeyTrack.style.setProperty("--journey-progress", `${(progress * 100).toFixed(1)}%`);
    };
    if (journeyTrack) {
        updateJourney();
        window.addEventListener("scroll", updateJourney, { passive: true });
        window.addEventListener("resize", updateJourney);
    }

    EVO.enablePageTransitions?.();
})();
