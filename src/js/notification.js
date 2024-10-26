// Array to store the combined notifications (real-time notifications + admin notifications)
let notifications = [];
let userCreatedAt; // Declare userCreatedAt here for wider scope

// Initialize Socket.IO for real-time notifications
const socket = io(); // Assumes Socket.IO client is included in the HTML

// Function to fetch the user's account creation date
function fetchUserCreatedAt() {
    return fetch('/user/account') // Assuming this endpoint returns user details
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user account data');
            }
            return response.json();
        })
        .then(user => {
            userCreatedAt = new Date(user.created_at); // Save the user's creation date
            return userCreatedAt;
        })
        .catch(error => {
            console.error('Error fetching user account creation date:', error);
        });
}

// Function to fetch existing admin notifications from the server
function fetchAdminNotifications() { // No longer needs userCreatedAt as a parameter
    return fetch('/notifications', {
        method: 'GET',
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
        } else if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }
        return response.json();
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
                // Adjust for South African time (UTC+2)
                timestamp: new Date(new Date(notification.created_at).getTime() + 2 * 60 * 60 * 1000).toLocaleString(),
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

        // Adding the "NEW" label conditionally
        const newLabel = notification.unread ? '<span class="new-label">NEW</span>' : '';

        notificationElement.innerHTML = `
            <div class="icon">
                <img src="${notification.icon}" alt="${notification.type} Icon" width="40px" height="40px">
            </div>
            <div class="notification-content">
                <h2>${notification.title} ${newLabel}</h2> <!-- Append the "NEW" label here -->
                <p>${notification.content}</p>
            </div>
            <div class="timestamp">${notification.timestamp || ''}</div>
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
        } else if (!response.ok) {
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

    // Store the count in localStorage so it persists across sessions
    localStorage.setItem('unreadCount', unreadCount);
}

function goBack() {
    window.location.href = '../../userDashboard.html'; // Replace with the actual page you want to go back to
}

// Function to periodically fetch notifications
function periodicNotificationCheck() {
    fetchAdminNotifications().then(adminNotifications => {
        notifications = [...adminNotifications]; // Update notifications with new ones
        loadReadStates(); // Load read states from local storage
        displayNotifications();
        updateUnreadCount(); // Update the unread count
    });
}

// Initialize the notifications on page load
window.onload = () => {
    fetchUserCreatedAt() // First, fetch the user's account creation date
    .then(() => {
        return fetchAdminNotifications(); // Then, fetch admin notifications using the fetched userCreatedAt
    })
    .then(adminNotifications => {
        notifications = [...adminNotifications];

        loadReadStates(); // Load read states from local storage
        displayNotifications();
        updateUnreadCount();
    });

    // Real-time notifications
    socket.on('newNotification', (newNotification) => {
        if (new Date(newNotification.created_at) > userCreatedAt) {
            console.log('Received new notification:', newNotification);
            notifications.push({
                id: newNotification.id,
                type: 'admin',
                title: newNotification.title,
                content: newNotification.message,
                unread: true,
                // Adjust for South African time (UTC+2)
                timestamp: new Date(new Date(newNotification.created_at).getTime() + 2 * 60 * 60 * 1000).toLocaleString(),
                icon: '../images/info.png'
            });

            displayNotifications();
            updateUnreadCount(); // Update the unread count immediately on new notification

            // Update the notification count in localStorage
            const unreadCount = getUnreadCount();
            localStorage.setItem('unreadCount', unreadCount);
        }
    });

    // Initialize the unread count display from localStorage
    const storedUnreadCount = localStorage.getItem('unreadCount');
    if (storedUnreadCount) {
        const unreadCountElement = document.getElementById('unread-count');
        if (unreadCountElement) {
            unreadCountElement.textContent = storedUnreadCount;
        }
    }

    // Start periodic notification check every 5 seconds (adjust the interval as needed)
    setInterval(periodicNotificationCheck, 5000);
};

module.exports = { fetchAdminNotifications };
