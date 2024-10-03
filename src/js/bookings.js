async function fetchDiningHallBookings() {
    try {
        const response = await fetch('/api/dining/bookings', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 401) {
            // Redirect to login page if user is not authorized
            console.warn("Unauthorized access. Redirecting to login...");
            window.location.href = "/login";
           // throw new Error("Unauthorized access. Redirecting to login...");
            return;
          }

        else if (!response.ok) {
            throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching dining hall bookings:', error);
        return [];
    }
}

async function displayBookings() {
    const existingBookings = await fetchDiningHallBookings();
    const bookingList = document.getElementById('booking-list');
    bookingList.innerHTML = ''; // Clear existing bookings

    if (existingBookings.length === 0) {
        bookingList.innerHTML = '<li>No bookings available.</li>';
        return;
    }

    existingBookings.forEach(booking => {
        const listItem = document.createElement('li');
        listItem.textContent = `${booking.name} - ${booking.date} at ${booking.time} in ${booking.hall}`;
        bookingList.appendChild(listItem);
    });
}

window.onload = displayBookings;

async function mockFetch(url, options) {
    if (url === '/api/dining/bookings') {
        return {
            ok: true,
            json: async () => [
                { name: "Event A", date: "2024-10-01", time: "12:00", hall: "Main Hall" },
                { name: "Event B", date: "2024-10-02", time: "15:00", hall: "West Hall" }
            ]
        };
    }
    return {
        ok: false,
        status: 404,
        json: async () => ({ message: "Not Found" })
    };
}

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
// Mock the fetch function for testing
window.fetch = mockFetch;

// Call the function to test with mock data
fetchDiningHallBookings().then(data => {
    console.log('Mock Data:', data);  // Should print the mock bookings
});

function goBack() {
    window.location.href = '../../staffDashboard.html'; // Replace with the actual page you want to go back to
}
