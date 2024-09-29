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
        if (!response.ok) {
            throw new Error('Failed to fetch admin notifications');
        }
        return response.json();
    })
    .then(data => {
        console.log("Fetched admin notifications:", data);

        // Map the data into the required format, including both read and unread notifications
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
        // Filter the alerts to include only those that mention 'Dining Hall' in the affected area
        const diningHallAlerts = mockAlerts.filter(alert => 
            alert.affected_area.toLowerCase().includes('dining hall')
        );

        // Map the filtered data into the notification format
        const alerts = diningHallAlerts.map(alert => ({
            id: alert.id,
            type: 'alert',
            title: `Alert: ${alert.affected_area}`,  // Use affected area in the title
            content: alert.message,
            status: alert.status,  // Add the status property
            unread: alert.status === 'active',  // Mark as unread if status is active
            timestamp: new Date(alert.timestamp).toLocaleString(),
            icon: '../images/alert.png'  // Correct relative path for alert icon
        }));

        // Simulate async behavior using setTimeout to mimic a fetch
        setTimeout(() => resolve(alerts), 500);  // 500ms delay
    });
}


// Function to display notifications, both read and unread
function displayNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    notificationsList.innerHTML = ''; // Clear current content

    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('notification');

        // Apply different styling for read and unread notifications
        if (notification.unread) {
            notificationElement.classList.add('unread');  // Class for unread notifications
        } else {
            notificationElement.classList.add('read');  // Class for read notifications
        }

        // Create the HTML content for each notification
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

        // Append each notification to the main list
        notificationsList.appendChild(notificationElement);
    });
}

function autoRefreshPage() {
    window.location.reload();  // This will reload the entire page
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

    // Update the unread count in local storage
    localStorage.setItem('unreadCount', unreadCount);
}


// Function to mark notifications as read
function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);

    if (notification) {
        if (notification.type === 'admin') {
            fetch(`/notifications/${id}/read`, {
                method: 'PUT',
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to mark notification as read');
                }
                notification.unread = false;
                autoRefreshPage();  // Auto refresh the entire page
            })
            .catch(error => {
                console.error('Error marking notification as read:', error);
            });
        } else if (notification.type === 'alert') {
            notification.unread = false;
            autoRefreshPage();  // Auto refresh the entire page
        }
        displayNotifications();
        updateUnreadCount();
    }
}

function goBack() {
    window.location.href = '../../userDashboard.html'; // Replace with the actual page you want to go back to
}

// Initialize the notifications on page load
window.onload = () => {
    Promise.all([fetchAdminNotifications(), fetchMockAlerts()])
    .then(([adminNotifications, alerts]) => {
        // Combine fetched admin notifications with mock alerts
        notifications = [...adminNotifications, ...alerts];

        console.log("Combined notifications:", notifications);

        // Display both read and unread notifications
        displayNotifications();
        updateUnreadCount();
    });

    // Listen for new notifications in real-time
    socket.on('newNotification', (newNotification) => {
        console.log('Received new notification:', newNotification);

        // Add the new real-time notification to the existing list
        notifications.push({
            id: newNotification.id,
            type: 'admin',
            title: newNotification.title,
            content: newNotification.message,
            unread: true,  // New notifications are unread
            timestamp: new Date(newNotification.created_at).toLocaleString(),
            icon: '../images/info.png'  // Correct relative path for new admin notification
        });

        // Refresh display to show the new unread notification
        displayNotifications();
        updateUnreadCount();
    });
};
