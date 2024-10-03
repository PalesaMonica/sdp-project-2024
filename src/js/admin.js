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

function toggleNav() {
    const sidenav = document.getElementById("sidenav");
    const container = document.querySelector(".container");
    if (sidenav.style.width === "250px") {
        sidenav.style.width = "0";
        document.body.style.marginLeft = "0";
        container.style.marginLeft = "auto";
    } else {
        sidenav.style.width = "250px";
        document.body.style.marginLeft = "250px";
        container.style.marginLeft = "auto";
    }
}


function logout() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',  // Ensures the session cookie is sent
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Logout successful') {
        window.location.href = data.redirectUrl;  // Redirect to login page
        } else {
        console.error('Logout failed:', data.message);
        }
    })
    .catch(err => {
        console.error('Error during logout:', err);
    });
}

function autoRefreshPage() {
    window.location.reload();  // This will reload the entire page
}

function goBack() {
    window.location.href = '../../staffDashboard.html'; // Replace with the actual page you want to go back to
}
