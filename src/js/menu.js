window.addEventListener('load', () => {
    // Fetch breakfast meals and populate the grid
    fetchMealsByType('breakfast', 'breakfast-grid');
  
    // Fetch lunch meals and populate the grid
    fetchMealsByType('lunch', 'lunch-grid');
  
    // Fetch dinner meals and populate the grid
    fetchMealsByType('dinner', 'dinner-grid');

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

    document.getElementById('search-button').addEventListener('click', performSearch);
    
    // Add event listener for Enter key in search input
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

  });

  function performSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    // Fetch all meal types
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    mealTypes.forEach(mealType => {
        fetch(`/api/menu?mealType=${mealType}`)
            .then(response => response.json())
            .then(menuItems => {
                const dietaryPreference = localStorage.getItem('dietPreference');
                const filteredItems = filterByDietaryPreference(menuItems, dietaryPreference);
                const searchResults = filteredItems.filter(item => 
                    item.item_name.toLowerCase().includes(searchTerm) ||
                    item.ingredients.toLowerCase().includes(searchTerm) ||
                    item.diet_type.toLowerCase().includes(searchTerm)
                );
                populateGrid(`${mealType}-grid`, searchResults);
            })
            .catch(error => console.error(`Error fetching ${mealType} items:`, error));
    });
}
  
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

function updateGrids() {
    fetchMealsByType('breakfast', 'breakfast-grid');
    fetchMealsByType('lunch', 'lunch-grid');
    fetchMealsByType('dinner', 'dinner-grid');
}


  // Function to fetch meals by type
  function fetchMealsByType(mealType, gridId) {
    fetch(`/api/menu?mealType=${mealType}`)
      .then((response) => response.json())
      .then((menuItems) => {
        // Get dietary preference from localStorage
        const dietaryPreference = localStorage.getItem('dietPreference');
        // Filter items according to dietary preference
        const filteredItems = filterByDietaryPreference(menuItems, dietaryPreference);
        // Populate the grid with the fetched menu items
        populateGrid(gridId, filteredItems);
      })
      .catch((error) => console.error(`Error fetching ${mealType} items:`, error));
  }
  

// Function to filter menu items by dietary preference
function filterByDietaryPreference(menuItems, dietaryPreference) {
    if (!dietaryPreference || dietaryPreference === 'none') {
        return menuItems; // If no preference, show all items
    }

    // Filter items based on whether their diet_type contains the preference
    return menuItems.filter((item) => {
        const dietTypes = item.diet_type.split(','); // Assuming diet_type is stored as a comma-separated string
        return dietTypes.includes(dietaryPreference); // Check if any of the diet types match the user's preference
    });
}


  // Function to create an item in the grid
// Function to create an item in the grid
function createItem(menuItem, isInViewAllModal = false) {
    const item = document.createElement('div');
    item.className = 'item';
  
    // Create the image element
    const img = document.createElement('img');
    img.src = menuItem.image_url;
    img.alt = menuItem.item_name;
  
    // Create the overlay for the item name
    const nameOverlay = document.createElement('div');
    nameOverlay.className = 'item-name-overlay';
    nameOverlay.textContent = menuItem.item_name;
  
    // Append the image and name overlay to the item
    item.appendChild(img);
    item.appendChild(nameOverlay);
  
    // Add click event listener to show details
    item.addEventListener('click', () => {
      if (isInViewAllModal) {
        // Close the "View All" modal
        document.getElementById('all-items-modal').style.display = 'none';
      }
      openItemModal(menuItem);
    });
  
    return item;
} 
    function populateGrid(gridId, menuItems) {
      const grid = document.getElementById(gridId);
      grid.innerHTML = '';
      
      if (menuItems.length === 0) {
          const noResults = document.createElement('p');
          noResults.textContent = 'No results found';
          noResults.className = 'no-results';
          grid.appendChild(noResults);
      } else {
          const itemCount = getItemCount();
          const displayedItems = menuItems.slice(0, itemCount);
          
          displayedItems.forEach((menuItem) => {
              grid.appendChild(createItem(menuItem, false));
          });
      }
    }

    function getItemCount() {
        const width = window.innerWidth;
        if (width < 480) return 2;
        if (width < 768) return 3;
        if (width < 1024) return 4;
        return 5;
    } 
  
  // Function to open the modal and show item details
  function openItemModal(menuItem) {
    document.getElementById('item-name').textContent = menuItem.item_name;
    document.getElementById('item-image').src = menuItem.image_url;
    document.getElementById('item-ingredients').textContent = menuItem.ingredients;
    document.getElementById('item-dining-hall').textContent = menuItem.dining_hall;
    document.getElementById('item-diet-type').textContent = menuItem.diet_type;
  

    // Create a reservation link that redirects to the reservation page
    const reservationLink = document.getElementById('reservation-link');
    reservationLink.href = `/diningHalls.html?item=${menuItem.item_name}&dining_hall=${menuItem.dining_hall}`; 
    reservationLink.textContent = 'Make a Reservation';


    const modal = document.getElementById('item-modal');
    modal.style.display = 'block';
  }
  

  // Add event listeners for "View all" links
document.querySelectorAll('.view-all').forEach((viewAllLink) => {
    viewAllLink.addEventListener('click', (event) => {
        event.preventDefault();
        
        const category = event.target.previousElementSibling.textContent.toLowerCase(); // Get the meal type (e.g., "breakfast")
        fetchAllItems(category); // Fetch all items based on the meal type
    });
});

// Function to fetch all items for a meal type
function fetchAllItems(mealType) {
    fetch(`/api/menu?mealType=${mealType}`)
        .then(response => response.json())
        .then(menuItems => {
            // Get dietary preference from localStorage
            const dietaryPreference = localStorage.getItem('dietPreference');
            
            // Filter items according to dietary preference
            const filteredItems = filterByDietaryPreference(menuItems, dietaryPreference);
            
            // Populate the modal grid with filtered items
            const grid = document.getElementById('all-items-grid');
            grid.innerHTML = ''; // Clear previous items
            filteredItems.forEach((menuItem) => {
                grid.appendChild(createItem(menuItem, true));
            });

            // Open the modal
            const modal = document.getElementById('all-items-modal');
            modal.style.display = 'block';
        })
        .catch(error => console.error(`Error fetching all ${mealType} items:`, error));
}

const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
  };
  
  // Add event listeners for close buttons
  document.querySelector('.close').addEventListener('click', () => closeModal('item-modal'));
  document.querySelector('.close-all').addEventListener('click', () => closeModal('all-items-modal'));
  
  // Combined window.onclick function to handle all modals
  window.onclick = function(event) {
    const itemModal = document.getElementById('item-modal');
    const allItemsModal = document.getElementById('all-items-modal');
    
    if (event.target === itemModal) {
      closeModal('item-modal');
    } else if (event.target === allItemsModal) {
      closeModal('all-items-modal');
    }
  };
  
function backToDash(){
    window.location.href = 'userDashboard.html';
}

function reserveMeal(){
  window.location.href = 'diningHalls.html';
}