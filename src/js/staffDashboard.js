document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadDiningHalls();
    loadMenuOptions();
    loadMenuItemsPool();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('dining-hall-select').addEventListener('change', loadWeeklyMenu);
    document.getElementById('day-select').addEventListener('change', loadWeeklyMenu);
    document.querySelector('.meal-type-tabs').addEventListener('click', handleMealTabClick);
    document.getElementById('add-menu-option').addEventListener('click', addMenuOptionToDay);
    document.getElementById('add-new-item').addEventListener('click', addNewMenuItem);
    document.getElementById('create-menu-option').addEventListener('click', createNewMenuOption);
}

async function loadMenuOptions() {
    try {
        const response = await fetch('/api/menu-options');
        const options = await response.json();
        const select = document.getElementById('menu-option-select');
        select.innerHTML = '<option value="">Select option</option>';
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = `Option ${option.id}`;
            select.appendChild(optionElement);
        });

        select.addEventListener('change', (event) => {
            const selectedOption = options.find(opt => opt.id === parseInt(event.target.value));
            if (selectedOption) {
                displayMenuDetails(selectedOption);
            } else {
                document.getElementById('menu-details').innerHTML = '';
            }
        });
    } catch (error) {
        console.error('Error loading menu options:', error);
    }
}

function displayMenuDetails(option) {
    const detailsDiv = document.getElementById('menu-details');
    detailsDiv.innerHTML = `
        <h3>Menu Option ${option.id}</h3>
        <ul>
            ${option.items.map(item => `
                <li>
                    <strong>${item.itemName}</strong><br>
                    Ingredients: ${item.ingredients}<br>
                    Diet: ${item.dietType}<br>
                    Meal Type: ${item.mealType}<br>
                    <img src="${item.imageUrl}" alt="${item.itemName}" style="max-width: 200px;">
                </li>
            `).join('')}
        </ul>
    `;
}

async function loadDiningHalls() {
    try {
        const response = await fetch('/api/dining-halls');
        const diningHalls = await response.json();
        const selects = [
            document.getElementById('dining-hall-select'),
            document.getElementById('add-option-dining-hall')
        ];
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Select Dining Hall</option>';
            diningHalls.forEach(hall => {
                const option = document.createElement('option');
                option.value = hall.id;
                option.textContent = hall.name;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading dining halls:', error);
    }
}

async function addMenuOptionToDay() {
    const menuOptionId = document.getElementById('menu-option-select').value;
    const diningHallId = document.getElementById('add-option-dining-hall').value;
    const day = document.getElementById('add-option-day').value;

    if (!menuOptionId || !diningHallId || !day) {
        alert('Please select a menu option, dining hall, and day.');
        return;
    }

    try {
        const response = await fetch('/api/add-menu-option', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuOptionId, diningHallId, day })
        });
        if (response.ok) {
            alert('Menu option added to weekly menu successfully!');
            loadWeeklyMenu();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Error adding menu option:', error);
        alert('An error occurred while adding the menu option.');
    }
}

async function loadWeeklyMenu() {
    const diningHallId = document.getElementById('dining-hall-select').value;
    const day = document.getElementById('day-select').value;
    const activeMealType = document.querySelector('.meal-tab.active').dataset.meal;

    try {
        const response = await fetch(`/api/weekly-menu/${diningHallId}/${day}`);
        const menu = await response.json();
        displayMenu(menu, activeMealType);
    } catch (error) {
        console.error('Error loading weekly menu:', error);
    }
}

function expandMenuItemsByMealType(menuItems) {
    let expandedItems = [];
    menuItems.forEach(item => {
        // Split meal_type by comma and trim any whitespace
        const mealTypes = item.meal_type.split(',').map(type => type.trim().toLowerCase());
        mealTypes.forEach(type => {
            // Clone the item and set the specific meal type
            const clonedItem = { ...item, meal_type: type };
            expandedItems.push(clonedItem);
        });
    });
    return expandedItems;
}

// Use this expanded list when filtering by meal type
function displayMenu(menu, filterMealType) {
    const menuContainer = document.getElementById('current-menu');
    menuContainer.innerHTML = '';
    const expandedMenu = expandMenuItemsByMealType(menu);
    const filteredMenu = expandedMenu.filter(item => item.meal_type === filterMealType.toLowerCase());
    filteredMenu.forEach(item => {
        const itemElement = createMenuItemElement(item);
        menuContainer.appendChild(itemElement);
    });
}




function createMenuItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'menu-item';
    itemElement.innerHTML = `
        <img src="${item.image_url}" alt="${item.item_name}">
        <h3>${item.item_name}</h3>
        <p>${item.diet_type}</p>
        <button onclick="removeFromMenu(${item.id})">Remove</button>
    `;
    return itemElement;
}

async function removeFromMenu(itemId) {
    const diningHallId = document.getElementById('dining-hall-select').value;
    const day = document.getElementById('day-select').value;

    try {
        const response = await fetch('/api/remove-menu-item', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, diningHallId, day })
        });
        if (response.ok) {
            loadWeeklyMenu();
        }
    } catch (error) {
        console.error('Error removing menu item:', error);
    }
}

function handleMealTabClick(event) {
    if (event.target.classList.contains('meal-tab')) {
        document.querySelectorAll('.meal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        loadWeeklyMenu();
    }
}

async function addNewMenuItem() {
    const newItem = {
        item_name: document.getElementById('new-item-name').value.trim(),
        ingredients: document.getElementById('new-item-ingredients').value.trim(),
        diet_type: document.getElementById('new-item-diet-type').value,
        meal_type: document.getElementById('new-item-meal-type').value,
        image_url: document.getElementById('new-item-image-url').value.trim()
    };

    // Check if all fields are filled
    if (!newItem.item_name || !newItem.ingredients || !newItem.diet_type || !newItem.meal_type || !newItem.image_url) {
        alert('Please fill in all fields before adding a new menu item.');
        return;
    }

    try {
        const response = await fetch('/api/add-menu-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        });
        if (response.ok) {
            // Clear form
            ['new-item-name', 'new-item-ingredients', 'new-item-image-url'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('new-item-diet-type').selectedIndex = 0;
            document.getElementById('new-item-meal-type').selectedIndex = 0;
            alert('Menu item added successfully!');
        }
    } catch (error) {
        console.error('Error adding new menu item:', error);
    }
}

let selectedItems = new Set();

async function loadMenuItemsPool() {
    try {
        const response = await fetch('/api/menu-items');
        const items = await response.json();
        const poolContainer = document.getElementById('menu-items-pool');
        poolContainer.innerHTML = '';
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item-pool-item';
            itemElement.innerHTML = `
                <span class="menu-item-name">${item.item_name}</span>
                <span class="menu-item-meal-type">${item.meal_type}</span>
                <span class="menu-item-diet-type">${item.diet_type}</span>
            `;
            itemElement.dataset.itemId = item.id;
            itemElement.addEventListener('click', toggleItemSelection);
            poolContainer.appendChild(itemElement);
        });
        console.log(`Loaded ${items.length} menu items`);
    } catch (error) {
        console.error('Error loading menu items pool:', error);
    }
}

function toggleItemSelection(event) {
    const itemElement = event.currentTarget;
    const itemId = itemElement.dataset.itemId;
    if (selectedItems.has(itemId)) {
        selectedItems.delete(itemId);
        itemElement.classList.remove('selected');
    } else {
        selectedItems.add(itemId);
        itemElement.classList.add('selected');
    }
    updateSelectedItemsCount();
}

function updateSelectedItemsCount() {
    const countElement = document.getElementById('selected-items-count');
    countElement.textContent = selectedItems.size;
    const createButton = document.getElementById('create-menu-option');
    createButton.disabled = selectedItems.size < 8;
}

async function createNewMenuOption() {
    if (selectedItems.size < 8) {
        alert('Please select at least 8 items to create a menu option.');
        return;
    }

    try {
        const response = await fetch('/api/create-menu-option', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemIds: Array.from(selectedItems) })
        });
        if (response.ok) {
            selectedItems.clear();
            document.querySelectorAll('.menu-item-pool-item').forEach(item => {
                item.classList.remove('selected');
            });
            updateSelectedItemsCount();
            loadMenuOptions();
            alert('New menu option created successfully!');
        }
    } catch (error) {
        console.error('Error creating new menu option:', error);
    }
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
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


// Switch to the Meal Count Overview tab
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`#${button.dataset.tab}`).classList.add('active');
    });
});

// Populate dining halls in the selector
fetch('/api/dining-halls')
    .then(response => response.json())
    .then(diningHalls => {
        const diningHallSelect = document.getElementById('meal-count-dining-hall');
        diningHalls.forEach(diningHall => {
            const option = document.createElement('option');
            option.value = diningHall.id;
            option.textContent = diningHall.name;
            diningHallSelect.appendChild(option);
        });
    });

// Add event listener to load meal count data when selections change
document.getElementById('meal-count-dining-hall').addEventListener('change', loadMealCounts);
document.getElementById('meal-count-day').addEventListener('change', loadMealCounts);

// Function to load meal counts
function loadMealCounts() {
    const diningHallId = document.getElementById('meal-count-dining-hall').value;
    const day = document.getElementById('meal-count-day').value;

    if (!diningHallId || !day) return;

    fetch(`/api/meal-counts?diningHallId=${diningHallId}&day=${day}`)
        .then(response => response.json())
        .then(data => {
            const resultsContainer = document.getElementById('meal-count-results');
            resultsContainer.innerHTML = ''; // Clear previous results

            data.forEach(item => {
                const mealCountItem = document.createElement('div');
                mealCountItem.className = 'meal-count-item';
                mealCountItem.innerHTML = `
                    <p><strong>Meal Type:</strong> ${item.meal_type}</p>
                    <p><strong>Item:</strong> ${item.item_name}</p>
                    <p><strong>Count:</strong> ${item.count}</p>
                `;
                resultsContainer.appendChild(mealCountItem);
            });
        })
        .catch(error => console.error('Error fetching meal counts:', error));
}
