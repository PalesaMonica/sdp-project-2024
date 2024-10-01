window.addEventListener('load', () => {
  // Fetch and set user's dietary preference
  fetchDietaryPreference();

  // Set up event listeners for dining hall and menu view selectors
  setupSelectors();

  // Initial menu fetch
  fetchMenu();

  // Add resize event listener
  window.addEventListener('resize', debounce(updateGrids, 250));

  // Set up search functionality
  setupSearch();
});

function fetchDietaryPreference() {
  console.log('Fetching dietary preference');
  fetch("/get-dietary_preference")
      .then((response) => response.json())
      .then((data) => {
          if (data.preference) {
              document.getElementById("diet-preference").textContent = `Your dietary preference is: ${data.preference}`;
              localStorage.setItem('dietPreference', data.preference);
          } else {
              document.getElementById("diet-preference").textContent = 'No dietary preference found, showing full menu.';
              console.log("No dietary preference found");
              localStorage.removeItem('dietPreference');
          }
      })
      .catch((error) => console.error("Error fetching dietary preference:", error));
}

function setupSelectors() {
  const diningHallSelector = document.getElementById('dining-hall-select');
  const menuViewSelector = document.getElementById('menu-view-select');

  if (diningHallSelector && menuViewSelector) {
    diningHallSelector.addEventListener('change', fetchMenu);
    menuViewSelector.addEventListener('change', fetchMenu);
    console.log('Selectors set up successfully');
  } else {
    console.error('Could not find dining hall or menu view selectors');
  }
}

function fetchMenu() {
  console.log('fetchMenu called');
  const diningHallId = document.getElementById('dining-hall-select')?.value || 'all';
  const menuView = document.getElementById('menu-view-select')?.value || 'daily';
  const currentDate = new Date().toISOString().split('T')[0];

  console.log(`Fetching menu for dining hall: ${diningHallId}, view: ${menuView}`);

  let url;
  if (menuView === 'daily') {
      url = `http://localhost:3000/api/daily-menu?diningHallId=${diningHallId}&mealDate=${currentDate}`;
  } else if (menuView === 'weekly') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const endDateString = endDate.toISOString().split('T')[0];
      url = `http://localhost:3000/api/weekly-menu?diningHallId=${diningHallId}&startDate=${currentDate}&endDate=${endDateString}`;
  } else {
      url = `http://localhost:3000/api/all-menus`;
  }

  console.log('Fetching from URL:', url);

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(menuItems => {
      console.log('Received menu items:', menuItems);
      const dietaryPreference = localStorage.getItem('dietPreference');
      const filteredItems = filterByDietaryPreference(menuItems, dietaryPreference);
      console.log('Filtered menu items:', filteredItems);
      populateGrid('menu-container', filteredItems, menuView);
    })
    .catch(error => {
      console.error(`Error fetching menu items:`, error);
      document.getElementById('menu-container').innerHTML = '<p>Error loading menu. Please try again later.</p>';
    });
}

function filterByDietaryPreference(menuItems, dietaryPreference) {
  if (!dietaryPreference || dietaryPreference === 'none') {
      return menuItems;
  }
  return menuItems.filter((item) => {
      const dietTypes = item.diet_type.split(',');
      return dietTypes.includes(dietaryPreference);
  });
}

function populateGrid(gridId, menuItems, viewType) {
  console.log(`Populating grid: ${gridId} with ${menuItems.length} items, view type: ${viewType}`);
  const grid = document.getElementById(gridId);
  if (!grid) {
    console.error(`Grid element with id ${gridId} not found`);
    return;
  }
  grid.innerHTML = '';
  
  if (menuItems.length === 0) {
      const noResults = document.createElement('p');
      noResults.textContent = 'No results found';
      noResults.className = 'no-results';
      grid.appendChild(noResults);
  } else {
      if (viewType === 'weekly') {
          populateWeeklyView(grid, menuItems);
      } else {
          populateDailyView(grid, menuItems);
      }
  }
}


function populateDailyView(grid, menuItems) {
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  mealTypes.forEach(mealType => {
      const mealItems = menuItems.filter(item => item.meal_type === mealType);
      if (mealItems.length > 0) {
          const mealSection = document.createElement('div');
          mealSection.className = 'meal-section';
          mealSection.innerHTML = `<h3>${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h3>`;
          const mealGrid = document.createElement('div');
          mealGrid.className = 'item-grid';
          mealItems.forEach(item => mealGrid.appendChild(createItem(item)));
          mealSection.appendChild(mealGrid);
          grid.appendChild(mealSection);
      }
  });
}

function populateWeeklyView(grid, menuItems) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  daysOfWeek.forEach(day => {
      const dayItems = menuItems.filter(item => new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' }) === day);
      if (dayItems.length > 0) {
          const daySection = document.createElement('div');
          daySection.className = 'day-section';
          daySection.innerHTML = `<h3>${day}</h3>`;
          const dayGrid = document.createElement('div');
          dayGrid.className = 'item-grid';
          dayItems.forEach(item => dayGrid.appendChild(createItem(item)));
          daySection.appendChild(dayGrid);
          grid.appendChild(daySection);
      }
  });
}

function createItem(menuItem) {
  const item = document.createElement('div');
  item.className = 'item';
  
  const img = document.createElement('img');
  img.src = menuItem.image_url;
  img.alt = menuItem.item_name;
  
  const nameOverlay = document.createElement('div');
  nameOverlay.className = 'item-name-overlay';
  nameOverlay.textContent = menuItem.item_name;
  
  item.appendChild(img);
  item.appendChild(nameOverlay);
  
  item.addEventListener('click', () => openItemModal(menuItem));
  
  return item;
}

function openItemModal(menuItem) {
  document.getElementById('item-name').textContent = menuItem.item_name;
  document.getElementById('item-image').src = menuItem.image_url;
  document.getElementById('item-ingredients').textContent = menuItem.ingredients;
  document.getElementById('item-dining-hall').textContent = menuItem.dining_hall;
  document.getElementById('item-diet-type').textContent = menuItem.diet_type;

  const reservationLink = document.getElementById('reservation-link');
  reservationLink.href = `/diningHalls.html?item=${menuItem.item_name}&dining_hall=${menuItem.dining_hall}`; 
  reservationLink.textContent = 'Make a Reservation';

  document.getElementById('item-modal').style.display = 'block';
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
  const diningHallId = document.getElementById('dining-hall-select').value;
  const menuView = document.getElementById('menu-view-select').value;
  const currentDate = new Date().toISOString().split('T')[0];

  let url;
  if (menuView === 'daily') {
      url = `/api/daily-menu?diningHallId=${diningHallId}&mealDate=${currentDate}`;
  } else {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6);
      const endDateString = endDate.toISOString().split('T')[0];
      url = `/api/weekly-menu?diningHallId=${diningHallId}&startDate=${currentDate}&endDate=${endDateString}`;
  }

  fetch(url)
      .then(response => response.json())
      .then(menuItems => {
          const dietaryPreference = localStorage.getItem('dietPreference');
          const filteredItems = filterByDietaryPreference(menuItems, dietaryPreference);
          const searchResults = filteredItems.filter(item => 
              item.item_name.toLowerCase().includes(searchTerm) ||
              item.ingredients.toLowerCase().includes(searchTerm) ||
              item.diet_type.toLowerCase().includes(searchTerm)
          );
          populateGrid('menu-grid', searchResults, menuView);
      })
      .catch(error => console.error(`Error fetching menu items:`, error));
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
  fetchMenu();
}

// Modal close functionality
document.querySelector('.close').addEventListener('click', () => closeModal('item-modal'));

window.onclick = function(event) {
  const itemModal = document.getElementById('item-modal');
  if (event.target === itemModal) {
      closeModal('item-modal');
  }
};

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function backToDash() {
  window.location.href = 'userDashboard.html';
}
