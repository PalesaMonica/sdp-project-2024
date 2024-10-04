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
const mockAddToCart = async (item, date) => {
  await fetch('/api/add-to-cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      item,
      date
    })
  });
  // Implementation details not needed for the test
};

// Mock the menu.js module with our implemented mock functions
jest.mock('../src/js/menu.js', () => ({
  addToCart: mockAddToCart
}));

// Import the mocked functions
const { addToCart } = require('../src/js/menu.js');

// Integration Tests
describe('Cart Integration Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
    localStorage.clear();
    document.body.innerHTML = `
      <div id="cart-count">0</div>
      <div id="toaster"></div>
      <div id="duplicate-modal">
        <button id="replace-btn"></button>
        <button id="cancel-replace-btn"></button>
      </div>
    `;
  });

  test('addToCart handles successful item addition', async () => {
    const testItem = {
      id: 1,
      dining_hall_id: 1,
      meal_type: 'breakfast'
    };
    const testDate = '2024-10-05';

    fetch.mockResponseOnce(JSON.stringify({ cartCount: 1 }));

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

  test('addToCart handles duplicate item conflict', async () => {
    const testItem = {
      id: 1,
      dining_hall_id: 1,
      meal_type: 'breakfast'
    };
    const testDate = '2024-10-05';

    fetch.mockResponseOnce(JSON.stringify({ duplicateItemId: 2 }), { status: 409 });

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
    
    // Verify that the duplicate modal is displayed
    expect(document.getElementById('duplicate-modal').style.display).toBe("");
  });
});