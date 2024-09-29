// Mock data for alerts
const mockAlerts = [
    {
        id: 1,
        message: "Flood warning issued for low-lying areas on campus.",
        status: "active",
        affected_area: "South Campus",
        timestamp: "2024-08-19T12:34:56Z"
    },
    {
        id: 2,
        message: "Electrical maintenance scheduled in the Main Dining Hall.",
        status: "inactive",
        affected_area: "Main Dining Hall",
        timestamp: "2024-09-01T09:20:00Z"
    },
    {
        id: 3,
        message: "Power outage reported in Convocation Hall. Expected to be resolved by 3:00 PM.",
        status: "active",
        affected_area: "Convocation Dining Hall",
        timestamp: "2024-09-27T11:45:00Z"
    }
];

// Array to store the combined notifications (mock alerts + real-time notifications)
let notifications = [];

// Initialize Socket.IO for real-time notifications
const socket = io();  // Assumes Socket.IO client is included in the HTML

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
        return data.map(notification => ({
            id: notification.id,
            type: 'admin',
            title: notification.title,
            content: notification.message,
            unread: notification.is_read === 0,  // Mark as unread if is_read is 0 (false)
            timestamp: new Date(notification.created_at).toLocaleString(),
            icon: '../images/info.png'  // Ensure correct relative path for admin icon
        }));
    })
    .catch(error => {
        console.error('Error fetching admin notifications:', error);
        return [];  // Return an empty array if fetch fails
    });
}

// Function to use mock alerts instead of fetching from an API
function fetchMockAlerts() {
    return new Promise((resolve) => {
        const diningHallAlerts = mockAlerts.filter(alert => 
            alert.affected_area.toLowerCase().includes('dining hall')
        );

        const alerts = diningHallAlerts.map(alert => ({
            id: alert.id,
            type: 'alert',
            title: `Alert: ${alert.affected_area}`,
            content: alert.message,
            status: alert.status,
            unread: alert.status === 'active',
            timestamp: new Date(alert.timestamp).toLocaleString(),
            icon: '../images/alert.png'
        }));

        setTimeout(() => resolve(alerts), 500);
    });
}

// Function to load read states from localStorage
function loadReadStates() {
    const readStates = JSON.parse(localStorage.getItem('readStates')) || {};
    notifications.forEach(notification => {
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
            <div>
                <h2>${notification.title}</h2>
                <p>${notification.content}</p>
                ${notification.type === 'alert' ? `<p>Status: <strong>${notification.status}</strong></p>` : ''}
                <p><small>${notification.timestamp || ''}</small></p>
                ${notification.unread ? `<button class="mark-read-btn" onclick="markAsRead(${notification.id})">Mark as Read</button>` : ''}
            </div>
        `;

        notificationsList.appendChild(notificationElement);
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

// Function to mark notifications as read
function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);

    if (notification) {
        notification.unread = false;

        // Update localStorage for read states
        const readStates = JSON.parse(localStorage.getItem('readStates')) || {};
        readStates[notification.id] = true; // Mark notification as read
        localStorage.setItem('readStates', JSON.stringify(readStates));

        // Refresh the notifications display
        displayNotifications();
        updateUnreadCount();
        
        // Auto-refresh the page
        setTimeout(() => {
            window.location.reload();
        }, 2000); // Refresh after 2 seconds
    }
}

function goBack() {
    window.location.href = '../../userDashboard.html'; // Replace with the actual page you want to go back to
}

// Initialize the notifications on page load
window.onload = () => {
    Promise.all([fetchAdminNotifications(), fetchMockAlerts()])
    .then(([adminNotifications, alerts]) => {
        notifications = [...adminNotifications, ...alerts];

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
            unread: true,  // New notifications are unread
            timestamp: new Date(newNotification.created_at).toLocaleString(),
            icon: '../images/info.png'
        });

        displayNotifications();
        updateUnreadCount();
    });
};
