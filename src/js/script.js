// script.js
async function submitPassword() {
    const userId = 1; // Replace with actual user ID retrieval method
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;

    try {
        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, oldPassword, newPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error);
            return;
        }

        alert(data.message);
        // Reset fields and show profile
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
        showProfile(); // Show the profile view again
    } catch (error) {
        console.error('Error updating password:', error);
        alert('An error occurred while updating the password.');
    }
}

function showProfile() {
    // Logic to show the profile section
}
