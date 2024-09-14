window.addEventListener('load', () => {
    // Fetch breakfast meals and populate the grid
    fetchMealsByType('breakfast', 'breakfast-grid');
  
    // Fetch lunch meals and populate the grid
    fetchMealsByType('lunch', 'lunch-grid');
  
    // Fetch dinner meals and populate the grid
    fetchMealsByType('dinner', 'dinner-grid');
  });
  
  
  // Function to fetch meals by type
  function fetchMealsByType(mealType, gridId) {
    fetch(`/api/menu?mealType=${mealType}`)
      .then((response) => response.json())
      .then((menuItems) => {
        // Populate the grid with the fetched menu items
        populateGrid(gridId, menuItems);
      })
      .catch((error) => console.error(`Error fetching ${mealType} items:`, error));
  }
  
  // Function to create an item in the grid
// Function to create an item in the grid
function createItem(menuItem) {
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
      openItemModal(menuItem);
    });
  
    return item;
  }
    
  // Function to populate a grid with menu items
  function populateGrid(gridId, menuItems) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = ''; // Clear previous items
    menuItems.forEach((menuItem) => {
      grid.appendChild(createItem(menuItem));
    });
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
    reservationLink.href = `/reservations?item=${menuItem.item_name}&dining_hall=${menuItem.dining_hall}`; 
    reservationLink.textContent = 'Make a Reservation';


    const modal = document.getElementById('item-modal');
    modal.style.display = 'block';
  }
  
  // Function to close modal
  const closeModal = () => {
    const modal = document.getElementById('item-modal');
    modal.style.display = 'none';
  };
  
  document.querySelector('.close').addEventListener('click', closeModal);
  
  // Close modal when clicking outside
  window.onclick = function (event) {
    const modal = document.getElementById('item-modal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };

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
            // Populate the modal grid with all items
            const grid = document.getElementById('all-items-grid');
            grid.innerHTML = ''; // Clear previous items
            menuItems.forEach((menuItem) => {
                grid.appendChild(createItem(menuItem));
            });

            // Open the modal
            const modal = document.getElementById('all-items-modal');
            modal.style.display = 'block';
        })
        .catch(error => console.error(`Error fetching all ${mealType} items:`, error));
}

// Close the modal when the close button is clicked
document.querySelector('.close-all').addEventListener('click', () => {
    document.getElementById('all-items-modal').style.display = 'none';
});

// Close the modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('all-items-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
  