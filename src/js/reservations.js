document.addEventListener('DOMContentLoaded', function() {
    fetchReservations();

    const modal = document.getElementById('reservation-modal');
    const closeButton = document.getElementById('close-modal');

    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

function fetchReservations() {
    // Use dates with +02:00 offset
    const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Johannesburg"}));
    console.log('Today (+02:00):', today);

    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    const todayISO = formatDateToISO(today);
    const next7DaysISO = formatDateToISO(next7Days);

    fetch(`/api/reservations?fromDate=${todayISO}&toDate=${next7DaysISO}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data); 
            if (!Array.isArray(data)) {
                throw new Error('Received data is not an array');
            }
            // No need to adjust dates if the server is already sending them in the correct timezone
            displayReservations(data);
        })
        .catch(error => {
            console.error('Error fetching reservations:', error);
            document.getElementById('reservations-list').innerHTML = `<p>Error loading reservations: ${error.message}</p>`;
        });
}

function formatDateToISO(date) {
    return date.toLocaleString("sv-SE", {timeZone: "Africa/Johannesburg"}).split(' ')[0];
}

function formatDate(dateString) {
    if (!dateString) return 'No date provided';
    
    // Parse the date string in the +02:00 timezone
    const date = new Date(dateString + 'T00:00:00+02:00');
    
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Africa/Johannesburg'
    };
    
    return date.toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Africa/Johannesburg',
        hour12: false 
    });
}

function displayReservations(reservations) {
    if (!Array.isArray(reservations)) {
        console.error('Reservations is not an array:', reservations);
        return;
    }

    const reservationsList = document.getElementById('reservations-list');
    reservationsList.innerHTML = '';

    if (reservations.length === 0) {
        reservationsList.innerHTML = '<p>No reservations found.</p>';
        return;
    }

    const groupedReservations = groupReservationsByDay(reservations);

    for (const [date, dateReservations] of Object.entries(groupedReservations)) {
        const groupElement = document.createElement('div');
        groupElement.className = 'reservation-group';

        groupElement.innerHTML = `<h2>${formatDate(date)}</h2>`;

        dateReservations.forEach(reservation => {
            const reservationElement = createReservationElement(reservation);
            groupElement.appendChild(reservationElement);
        });

        reservationsList.appendChild(groupElement);
    }
}

function groupReservationsByDay(reservations) {
    return reservations.reduce((groups, reservation) => {
        const date = new Date(reservation.date).toLocaleDateString('en-CA');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(reservation);
        return groups;
    }, {});
}

function createReservationElement(reservation) {
    const element = document.createElement('div');
    element.className = 'reservation-item';

    const qrCanvas = document.createElement('canvas');
    qrCanvas.className = 'reservation-qr';

    const qr = new QRious({
        element: qrCanvas,
        value: JSON.stringify(reservation),  
        size: 200
    });

    element.innerHTML = `
        <div class="reservation-info">
            <h3>${getMealType(reservation.meal_type)}</h3>
            <p>Time: ${formatTime(reservation.start_time)} - ${formatTime(reservation.end_time)}</p>
            <p>Dining Hall: ${reservation.dining_hall_name}</p>
        </div>
        <div class="reservation-actions">
            <button class="view-btn" onclick="viewReservationDetails(${reservation.id})">View</button>
            <button class="directions-btn" onclick="getDirections(${reservation.id})">Directions</button>
        </div>
    `;

    element.prepend(qrCanvas);

    return element;
}

function viewReservationDetails(reservationId) {
    console.log(`Fetching details for reservation ID: ${reservationId}`);

    fetch(`/api/reservations/${reservationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(reservation => {
            displayReservationDetails(reservation);  
        })
        .catch(error => {
            console.error('Error fetching reservation details:', error);
            alert('Could not load reservation details. Please try again later.');
        });
}

function adjustToTimeZone(dateString) {
    // Convert the date string into a Date object (assumes the input is in UTC)
    const utcDate = new Date(dateString);

    // Add the +02:00 timezone offset (SAST)
    const localDate = new Date(utcDate.getTime() + (2 * 60 * 60 * 1000)); // UTC + 2 hours

    // Format the adjusted date to exclude the time
    const options = {
        weekday: 'long',  // e.g., "Saturday"
        year: 'numeric',  // e.g., "2024"
        month: 'long',    // e.g., "September"
        day: 'numeric',   // e.g., "28"
        timeZone: 'Africa/Johannesburg'  // Ensure it is formatted for SAST
    };

    return localDate.toLocaleDateString('en-US', options);
}


function displayReservationDetails(reservation) {
    const detailsContainer = document.getElementById('reservation-details');
    const modal = document.getElementById('reservation-modal');

    const formattedDate = adjustToTimeZone(reservation.date);
    // Generate QR code
    const qrCanvas = document.createElement('canvas');
    qrCanvas.id = 'qr-code';
    qrCanvas.style.width = '200px';
    qrCanvas.style.height = '200px';
    

    const qrCode = new QRious({
        element: qrCanvas,
        value: JSON.stringify(reservation),
        size: 200
    });

    detailsContainer.innerHTML = `
        <h3>Reservation Details</h3>
        <p>Date: ${formattedDate}</p>
        <p>Meal Type: ${getMealType(reservation.meal_type)}</p>
        <p>Time: ${formatTime(reservation.start_time)} - ${formatTime(reservation.end_time)}</p>
        <p>Dining Hall: ${reservation.dining_hall_name}</p>
        <p>Total Cost: R${calculateCost(reservation)}</p>
    `;

    // Append the QR code canvas to the details container
    detailsContainer.appendChild(qrCanvas);

    modal.style.display = 'block';

}



function formatDate(dateString) {
    if (!dateString) return 'No date provided';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // If the date is invalid, try parsing it as a ISO date string
        const isoDate = new Date(dateString + 'T00:00:00Z');
        if (isNaN(isoDate.getTime())) {
            return 'Invalid Date';
        }
        date = isoDate;
    }
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

function formatDate(dateString) {
    // Check if the dateString is valid and convert it to the appropriate format
    const date = new Date(dateString);
    if (isNaN(date)) {
        return 'Invalid Date';
    }
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}


function getDirections(reservationId) {
    console.log(`Getting directions for reservation ${reservationId}`);
    window.location.href = '#';
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00Z');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

function formatTime(timeString) {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getMealType(mealType) {
    const mealTypes = {
        'breakfast': 'Breakfast',
        'lunch': 'Lunch',
        'dinner': 'Dinner'
    };
    return mealTypes[mealType] || mealType;
}

function calculateCost(reservation) {
    const baseCost = 0;
    const mealCosts = {
        'breakfast': 60,
        'lunch': 60,
        'dinner': 60,
        'supper': 60
    };
    return baseCost + (mealCosts[reservation.meal_type] || 0);
}
