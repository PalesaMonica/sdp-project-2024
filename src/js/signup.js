async function handleSignup(event) {
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
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.msg);
        }

        // Check if the server provided a redirect URL
        if (result.redirectUrl) {
            window.location.href = result.redirectUrl;
        } else {
            // Fallback to login page if no redirect URL is provided
            window.location.href = '/login';
        }
    } catch (error) {
        document.getElementById('error-message').textContent = error.message;
    }
}

module.exports = { handleSignup };