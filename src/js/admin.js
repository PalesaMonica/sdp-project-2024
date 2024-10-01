document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-btn');
    const titleInput = document.getElementById('title-input');
    const messageInput = document.getElementById('message-input');
    const diningHallSelect = document.getElementById('dining-hall-select');
    const successMessage = document.getElementById('success-message');

    sendButton.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const diningHall = diningHallSelect.value;

        if (title && message && diningHall) {
            fetch('/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, message, dining_hall: diningHall }),
            })
            .then(response => {
                if (response.status === 401) {
                    // Redirect to login page if user is not authorized
                    window.location.href = "/login";
                    throw new Error("Unauthorized access. Redirecting to login...");
                  }
              else  if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text(); // Return response text for further validation if needed
            })
            .then(() => {
                // Show success message
                successMessage.style.display = 'block';
                // Clear input fields
                titleInput.value = '';
                messageInput.value = '';
                diningHallSelect.value = '';
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
                alert('Failed to send notification. Please try again.');
            });
        } else {
            alert('Please fill in all fields.');
        }
    });
});

function autoRefreshPage() {
    window.location.reload();  // This will reload the entire page
}

function goBack() {
    window.location.href = '../../meal-management'; // Replace with the actual page you want to go back to
}
