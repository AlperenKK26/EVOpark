"use strict";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) initializeLoginForm();
if (registerForm) initializeRegisterForm();

function initializeLoginForm() {
    const submit = document.getElementById("loginSubmit");
    const status = document.getElementById("loginStatus");

    const query = new URLSearchParams(window.location.search);
    if (query.get("registered") === "1") {
        showSuccess(status, "Hesabınız başarıyla oluşturuldu. Şimdi giriş yapabilirsiniz.");
        window.history.replaceState({}, "", "/login.html");
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        hideStatus(status);

        if (!isValidEmail(email)) {
            showError(status, "Geçerli bir e-posta adresi girin.");
            emailInput.focus();
            return;
        }

        if (!password) {
            showError(status, "Şifrenizi girin.");
            passwordInput.focus();
            return;
        }

        setLoading(submit, true, "Kontrol ediliyor...");

        try {
            const result = await postJson("/api/auth/login", { email, password });
            showSuccess(status, "Giriş başarılı. Yönlendiriliyorsunuz...");
            window.location.href = result?.redirectUrl ?? "/home.html";
        } catch (error) {
            showError(status, getErrorMessage(error));
        } finally {
            setLoading(submit, false, "Giriş yap");
        }
    });
}

function initializeRegisterForm() {
    const submit = document.getElementById("registerSubmit");
    const status = document.getElementById("registerStatus");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const inputs = {
            firstName: document.getElementById("firstName"),
            lastName: document.getElementById("lastName"),
            age: document.getElementById("age"),
            identityNumber: document.getElementById("identityNumber"),
            phone: document.getElementById("phone"),
            email: document.getElementById("email"),
            password: document.getElementById("password"),
            address: document.getElementById("address"),
            birthDate: document.getElementById("birthDate")
        };

        const data = {
            firstName: inputs.firstName.value.trim(),
            lastName: inputs.lastName.value.trim(),
            age: Number(inputs.age.value),
            identityNumber: inputs.identityNumber.value.replace(/\D/g, ""),
            phoneNumber: inputs.phone.value.replace(/\D/g, ""),
            email: inputs.email.value.trim().toLowerCase(),
            password: inputs.password.value,
            address: inputs.address.value.trim(),
            birthDate: inputs.birthDate.value
        };

        hideStatus(status);

        const validationError = validateRegistration(data);
        if (validationError) {
            showError(status, validationError.message);
            inputs[validationError.field]?.focus();
            return;
        }

        setLoading(submit, true, "Kayıt oluşturuluyor...");

        try {
            const result = await postJson("/api/auth/register", data);
            showSuccess(
                status,
                result?.message ??
                "Kayıt işlemi başarılı. Giriş sayfasına yönlendiriliyorsunuz..."
            );
            registerForm.reset();

            window.setTimeout(() => {
                window.location.href = result?.redirectUrl ?? "/login.html";
            }, 2500);
        } catch (error) {
            showError(status, getErrorMessage(error));
        } finally {
            setLoading(submit, false, "Kayıt ol");
        }
    });
}

function validateRegistration(data) {
    if (data.firstName.length < 2)
        return { field: "firstName", message: "İsim en az 2 karakter olmalıdır." };

    if (data.lastName.length < 2)
        return { field: "lastName", message: "Soyisim en az 2 karakter olmalıdır." };

    if (!Number.isInteger(data.age) || data.age < 18 || data.age > 120)
        return { field: "age", message: "Yaş 18 ile 120 arasında olmalıdır." };

    if (!isValidTurkishIdentityNumber(data.identityNumber))
        return { field: "identityNumber", message: "Geçerli bir T.C. kimlik numarası girin." };

    if (!/^05\d{9}$/.test(data.phoneNumber))
        return { field: "phone", message: "Telefonu 05XXXXXXXXX biçiminde girin." };

    if (!isValidEmail(data.email))
        return { field: "email", message: "Geçerli bir e-posta adresi girin." };

    if (data.password.length < 8)
        return { field: "password", message: "Şifre en az 8 karakter olmalıdır." };

    if (data.address.length < 10)
        return { field: "address", message: "Lütfen açık adresinizi girin." };

    if (!data.birthDate)
        return { field: "birthDate", message: "Doğum tarihinizi seçin." };

    const calculatedAge = calculateAge(data.birthDate);
    if (calculatedAge !== data.age)
        return { field: "age", message: `Doğum tarihine göre yaşınız ${calculatedAge}.` };

    return null;
}

async function postJson(url, body) {
    let response;

    try {
        response = await fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
    } catch {
        throw new Error("Sunucuya bağlanılamadı.");
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            result?.message ??
            firstValidationMessage(result) ??
            `İşlem başarısız oldu (${response.status}).`
        );
    }

    return result;
}

function firstValidationMessage(result) {
    if (!result?.errors) return null;
    const messages = Object.values(result.errors).flat();
    return messages[0] ?? null;
}

function setLoading(button, loading, text) {
    button.disabled = loading;
    button.innerHTML = loading
        ? text
        : `${text} <span aria-hidden="true">↗</span>`;
}

function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
    element.classList.remove("is-success");
    element.classList.add("is-error");
}

function showSuccess(element, message) {
    element.textContent = message;
    element.hidden = false;
    element.classList.remove("is-error");
    element.classList.add("is-success");
}

function hideStatus(element) {
    element.textContent = "";
    element.hidden = true;
    element.classList.remove("is-error", "is-success");
}

function getErrorMessage(error) {
    return error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.";
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calculateAge(value) {
    const birthDate = new Date(`${value}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    if (today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() &&
         today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

function isValidTurkishIdentityNumber(value) {
    if (!/^[1-9]\d{10}$/.test(value)) return false;

    const digits = [...value].map(Number);
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const tenthDigit = ((oddSum * 7) - evenSum) % 10;
    const eleventhDigit = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;

    return digits[9] === tenthDigit && digits[10] === eleventhDigit;
}
