(() => {
    "use strict";

    window.EVO = window.EVO || {};

    EVO.qs = (selector, root = document) => root.querySelector(selector);
    EVO.qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

    EVO.setText = (element, value) => {
        if (element) element.textContent = value == null ? "" : String(value);
    };

    EVO.setStatus = (element, message, type = "error") => {
        if (!element) return;
        EVO.setText(element, message);
        element.hidden = !message;
        element.classList.toggle("is-success", type === "success");
    };

    EVO.resetPageTransition = () => {
        document.body.classList.remove("is-leaving");
        const overlay = EVO.qs("[data-page-transition]");
        if (overlay) {
            overlay.removeAttribute("data-active");
            overlay.style.removeProperty("opacity");
            overlay.style.removeProperty("pointer-events");
        }
    };

    EVO.enablePageTransitions = () => {
        const overlay = EVO.qs("[data-page-transition]");
        if (!overlay) return;
        EVO.resetPageTransition();
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        let navigating = false;
        let navigationTimer;
        const reset = () => { navigating = false; EVO.resetPageTransition(); };

        // Back/forward cache can restore the old body class. Always unlock the page when it reappears.
        window.addEventListener("pageshow", reset, { passive: true });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") reset();
        });

        EVO.qsa("a[href]").forEach((link) => {
            link.addEventListener("click", (event) => {
                if (navigating || event.defaultPrevented || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                const url = new URL(link.href, window.location.href);
                if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.hash) return;
                event.preventDefault();
                navigating = true;
                document.body.classList.add("is-leaving");
                navigationTimer = window.setTimeout(() => window.location.assign(url.href), 240);
                // If navigation is interrupted by the browser, never leave the UI locked.
                window.setTimeout(reset, 1800);
            });
        });
        window.addEventListener("pagehide", () => {
            if (navigationTimer) window.clearTimeout(navigationTimer);
        }, { passive: true });
    };
})();
