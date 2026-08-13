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

    EVO.enablePageTransitions = () => {
        const overlay = EVO.qs("[data-page-transition]");
        if (!overlay || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        EVO.qsa("a[href]").forEach((link) => {
            link.addEventListener("click", (event) => {
                if (event.defaultPrevented || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                const url = new URL(link.href, window.location.href);
                if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.hash) return;
                event.preventDefault();
                document.body.classList.add("is-leaving");
                window.setTimeout(() => window.location.assign(url.href), 260);
            });
        });
    };
})();
