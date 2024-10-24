function fetchBookings() {
    const diningHall = document.getElementById('diningHallSelect').value; // Get selected dining hall name
    const bookingList = document.getElementById('booking-list');
    const errorMessage = document.getElementById('error-message');
    
    // Clear the previous error and booking list
    bookingList.innerHTML = '';
    errorMessage.style.display = 'none';
    
    if (diningHall) {
        // Construct the correct API endpoint with venueID query parameter
        const venueID = encodeURIComponent(diningHall);
        const apiUrl = `/api/dining/bookings?venueID=${venueID}`;
        
        // Fetch bookings for the selected dining hall using the correct API
        fetch(apiUrl)
            .then(response => {
                if (response.status === 401) {
                    // Redirect to login page if user is not authorized
                    window.location.href = "/login";
                    throw new Error("Unauthorized access. Redirecting to login...");
                } else if (!response.ok) {
                    throw new Error('Failed to fetch bookings');
                }
                return response.json();
            })
            .then(data => {
                console.log('API response data:', data);  // Log the API response for debugging

                // Assuming the data returned is an array of bookings
                const bookings = Array.isArray(data) ? data : data.bookings || [];

                if (bookings.length > 0) {
                    // Populate booking list
                    bookings.forEach(booking => {
                        const li = document.createElement('li');
                        li.classList.add('booking-item');  // Apply the booking-item class for styling
                        
                        // Customize the content based on your booking structure
                        li.innerHTML = `
                            <strong>${booking.bookingDescription}</strong><br>
                            <span>Date: ${booking.bookingDate}</span><br>
                            <span>Start: ${booking.bookingStartTime}</span> | 
                            <span>End: ${booking.bookingEndTime}</span>
                        `;

                        bookingList.appendChild(li);
                    });
                } else {
                    bookingList.innerHTML = '<li class="booking-item" style="font-weight: bold; color:  #043673;">No bookings found for this dining hall.</li>';
                }
            })
            .catch(error => {
                console.error('Error fetching bookings:', error);
                errorMessage.textContent = 'Failed to fetch bookings';
                errorMessage.style.display = 'block';
            });
    }
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

function goBack() {
    window.location.href = '../../staffDashboard.html'; // Replace with the actual page you want to go back to
}
