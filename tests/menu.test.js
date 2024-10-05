const { JSDOM } = require('jsdom');

// Create a mock DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
    <select id="dining-hall-selector">
        <option value="1">Main</option>
        <option value="2">Convocation</option>
    </select>
    <select id="day-selector">
        <option value="week">Weekly View</option>
        <option value="day">Daily View</option>
    </select>
    <div id="menu-container"></div>
    <div id="item-modal">
        <span class="close"></span>
        <h2 id="item-name"></h2>
        <img id="item-image" src="" alt="">
        <p id="item-ingredients"></p>
        <p id="item-diet-type"></p>
        <p id="item-meal-type"></p>
        <p id="item-dining-hall"></p>
        <p id="item-meal-date"></p>
    </div>
    <div id="duplicate-modal">
        <button id="replace-btn"></button>
        <button id="cancel-replace-btn"></button>
    </div>
    <div id="toaster"></div>
    <div id="cart-count">0</div>
    <div id="username"></div>
    <div id="diet-preference"></div>
    <input type="text" id="search-input">
    <button id="search-button"></button>
</body>
</html>
`);

// Set up the mock DOM globals
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock fetch
global.fetch = jest.fn(() => 
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
    })
);

// Now we can require your menu.js file
const { 
    displayMenu, 
    expandMenuItemsByMealType, 
    sortMenuItemsByNextSevenDays, 
    createMenuItem, 
    addToCart 
} = require('../src/js/menu.js');

describe('Menu Functions', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Reset the menu container
        document.getElementById('menu-container').innerHTML = '';
        
        // Reset fetch mock
        fetch.mockClear();
    });

    test('expandMenuItemsByMealType correctly expands items', () => {
        const testItems = [{
            id: 1,
            meal_type: 'breakfast,lunch',
            item_name: 'Test Item'
        }];

        const expanded = expandMenuItemsByMealType(testItems);
        
        expect(expanded).toHaveLength(2);
        expect(expanded[0].meal_type).toBe('breakfast');
        expect(expanded[1].meal_type).toBe('lunch');
    });

    test('sortMenuItemsByNextSevenDays sorts items correctly', () => {
        const testItems = [
            { day_of_week: 'Monday', id: 1 },
            { day_of_week: 'Tuesday', id: 2 }
        ];

        const sorted = sortMenuItemsByNextSevenDays(testItems);
        
        expect(sorted).toHaveLength(7); // Should have 7 days
        expect(sorted.every(day => day.hasOwnProperty('day'))).toBe(true);
        expect(sorted.every(day => day.hasOwnProperty('date'))).toBe(true);
        expect(sorted.every(day => Array.isArray(day.items))).toBe(true);
    });

    test('createMenuItem creates correct DOM element', () => {
        const testItem = {
            id: 1,
            item_name: 'Test Item',
            meal_type: 'breakfast',
            diet_type: 'vegetarian',
            image_url: 'test.jpg',
            dining_hall_id: 1
        };
        const testDate = '2024-10-05';

        const menuItem = createMenuItem(testItem, testDate);
        
        expect(menuItem.querySelector('h3').textContent).toBe('Test Item');
        expect(menuItem.querySelector('h4').textContent).toBe('Breakfast');
        expect(menuItem.querySelector('img').src).toContain('test.jpg');
    });

    test('addToCart makes correct fetch call', async () => {
        const testItem = {
            id: 1,
            dining_hall_id: 1,
            meal_type: 'breakfast'
        };
        const testDate = '2024-10-05';

        await addToCart(testItem, testDate);
        
        expect(fetch).toHaveBeenCalledWith('/api/add-to-cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item: testItem,
                date: testDate
            })
        });
    });
});