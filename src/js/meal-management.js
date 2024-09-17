document.addEventListener('DOMContentLoaded', () => {
    loadCurrentMenu();
    loadAvailableMeals();

    document.getElementById('add-to-menu').addEventListener('click', addToMenu);
    document.getElementById('add-new-meal').addEventListener('click', addNewMeal);
});

function loadCurrentMenu() {
    fetch('/api/current-menu')
        .then(response => response.json())
        .then(menu => {
            const menuContainer = document.getElementById('current-menu');
            menuContainer.innerHTML = '';
            menu.forEach(item => {
                const itemElement = createMenuItemElement(item);
                menuContainer.appendChild(itemElement);
            });
        })
        .catch(error => console.error('Error loading current menu:', error));
}

function loadAvailableMeals() {
    fetch('/api/available-meals')
        .then(response => response.json())
        .then(meals => {
            const mealSelect = document.getElementById('meal-select');
            meals.forEach(meal => {
                const option = document.createElement('option');
                option.value = meal.id;
                option.textContent = meal.name;
                mealSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading available meals:', error));
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

function addToMenu() {
    const mealId = document.getElementById('meal-select').value;
    if (!mealId) return;

    fetch('/api/add-to-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealId })
    })
        .then(response => response.json())
        .then(() => {
            loadCurrentMenu();
            document.getElementById('meal-select').value = '';
        })
        .catch(error => console.error('Error adding meal to menu:', error));
}

function removeFromMenu(menuItemId) {
    fetch(`/api/remove-from-menu/${menuItemId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(() => loadCurrentMenu())
        .catch(error => console.error('Error removing meal from menu:', error));
}

function addNewMeal() {
    const newMeal = {
        name: document.getElementById('new-meal-name').value,
        ingredients: document.getElementById('new-meal-ingredients').value,
        diet_type: document.getElementById('new-meal-diet-type').value,
        image_url: document.getElementById('new-meal-image-url').value,
        meal_type: document.getElementById('new-meal-type').value
    };

    fetch('/api/add-new-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeal)
    })
        .then(response => response.json())
        .then(() => {
            loadAvailableMeals();
            // Clear input fields
            ['new-meal-name', 'new-meal-ingredients', 'new-meal-diet-type', 'new-meal-image-url'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('new-meal-type').selectedIndex = 0;
        })
        .catch(error => console.error('Error adding new meal:', error));
}
