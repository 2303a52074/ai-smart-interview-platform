// ================= REGISTER FUNCTION =================
async function register() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!name || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        alert(data.message);

    } catch (error) {
        alert("Something went wrong");
    }
}


// ================= LOGIN FUNCTION =================
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.token) {
            // Store token
            localStorage.setItem("token", data.token);

            // Redirect to dashboard
            window.location.href = "dashboard.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        alert("Login failed");
    }
}