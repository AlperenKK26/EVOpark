"use strict";

const loginForm = document.getElementById("loginForm");
const loginSubmit = document.getElementById("loginSubmit");
const loginStatus = document.getElementById("loginStatus");

loginForm.addEventListener("submit", async function (event) {
    // Formun normal şekilde sayfayı yenilemesini engeller.
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    hideStatus();

    if (!email) {
        showError("E-posta adresinizi girin.");
        emailInput.focus();
        return;
    }

    if (!password) {
        showError("Şifrenizi girin.");
        passwordInput.focus();
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",

            // Backend’in oluşturduğu oturum çerezini kabul eder.
            credentials: "same-origin",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        let result = null;

        try {
            result = await response.json();
        } catch {
            // Sunucu JSON döndürmezse uygulamanın çökmesini engeller.
        }

        if (!response.ok) {
            const message =
                result?.message ??
                `Giriş işlemi başarısız oldu (${response.status}).`;

            throw new Error(message);
        }

        showSuccess("Giriş başarılı. Yönlendiriliyorsunuz...");

        // C# tarafından döndürülen adrese yönlendirir.
        window.location.href =
            result?.redirectUrl ?? "/home.html";
    } catch (error) {
        console.error("Giriş hatası:", error);

        showError(
            error instanceof Error
                ? error.message
                : "Beklenmeyen bir hata oluştu."
        );
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    loginSubmit.disabled = isLoading;

    if (isLoading) {
        loginSubmit.textContent = "Kontrol ediliyor...";
    } else {
        loginSubmit.innerHTML =
            'Giriş yap <span aria-hidden="true">↗</span>';
    }
}

function showError(message) {
    loginStatus.textContent = message;
    loginStatus.hidden = false;
    loginStatus.classList.remove("is-success");
    loginStatus.classList.add("is-error");
}

function showSuccess(message) {
    loginStatus.textContent = message;
    loginStatus.hidden = false;
    loginStatus.classList.remove("is-error");
    loginStatus.classList.add("is-success");
}

function hideStatus() {
    loginStatus.textContent = "";
    loginStatus.hidden = true;
    loginStatus.classList.remove("is-error", "is-success");
}