// Array to store the combined notifications (real-time notifications + admin notifications)
let notifications = [];

// Initialize Socket.IO for real-time notifications
const socket = io(); // Assumes Socket.IO client is included in the HTML

// Function to fetch existing admin notifications from the server
function fetchAdminNotifications() {
    return fetch('/notifications', {
        method: 'GET',
    })
    .then(response => {
        if (response.status === 401) {
            // Redirect the user to the login page
            window.location.href = '/login';
        } else {
            return response.json();
        }
    })
    .then(data => {
        console.log("Fetched admin notifications:", data);
        // Correctly map the unread status based on `is_read` value from the server
        return data.map(notification => ({
            id: notification.id,
            type: 'admin',
            title: notification.title,
            content: notification.message,
            unread: notification.is_read === 0 || notification.is_read === false, // Correctly mark as unread if is_read is false or 0
            timestamp: new Date(notification.created_at).toLocaleString(),
            icon: '../images/info.png' // Ensure correct relative path for admin icon
        }));
    })
    .catch(error => {
        console.error('Error fetching admin notifications:', error);
        return []; // Return an empty array if fetch fails
    });
}

function loadReadStates() {
    const readStates = JSON.parse(localStorage.getItem('readStates')) || {};
    notifications.forEach(notification => {
        // Only update if the notification was marked as read in localStorage
        if (readStates[notification.id]) {
            notification.unread = false; // Mark as read if stored in local storage
        }
    });
}
// Function to display notifications
function displayNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    notificationsList.innerHTML = '';

    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('notification');

        if (notification.unread) {
            notificationElement.classList.add('unread');
        } else {
            notificationElement.classList.add('read');
        }

        notificationElement.innerHTML = `
            <div class="icon">
                <img src="${notification.icon}" alt="${notification.type} Icon" width="40px" height="40px">
            </div>
            <div class="notification-content">
                <h2>${notification.title}</h2>
                <p>${notification.content}</p>
                <p><small>${notification.timestamp || ''}</small></p>
            </div>
        `;

        // Add a click event listener to each notification
        notificationElement.addEventListener('click', () => {
            handleNotificationClick(notification);
        });

        notificationsList.appendChild(notificationElement);
    });
}

// Function to handle a notification click
function handleNotificationClick(notification) {
    // Example behavior: Mark notification as read and update UI
    notification.unread = false;

    // Optional: If you want to update the backend when a notification is read, you can call an API like this:
    markNotificationAsRead(notification.id);

    // Update local storage to reflect the read status
    const readStates = JSON.parse(localStorage.getItem('readStates')) || {};
    readStates[notification.id] = true;
    localStorage.setItem('readStates', JSON.stringify(readStates));

    displayNotifications(); // Re-render the notifications list
    updateUnreadCount();    // Update the unread count in the notification bar

    console.log(`Notification clicked: ${notification.title}`);
}

// Optional: Function to update read status in the backend
function markNotificationAsRead(notificationId) {
    fetch(`/notifications/${notificationId}/read`, {
        method: 'POST',
    })
    .then(response => {
        if (response.status === 401) {
            // Redirect to login page if user is not authorized
            window.location.href = "/login";
            throw new Error("Unauthorized access. Redirecting to login...");
          }
      else  if (!response.ok) {
            throw new Error(`Failed to mark notification as read: ${response.statusText}`);
        }
        console.log(`Notification ${notificationId} marked as read on the server.`);
    })
    .catch(error => {
        console.error('Error marking notification as read:', error);
    });
}

// Function to calculate the count of unread notifications
function getUnreadCount() {
    return notifications.filter(notification => notification.unread).length;
}

// Function to update the unread notification count in the notification bar
function updateUnreadCount() {
    const unreadCount = getUnreadCount();
    const unreadCountElement = document.getElementById('unread-count');

    if (unreadCountElement) {
        unreadCountElement.textContent = unreadCount;
    }

    localStorage.setItem('unreadCount', unreadCount);
}
function goBack() {
    window.location.href = '../../userDashboard.html'; // Replace with the actual page you want to go back to
}

// Initialize the notifications on page load
window.onload = () => {
    fetchAdminNotifications() // Fetch admin notifications only
    .then(adminNotifications => {
        notifications = [...adminNotifications];

        loadReadStates(); // Load read states from local storage
        displayNotifications();
        updateUnreadCount();
    });

    // Listen for new notifications in real-time
    socket.on('newNotification', (newNotification) => {
        console.log('Received new notification:', newNotification);
        notifications.push({
            id: newNotification.id,
            type: 'admin',
            title: newNotification.title,
            content: newNotification.message,
            unread: true, // New notifications are unread
            timestamp: new Date(newNotification.created_at).toLocaleString(),
            icon: '../images/info.png'
        });

        displayNotifications();
        updateUnreadCount();
    });

    // Add event listener to reset count when notification bar is clicked
    const notificationBar = document.getElementById('notification-link');
    if (notificationBar) {
        notificationBar.addEventListener('click', () => {
            notifications.forEach(notification => {
                notification.unread = false; // Reset unread status
            });
            updateUnreadCount(); // Update the count in the notification bar
        });
    }
};
