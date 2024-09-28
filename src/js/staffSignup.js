async function handleStaffSignup(event) {
    event.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('error-message').textContent = "Passwords do not match.";
        return;
    }

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/staffSignup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.msg);
        }

        if (result.redirectUrl) {
            window.location.href = result.redirectUrl;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        document.getElementById('error-message').textContent = error.message;
    }
}

document.querySelector('form').addEventListener('submit', handleStaffSignup);
