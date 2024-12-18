document.addEventListener("DOMContentLoaded", () => {
    fetch("/get-username")
    .then((response) => {
      if (response.status === 401) {
        // Redirect to login page if user is not authorized
        window.location.href = "/login";
        throw new Error("Unauthorized access. Redirecting to login...");
      }
      return response.json();
    })
      .then((data) => {
        if (data.username) {
          document.getElementById("username").textContent = `${data.username}!`;
        } else {
          console.error("Failed to load username.");
        }
      })
      .catch((error) => console.error("Error fetching username:", error));
      
      const unreadCount = localStorage.getItem('unreadCount') || 0; // Default to 0 if not found
      document.getElementById("unread-count").textContent = unreadCount;
  
      const openBtn = document.querySelector('.open-btn');
      const closeBtn = document.querySelector('.close-btn');
      const sidenav = document.getElementById('sidenav');
      const body = document.body;
    
      openBtn.addEventListener('click', () => {
        sidenav.style.width = '250px'; // Open the sidenav
        body.classList.add('open-sidenav'); // Shift the content
      });
    
      closeBtn.addEventListener('click', () => {
        sidenav.style.width = '0'; // Close the sidenav
        body.classList.remove('open-sidenav'); // Reset the content margin
      });
  });
  
const diningHallSelector = document.getElementById('dining-hall-selector');
const daySelector = document.getElementById('day-selector');
const menuContainer = document.getElementById('menu-container');
const modal = document.getElementById('item-modal');
const closeButton = document.getElementsByClassName('close')[0];


window.addEventListener('load', () => {
    // Fetch the dietary preference and display it
    fetch("/get-dietary_preference")
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
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
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
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

// Helper function to format date in local time
function formatDateToLocalString(date) {
  return new Date(date).toLocaleDateString("en-US", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });
}

// Update displayDailyView function to use local date
function displayDailyView(menuItems) {
  const today = new Date();
  const todayFormatted = formatDateToLocalString(today);
  const todayMenu = menuItems.find(menu => menu.day.toLowerCase() === today.toLocaleString('en-US', { weekday: 'long' }).toLowerCase());
  
  if (todayMenu) {
      displayDayContainer({ day: todayFormatted, date: today.toISOString().split('T')[0] }, todayMenu.items, true);
  } else {
      console.error('No menu found for today');
      displayDayContainer({ day: todayFormatted, date: today.toISOString().split('T')[0] }, [], true);
  }
}

// Update displayWeeklyView function to use local date
function displayWeeklyView(menuItems) {
  menuItems.forEach(({ day, date, items }) => {
      const localDate = new Date(date);
      const formattedDate = formatDateToLocalString(localDate);
      
      displayDayContainer({ day: formattedDate, date: localDate.toISOString().split('T')[0] }, items, false);
  });
}

// Update displayDayContainer to handle formatted dates
function displayDayContainer(day, items, isDaily) {
  const dayContainer = document.createElement('div');
  dayContainer.className = 'day-container';
  
  const dayHeader = document.createElement('h2');
  if (isDaily) {
      dayHeader.textContent = `Today is ${day.day}`;
      dayHeader.classList.add('today-header');
  } else {
      dayHeader.textContent = `${day.day}`;
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
          const menuItem = createMenuItem(item, day.date);
          menuItemsContainer.appendChild(menuItem);
      });
  }

  dayContainer.appendChild(menuItemsContainer);
  menuContainer.appendChild(dayContainer);
}

// Update createMenuItem to use local date for display and button logic
function createMenuItem(item, date) {
  const menuItem = document.createElement('div');
  menuItem.className = 'menu-item';

  // Get the current date and time in local time zone
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  const today = now.toISOString().split('T')[0];
  const itemDate = new Date(date);
  const itemDateFormatted = itemDate.toISOString().split('T')[0];

  // Check if the item date is tomorrow
  const isTomorrow = (itemDateFormatted === new Date(now.setDate(now.getDate() + 1)).toISOString().split('T')[0]);

  // Check if the current time is after 9:00 PM
  const isAfterOneAM = now.getHours() >= 21;

  // Condition to disable "+" button
  const disableButton = (itemDateFormatted === today) || (isTomorrow && isAfterOneAM);

  // Construct HTML for menu item with conditional button display
  menuItem.innerHTML = `
      <img src="${item.image_url}" alt="${item.item_name}">
      <h3>${item.item_name}</h3>
      <h4>${capitalizeFirstLetter(item.meal_type)}</h4>
      <p>Diet plan: ${item.diet_type}</p>
      <button class="add-to-cart" ${disableButton ? 'style="display:none;"' : ''}>+</button>
  `;

  // Add event listener to the plus button if it’s not hidden
  if (!disableButton) {
      menuItem.querySelector('.add-to-cart').addEventListener('click', (e) => {
          e.stopPropagation();
          addToCart(item, date);
      });
  }

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
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
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
        if (response.status === 401) {
            // Redirect to login page if user is not authorized
            window.location.href = "/login";
            throw new Error("Unauthorized access. Redirecting to login...");
          }
       else if (response.status === 409) {
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
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
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
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
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
  



if (closeButton) {
    closeButton.onclick = function() {
      modal.style.display = 'none';
    };
  }

// // Close modal functionality
// closeButton.onclick = function() {
//     modal.style.display = 'none';
// }

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

  module.exports = {
    displayMenu,
    expandMenuItemsByMealType,
    sortMenuItemsByNextSevenDays,
    createMenuItem,
    addToCart
  };