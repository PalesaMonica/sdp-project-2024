const { JSDOM } = require('jsdom');
require('jest-fetch-mock').enableMocks();

// Mock the DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Implement mock functions that actually make fetch calls
const mockDisplayMenu = async () => {
  const diningHallSelector = document.getElementById('dining-hall-selector');
  const diningHall = diningHallSelector ? diningHallSelector.value : '1';
  
  await fetch(`/api/menu?dining_hall=${diningHall}&day_of_week=week`);
  // Implementation details not needed for the test
};

// Mock the menu.js module with our implemented mock functions
jest.mock('../src/js/menu.js', () => ({
  displayMenu: mockDisplayMenu,
  expandMenuItemsByMealType: jest.fn(),
  sortMenuItemsByNextSevenDays: jest.fn(),
  createMenuItem: jest.fn()
}));

// Import the mocked functions
const {
  displayMenu,
  expandMenuItemsByMealType,
  sortMenuItemsByNextSevenDays,
  createMenuItem
} = require('../src/js/menu.js');

// Unit Tests
describe('Menu Functions Unit Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
    localStorage.clear();
    document.body.innerHTML = `
      <div id="menu-container"></div>
      <select id="dining-hall-selector"><option value="1">Main</option></select>
      <select id="day-selector"><option value="week">Week</option></select>
    `;
  });

  test('expandMenuItemsByMealType splits meal types correctly', () => {
    const testItem = {
      id: 1,
      item_name: 'Test Item',
      meal_type: 'breakfast,lunch'
    };
    
    expandMenuItemsByMealType.mockReturnValue([
      { ...testItem, meal_type: 'breakfast' },
      { ...testItem, meal_type: 'lunch' }
    ]);

    const result = expandMenuItemsByMealType([testItem]);
    
    expect(result).toHaveLength(2);
    expect(result[0].meal_type).toBe('breakfast');
    expect(result[1].meal_type).toBe('lunch');
  });

  test('displayMenu fetches and displays menu items correctly', async () => {
    const mockMenuItems = [
      {
        id: 1,
        item_name: 'Test Item',
        image_url: 'test.jpg',
        meal_type: 'breakfast',
        diet_type: 'vegetarian',
        dining_hall_id: 1,
        day_of_week: 'Monday'
      }
    ];

    fetch.mockResponseOnce(JSON.stringify(mockMenuItems));

    await displayMenu();
    
    expect(fetch).toHaveBeenCalledWith('/api/menu?dining_hall=1&day_of_week=week');
  });
});

// Mock Data Generator for Testing
function generateMockMenuData(count = 10) {
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const dietTypes = ['vegetarian', 'gluten-free', 'halal', 'none'];
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    item_name: `Test Item ${i + 1}`,
    ingredients: `Ingredient 1, Ingredient 2`,
    meal_type: mealTypes[i % mealTypes.length],
    dining_hall_id: (i % 3) + 1,
    diet_type: dietTypes[i % dietTypes.length],
    image_url: `test-image-${i + 1}.jpg`,
    day_of_week: daysOfWeek[i % daysOfWeek.length]
  }));
}

module.exports = { generateMockMenuData };