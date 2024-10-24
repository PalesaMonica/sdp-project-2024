// Notification Elements
const sendButton = document.getElementById('send-btn');
const titleInput = document.getElementById('title-input');
const messageInput = document.getElementById('message-input');
const diningHallSelect = document.getElementById('dining-hall-select');
const successMessage = document.getElementById('success-message');

// Function to send notification
function sendNotification() {
    const title = titleInput.value.trim();
    const message = messageInput.value.trim();
    const diningHall = diningHallSelect.value;

    if (!title || !message || !diningHall) {
        alert('Please fill in all fields.');
        return;
    }

    fetch('/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title,
            message,
            dining_hall: diningHall,
        }),
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
        } else if (!response.ok) {
            throw new Error('Failed to send notification');
        }
        return response.text();
    })
    .then(text => {
        console.log(text); // For debugging
        successMessage.style.display = 'block'; // Show success message
        titleInput.value = ''; // Clear input fields
        messageInput.value = '';
        diningHallSelect.value = ''; // Reset dining hall selection
    })
    .catch(error => {
        console.error('Error:', error);
        alert('There was an error sending the notification. Please try again later.');
    });
}

// Bind the sendNotification function to the button click event
sendButton.addEventListener('click', sendNotification);

// Navigation Functions
function toggleNav() {
    const sidenav = document.getElementById("sidenav");
    const container = document.querySelector(".container");
    const isOpen = sidenav.style.width === "250px";

    sidenav.style.width = isOpen ? "0" : "250px";
    document.body.style.marginLeft = isOpen ? "0" : "250px";
    container.style.marginLeft = isOpen ? "auto" : "250px";
}

// Logout Function
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
            alert('Logout failed. Please try again.');
        }
    })
    .catch(err => {
        console.error('Error during logout:', err);
        alert('An error occurred during logout. Please try again later.');
    });
}

// Auto Refresh Page
function autoRefreshPage() {
    window.location.reload();  // This will reload the entire page
}

// Go Back Function
function goBack() {
    window.location.href = '../../staffDashboard.html'; // Replace with the actual page you want to go back to
}
module.exports = { sendNotification };