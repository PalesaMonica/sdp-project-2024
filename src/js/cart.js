document.addEventListener('DOMContentLoaded', function() {
    // Fetch cart items on page load
    fetchCartItems();

    // Get modal elements
    const modal = document.getElementById('reservation-modal');
    const confirmButton = document.getElementById('confirm-btn');
    const cancelButton = document.getElementById('cancel-btn');
    const makeReservationButton = document.getElementById('confirm-reservation');

    // Conflict modal elements
    const conflictModal = document.getElementById('conflict-modal');
    const deleteButton = document.getElementById('delete-btn');
    const replaceButton = document.getElementById('replace-btn');

    let conflictReservationId = null;
    let cartItemIdToReplace = null;

    // Show the reservation confirmation modal
    makeReservationButton.addEventListener('click', function() {
        modal.style.display = 'block';
    });

    // Confirm the reservation and hide the modal
    confirmButton.addEventListener('click', function() {
        modal.style.display = 'none';
        confirmReservation();  // Call the confirm reservation function
    });

    // Hide the modal when cancel is clicked
    cancelButton.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    // Handle the conflict by removing the item
    deleteButton.addEventListener('click', function() {
        removeItem(cartItemIdToReplace);  // Remove the item from the cart
        conflictModal.style.display = 'none';
    });

    // Handle the conflict by replacing the reservation
    replaceButton.addEventListener('click', function() {
        replaceReservation(conflictReservationId, cartItemIdToReplace);  // Replace reservation
        conflictModal.style.display = 'none';
    });
    
});

    let cartItems = []; // Store cart items

    function fetchCartItems() {
        fetch('/api/cart-items')
        .then((response) => {
            if (response.status === 401) {
              // Redirect to login page if user is not authorized
              window.location.href = "/login";
              throw new Error("Unauthorized access. Redirecting to login...");
            }
            return response.json();
          })
            .then(items => {
                cartItems = items; // Store the fetched items
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

        // Add event listener for removing cart items
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                removeItem(this.getAttribute('data-id'));
            });
        });
    }
    
    function confirmReservation() {
        fetch('/api/cart-items')
        .then((response) => {
            if (response.status === 401) {
              // Redirect to login page if user is not authorized
              window.location.href = "/login";
              throw new Error("Unauthorized access. Redirecting to login...");
            }
            return response.json();
          })
            .then(items => {
                const reservations = items.map(item => {
                    let startTime, endTime;
    
                    switch (item.meal_type) {
                        case 'breakfast':
                            startTime = '07:00:00';
                            endTime = '09:00:00';
                            break;
                        case 'lunch':
                            startTime = '11:00:00';
                            endTime = '14:00:00';
                            break;
                        case 'dinner':
                            startTime = '16:00:00';
                            endTime = '19:00:00';
                            break;
                        default:
                            console.error('Unknown meal type');
                            return null;
                    }
    
                    return {
                        dining_hall_id: item.dining_hall_id,
                        username: item.username,
                        date: item.date,
                        start_time: startTime,
                        end_time: endTime,
                        meal_type: item.meal_type,
                        item_id: item.item_id,
                        user_id: item.user_id
                    };
                });
    
                const validReservations = reservations.filter(res => res !== null);
    
                fetch('/api/confirm-reservation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reservations: validReservations })
                })
                .then(response => {
                    if (response.status === 401) {
                        // Redirect to login page if user is not authorized
                        window.location.href = "/login";
                        throw new Error("Unauthorized access. Redirecting to login...");
                      }
                   else if (response.status === 409) {
                        return response.json().then(data => {
                            console.log('Conflict data:', data);
                            conflictReservationId = data.duplicateReservation.id;
                            cartItemIdToReplace = items.find(item => 
                                item.date === data.duplicateReservation.date && 
                                item.meal_type === data.duplicateReservation.meal_type
                            )?.id;
    
                            if (conflictModal) {
                                conflictModal.style.display = 'block';
                            } else {
                                console.error('Conflict modal not found');
                            }
                        });
                    } else if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.message) {
                        showToast('Reservation confirmed successfully!');
                        setTimeout(() => {
                            window.location.href = '/reservations.html';
                        }, 1500); // Redirect after 1.5 seconds so the user can see the toast
                    }
                })
                .catch(error => {
                    console.error('Error confirming reservation:', error);
                    showToast('There was an error confirming your reservation. Please try again.');
                });
            })
            .catch(error => {
                console.error('Error fetching cart items:', error);
                showToast('There was an error fetching your cart items. Please try again.');
            });
    }

        
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger a reflow to enable the transition
        toast.offsetHeight;

        // Show the toast
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        // Hide and remove the toast after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300); // Wait for the transition to finish before removing
        }, 3000);
    }

    function replaceReservation(existingReservationId, cartItemId) {
        console.log('Replacing reservation:', { existingReservationId, cartItemId });
            
        // Find the cart item in our stored array
        const cartItem = cartItems.find(item => item.id == cartItemId);
            
        if (!cartItem) {
            console.error('Cart item not found');
            showToast('There was an error finding the cart item. Please try again.');
            return;
        }
    
        // Call the replace-reservation endpoint
        fetch(`/api/replace-reservation/${existingReservationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartItemId: cartItemId })
        })
        .then(response => {
            console.log('Replace reservation response:', response);
            if (response.status === 401) {
                // Redirect to login page if user is not authorized
                window.location.href = "/login";
                throw new Error("Unauthorized access. Redirecting to login...");
              }
            else if (!response.ok) {
                if (response.status === 409) {
                    return response.json().then(data => {
                        throw new Error('Conflict with existing reservation');
                    });
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Replace reservation data:', data);
            if (data.message === 'Reservation replaced successfully') {
                // Remove the item from the cart
                return removeItem(cartItemId).then(() => data.newReservationId);
            } else {
                throw new Error('Reservation replacement was not successful');
            }
        })
        .then(newReservationId => {
            showToast('Reservation replaced successfully!');
        })
        .catch(error => {
            console.error('Error replacing reservation:', error);
            if (error.message === 'Conflict with existing reservation') {
                showToast('There is a conflict with an existing reservation. Please choose a different time or date.');
            } else {
                showToast('There was an error replacing your reservation. Please try again.');
            }
        });
    }
    
    function removeItem(id) {
        return fetch(`/api/remove-from-cart/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.status === 401) {
                    // Redirect to login page if user is not authorized
                    window.location.href = "/login";
                    throw new Error("Unauthorized access. Redirecting to login...");
                  }
                else if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                fetchCartItems();  // Refresh cart items after deletion
            })
            .catch(error => {
                console.error('Error removing item from cart:', error);
                throw error;  // Re-throw the error to be caught in the main chain
            });
    }

module.exports = {
    removeItem, fetchCartItems, displayCartItems, confirmReservation, replaceReservation, showToast 
  };