(() => {
    "use strict";

    const form = EVO.qs("#loginForm");
    if (!form) return;

    const email = EVO.qs("#email", form);
    const password = EVO.qs("#password", form);
    const status = EVO.qs("#loginStatus", form);
    const submit = EVO.qs("#loginSubmit", form);

    const setError = (field, message) => EVO.setText(EVO.qs(`[data-error-for="${field.name}"]`, form), message);
    const clearErrors = () => { setError(email, ""); setError(password, ""); EVO.setStatus(status, ""); };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearErrors();
        let valid = true;
        if (!email.value.trim() || !email.validity.valid) { setError(email, "Geçerli bir e-posta adresi girin."); valid = false; }
        if (!password.value) { setError(password, "Şifrenizi girin."); valid = false; }
        if (!valid) return;

        submit.disabled = true;
        submit.setAttribute("aria-busy", "true");
        try {
            // Parola yalnızca POST gövdesinde gönderilir; hiçbir storage, URL veya log içine yazılmaz.
            const result = await EVO.api.post("/api/auth/login", { email: email.value.trim(), password: password.value });
            password.value = "";
            if (result?.authenticated === false) throw new EVO.api.ApiError("E-posta veya şifre hatalı.", 401, "invalid_credentials");
            EVO.setStatus(status, "Giriş başarılı. Yönlendiriliyorsunuz...", "success");
            window.setTimeout(() => { window.location.assign("/"); }, 350);
        } catch (error) {
            password.value = "";
            const message = error?.code === "not_found" ? "Giriş servisi henüz backend'e eklenmedi. Bu form gerçek bir oturum açmıyor." : error?.code === "rate_limited" ? "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." : error?.status === 401 ? "E-posta veya şifre hatalı." : "Giriş şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin.";
            EVO.setStatus(status, message);
        } finally {
            submit.disabled = false;
            submit.removeAttribute("aria-busy");
        }
    });

    EVO.enablePageTransitions?.();
})();
