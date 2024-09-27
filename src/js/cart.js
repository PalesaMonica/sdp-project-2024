document.addEventListener('DOMContentLoaded', function() {
    fetchCartItems();

    // Get the reservation modal elements
    const modal = document.getElementById('reservation-modal');
    const confirmButton = document.getElementById('confirm-btn');
    const cancelButton = document.getElementById('cancel-btn');
    const makeReservationButton = document.getElementById('confirm-reservation');

    // Show the confirmation modal when the reservation button is clicked
    makeReservationButton.addEventListener('click', function() {
        modal.style.display = 'block';
    });

    // Confirm the reservation and redirect to the confirmation page
    confirmButton.addEventListener('click', function() {
        modal.style.display = 'none';
        confirmReservation();
    });

    // Hide the modal when cancel is clicked
    cancelButton.addEventListener('click', function() {
        modal.style.display = 'none';
    });
});

function fetchCartItems() {
    fetch('/api/cart-items')
        .then(response => response.json())
        .then(items => {
            displayCartItems(items);
        })
        .catch(error => console.error('Error fetching cart items:', error));
}

function displayCartItems(items) {
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = '';

    items.forEach(item => {
        const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div>
                <img src="${item.image_url}" alt="${item.item_name}" class="item-image">
            </div>
            <div>
                <h3>${item.item_name}</h3>
                <p>Date: ${formattedDate}</p>
                <p>Meal Type: ${item.meal_type}</p>
                <p>Dining Hall: ${item.dining_hall_name}</p>
            </div>
            <button class="remove-item" data-id="${item.id}">Remove</button>
        `;
        cartItemsContainer.appendChild(itemElement);
    });

    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            removeItem(this.getAttribute('data-id'));
        });
    });
}

function removeItem(id) {
    fetch(`/api/remove-from-cart/${id}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(() => {
            fetchCartItems();
        })
        .catch(error => console.error('Error removing item from cart:', error));
}

// Function to confirm reservation
function confirmReservation() {
    fetch('/api/confirm-reservation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.status === 409) {
            // Duplicate reservation found, show popup
            return response.json().then(data => {
                showDuplicateReservationPopup(data.duplicateId);
            });
        } else if (response.ok) {
            // Redirect to confirmation page
            return response.json().then(data => {
                window.location.href = data.redirectUrl;
            });
        } else {
            throw new Error('Failed to confirm reservation');
        }
    })
    .catch(error => console.error('Error confirming reservation:', error));
}

function showDuplicateReservationPopup(duplicateId) {
    const modal = document.getElementById('duplicate-reservation-modal');
    const replaceButton = document.getElementById('replace-reservation-btn');
    const cancelButton = document.getElementById('cancel-reservation-btn');

    modal.style.display = 'block';

    replaceButton.onclick = function() {
        modal.style.display = 'none';
        replaceReservation(duplicateId);  // Replace the existing reservation
    };

    cancelButton.onclick = function() {
        modal.style.display = 'none';  // Close the popup if the user cancels
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function replaceReservation(duplicateId) {
    fetch(`/api/replace-reservation/${duplicateId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            dining_hall_id: newDiningHallId,
            username: newUsername,
            date: newDate,
            start_time: newStartTime,
            end_time: newEndTime,
            meal_type: newMealType,
            user_id: newUserId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to replace reservation');
        }
        return response.json();
    })
    .then(data => {
        showToaster('Reservation replaced successfully!');
        window.location.href = `/reservations.html?id=${data.newReservationId}`;
    })
    .catch(error => {
        console.error('Error replacing reservation:', error);
        showToaster('Error replacing reservation!');
    });
}

