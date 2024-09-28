const diningHallSelector = document.getElementById('dining-hall-selector');
const daySelector = document.getElementById('day-selector');
const menuContainer = document.getElementById('menu-container');
const modal = document.getElementById('item-modal');
const closeButton = document.getElementsByClassName('close')[0];


window.addEventListener('load', () => {
    // Fetch the dietary preference and display it
    fetch("/get-dietary_preference")
    .then((response) => response.json())
    .then((data) => {
      if (data.preference) {
        document.getElementById("diet-preference").textContent = `Your dietary preference is: ${data.preference}`;
        // Save the dietary preference in localStorage for use in filtering
        localStorage.setItem('dietPreference', data.preference);
      } else {
        document.getElementById("diet-preference").textContent = 'No dietary preference found, showing full menu.';
        console.error("Failed to load dietary preference.");
        localStorage.removeItem('dietPreference'); // Clear preference if not found
      }
    })
    .catch((error) => console.error("Error fetching dietary preference:", error));

       // Add resize event listener
       window.addEventListener('resize', debounce(() => {
        updateGrids();
    }, 250));

  });

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function displayMenu() {
    const diningHall = diningHallSelector.value;
    const selectedView = daySelector.value;

    // Retrieve the locally saved dietary preference from localStorage
    const userDietaryPreference = localStorage.getItem('dietPreference') || '';

    // Split the dietary preferences by comma and convert to lowercase
    const dietaryPreferences = userDietaryPreference.toLowerCase().split(',').map(pref => pref.trim());

    // Fetch the menu items based on dining hall and day of the week
    fetch(`/api/menu?dining_hall=${diningHall}&day_of_week=week`)
        .then(response => response.json())
        .then(menuItems => {
            // Filter menu items based on dietary preferences
            const filteredMenuItems = menuItems.filter(item => {
                // Show all items if the preference is "none"
                if (dietaryPreferences.includes('none')) return true;

                // Check if any of the item.diet_type matches the dietaryPreferences
                const itemDietType = item.diet_type.toLowerCase();
                return dietaryPreferences.some(pref => itemDietType.includes(pref));
            });

            menuContainer.innerHTML = '';

            // Expand the filtered items to handle multiple meal types
            const expandedMenuItems = expandMenuItemsByMealType(filteredMenuItems);

            // Sort the items for the next seven days
            const sortedMenuItems = sortMenuItemsByNextSevenDays(expandedMenuItems);

            // Display the menu based on the selected view
            if (selectedView === 'week') {
                displayWeeklyView(sortedMenuItems);
            } else {
                displayDailyView(sortedMenuItems);
            }
        })
        .catch(error => console.error('Error fetching menu:', error));
}

function expandMenuItemsByMealType(menuItems) {
    let expandedItems = [];
    menuItems.forEach(item => {
        const mealTypes = item.meal_type.split(','); // Split by comma
        mealTypes.forEach(type => {
            // Clone the item and set the specific meal type
            const clonedItem = { ...item, meal_type: type.trim() };
            expandedItems.push(clonedItem);
        });
    });
    return expandedItems;
}

function sortMenuItemsByNextSevenDays(menuItems) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const todayIndex = today.getDay(); // Get the index of today's day (0 for Sunday, 6 for Saturday)

    // Get the next 7 days, including today
    const nextSevenDays = [];
    for (let i = 0; i < 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i); // Add i days to today
        const dayOfWeek = daysOfWeek[futureDate.getDay()];
        nextSevenDays.push({ day: dayOfWeek, date: futureDate });
    }

    // Sort menu items to match the next 7 days
    return nextSevenDays.map(({ day, date }) => ({
        day: day,
        date: date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        items: menuItems.filter(item => item.day_of_week.toLowerCase() === day.toLowerCase())
    }));
}


function displayWeeklyView(menuItems) {
    menuItems.forEach(({ day, date, items }) => {
        // Pass both the day and date object to the displayDayContainer function
        displayDayContainer({ day: day, date: date }, items, false);
    });
}


function displayDailyView(menuItems) {
    const today = new Date().toLocaleString('en-us', { weekday: 'long' });
    
    const todayMenu = menuItems.find(menu => menu.day.toLowerCase() === today.toLowerCase());
    
    if (todayMenu) {
        displayDayContainer({day: today, date: new Date().toISOString().split('T')[0]}, todayMenu.items, true);
    } else {
        console.error('No menu found for today');
        displayDayContainer({day: today, date: new Date().toISOString().split('T')[0]}, [], true);
    }

}

function displayDayContainer(day, items, isDaily) {
    const dayContainer = document.createElement('div');
    dayContainer.className = 'day-container';
    
    const dayHeader = document.createElement('h2');
    if (isDaily) {
        dayHeader.textContent = `Today is ${day.day} (${day.date})`;
        dayHeader.classList.add('today-header');
    } else {
        dayHeader.textContent = `${day.day} (${day.date})`;
    }
    dayContainer.appendChild(dayHeader);

    const menuItemsContainer = document.createElement('div');
    menuItemsContainer.className = 'menu-items';

    if (items.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Menu to be updated soon';
        emptyMessage.className = 'empty-menu-message';
        menuItemsContainer.appendChild(emptyMessage);
    } else {
        items.forEach(item => {
            // Pass both the item and the corresponding date to createMenuItem
            const menuItem = createMenuItem(item, day.date);
            menuItemsContainer.appendChild(menuItem);
        });
    }

    dayContainer.appendChild(menuItemsContainer);
    menuContainer.appendChild(dayContainer);
}

function createMenuItem(item, date) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    const today = new Date().toISOString().split('T')[0]; 
    menuItem.innerHTML = `
        <img src="${item.image_url}" alt="${item.item_name}">
        <h3>${item.item_name}</h3>
        <h4>${capitalizeFirstLetter(item.meal_type)}</h4> <!-- Shows the specific meal time -->
        <p>Diet plan: ${item.diet_type}</p>
        <button class="add-to-cart" ${date === today ? 'style="display:none;"' : ''}>+</button> <!-- Hide + button for today's date -->
    `;

    // Add event listener to the plus button if it's not hidden
    if (date !== today) {
        menuItem.querySelector('.add-to-cart').addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(item, date);
        });
    }

    // Pass both the item and the corresponding date to showItemDetails
    menuItem.addEventListener('click', () => showItemDetails(item, date));
    return menuItem;
}

// Toaster display function
function showToaster(message) {
    const toaster = document.getElementById('toaster');
    toaster.textContent = message;
    toaster.classList.add('show');
    
    // Hide the toaster after 3 seconds
    setTimeout(() => {
        toaster.classList.remove('show');
    }, 3000);
}

// Show duplicate pop-up when a conflict is detected
function showDuplicatePopup(item, date, duplicateItemId) {
    const modal = document.getElementById('duplicate-modal');
    const replaceButton = document.getElementById('replace-btn');
    const cancelButton = document.getElementById('cancel-replace-btn');

    modal.style.display = 'block';

    replaceButton.onclick = function() {
        modal.style.display = 'none';
        replaceCartItem(duplicateItemId, item, date);  // Replace the existing item
    };

    cancelButton.onclick = function() {
        modal.style.display = 'none';  // Just close the popup if the user cancels
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// Function to replace the existing item in the cart
function replaceCartItem(duplicateItemId, item, date) {
    fetch(`/api/cart-items/${duplicateItemId}`, {
        method: 'PUT',  
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            item: {
                id: item.id,
                dining_hall_id: item.dining_hall_id,
                meal_type: item.meal_type
            },
            date: date
        })
    })
    .then(response => response.json())
    .then(data => {
        showToaster('Item replaced in cart!');
        updateCartIcon(data.cartCount);  // Update the cart icon
    })
    .catch(error => console.error('Error replacing item in cart:', error));
}


function addToCart(item, date) {
    fetch('/api/add-to-cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            item: {
                id: item.id,
                dining_hall_id: item.dining_hall_id,
                meal_type: item.meal_type
            },
            date: date
        })
    })
    .then(response => {
        if (response.status === 409) {
            // Duplicate found, show the popup
            return response.json().then(data => {
                showDuplicatePopup(item, date, data.duplicateItemId);
            });
        } else if (response.ok) {
            return response.json().then(data => {
                showToaster('Item added to cart!');
                updateCartIcon(data.cartCount);
            });
        } else {
            // Handle other errors
            throw new Error('Failed to add item to cart');
        }
    })
    .catch(error => console.error('Error adding item to cart:', error));
}

// Fetch the current cart item count and update the cart icon
function fetchCartItemCount() {
    fetch('/api/cart-count')  // Assuming you have an API to get the cart item count
    .then(response => response.json())
    .then(data => {
        updateCartIcon(data.cartCount);  // Update the cart icon with the number of items
    })
    .catch(error => console.error('Error fetching cart count:', error));
}

// Function to update the cart icon with the cart item count
function updateCartIcon(cartItemCount) {
    const cartIcon = document.getElementById('cart-count');
    cartIcon.textContent = cartItemCount;
}

// Initialize display and cart count on page load
document.addEventListener('DOMContentLoaded', () => {
    displayMenu();
    fetchCartItemCount();  // Fetch and display the current cart count on page load
});

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

const diningHallNames = {
    1: "Main",
    2: "Convocation",
    3: "Jubilee"
};

// Function to show menu item details in modal
function showItemDetails(item, date) {
    document.getElementById('item-name').textContent = item.item_name;
    document.getElementById('item-image').src = item.image_url;
    document.getElementById('item-ingredients').textContent = item.ingredients;
    document.getElementById('item-diet-type').textContent = item.diet_type;
    document.getElementById('item-meal-type').textContent = item.meal_type;
    document.getElementById('item-dining-hall').textContent = diningHallNames[item.dining_hall_id];
    
    // Show the correct date in the modal
    document.getElementById('item-meal-date').textContent = date;

    modal.style.display = 'block';
}

function setupSearch() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    
    if (searchButton && searchInput) {
      searchButton.addEventListener('click', performSearch);
      searchInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
              performSearch();
          }
      });
      console.log('Search functionality set up');
    } else {
      console.error('Could not find search button or input');
    }
  }
  
  function performSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const diningHall = diningHallSelector.value;
    const selectedView = daySelector.value;
  
    fetch(`/api/menu?dining_hall=${diningHall}&day_of_week=week`)
      .then(response => response.json())
      .then(menuItems => {
        const filteredItems = menuItems.filter(item =>
          item.item_name.toLowerCase().includes(searchTerm) ||
          item.ingredients.toLowerCase().includes(searchTerm) ||
          item.diet_type.toLowerCase().includes(searchTerm)
        );
  
        menuContainer.innerHTML = '';
        const sortedMenuItems = sortMenuItemsByNextSevenDays(filteredItems);
  
        if (selectedView === 'week') {
          displayWeeklyView(sortedMenuItems);
        } else {
          displayDailyView(sortedMenuItems);
        }
      })
      .catch(error => console.error('Error fetching menu:', error));
  }
  


// Close modal functionality
closeButton.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Initialize display on page load
diningHallSelector.addEventListener('change', displayMenu);
daySelector.addEventListener('change', displayMenu);

// Initial display
displayMenu();

setupSearch();

function backToDash() {
    window.location.href = 'userDashboard.html';
  }

//reload the page
function reloadPage() {
    location.reload();
  }