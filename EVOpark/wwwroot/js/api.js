(() => {
    "use strict";

    window.EVO = window.EVO || {};

    class ApiError extends Error {
        constructor(message, status = 0, code = "network_error") {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.code = code;
        }
    }

    const csrfToken = () => EVO.qs('meta[name="request-verification-token"]')?.content || "";

    const request = async (path, options = {}) => {
        const method = (options.method || "GET").toUpperCase();
        const headers = new Headers(options.headers || {});
        headers.set("Accept", "application/json");
        if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
        const token = csrfToken();
        if (token && method !== "GET" && method !== "HEAD") headers.set("RequestVerificationToken", token);

        let response;
        try {
            response = await fetch(path, {
                ...options,
                method,
                headers,
                credentials: "same-origin",
                cache: method === "GET" ? "no-store" : "no-cache",
            });
        } catch {
            throw new ApiError("Sunucuya bağlanılamadı.", 0, "network_error");
        }

        const contentType = response.headers.get("content-type") || "";
        const payload = response.status === 204 ? null : contentType.includes("application/json") ? await response.json().catch(() => null) : null;
        if (!response.ok) {
            const code = response.status === 404 ? "not_found" : response.status === 429 ? "rate_limited" : "request_failed";
            throw new ApiError("İstek tamamlanamadı.", response.status, code);
        }
        return payload;
    };

    EVO.api = { request, get: (path, options = {}) => request(path, { ...options, method: "GET" }), post: (path, body, options = {}) => request(path, { ...options, method: "POST", body: JSON.stringify(body) }), ApiError };
})();
