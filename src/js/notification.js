// Array to store the combined notifications (real-time notifications + admin notifications)
let notifications = [];

// Initialize Socket.IO for real-time notifications
const socket = io(); // Assumes Socket.IO client is included in the HTML

// Function to fetch existing admin notifications from the server
let userCreatedAt; // Store user's account creation date

// Function to fetch the user's account creation date
function fetchUserCreatedAt() {
    return fetch('/user/account') // Assuming this endpoint returns user details
        .then(response => response.json())
        .then(user => {
            userCreatedAt = new Date(user.created_at); // Save the user's creation date
            return userCreatedAt;
        })
        .catch(error => {
            console.error('Error fetching user account creation date:', error);
        });
}

// Function to fetch existing admin notifications from the server
function fetchAdminNotifications() {
    return fetch('/notifications', {
        method: 'GET',
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
        } else {
            return response.json();
        }
    })
    .then(data => {
        console.log("Fetched admin notifications:", data);
        // Filter notifications that are after the user's account creation date
        return data
            .filter(notification => new Date(notification.created_at) > userCreatedAt)
            .map(notification => ({
                id: notification.id,
                type: 'admin',
                title: notification.title,
                content: notification.message,
                unread: notification.is_read === 0 || notification.is_read === false,
                timestamp: new Date(notification.created_at).toLocaleString(),
                icon: '../images/info.png'
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
    fetchUserCreatedAt() // First, fetch the user's account creation date
    .then(() => {
        fetchAdminNotifications() // Then, fetch admin notifications only
        .then(adminNotifications => {
            notifications = [...adminNotifications];

            loadReadStates(); // Load read states from local storage
            displayNotifications();
            updateUnreadCount();
        });
    });

    // Real-time notifications (assuming they come after the user's account creation)
    socket.on('newNotification', (newNotification) => {
        if (new Date(newNotification.created_at) > userCreatedAt) {
            console.log('Received new notification:', newNotification);
            notifications.push({
                id: newNotification.id,
                type: 'admin',
                title: newNotification.title,
                content: newNotification.message,
                unread: true,
                timestamp: new Date(newNotification.created_at).toLocaleString(),
                icon: '../images/info.png'
            });

            displayNotifications();
            updateUnreadCount();
        }
    });
};