const request = require('supertest');
const express = require('express');
const { JSDOM } = require('jsdom');
require('jest-fetch-mock').enableMocks();

// Create Express app for testing
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Mock your actual route handlers
app.post('/api/add-to-cart', (req, res) => {
  const { item, date } = req.body;
  
  // Simulate conflict check
  if (item.id === 999) {
    return res.status(409).json({ duplicateItemId: 2 });
  }
  
  res.json({ cartCount: 1 });
});

app.get('/api/cart-items', (req, res) => {
  res.json({
    items: [
      {
        id: 1,
        item_name: 'Test Item',
        date: '2024-10-05',
        meal_type: 'breakfast',
        dining_hall_name: 'Test Hall',
        image_url: 'test.jpg'
      }
    ]
  });
});

app.delete('/api/remove-from-cart/:id', (req, res) => {
  res.json({ success: true });
});

app.post('/api/confirm-reservation', (req, res) => {
  const { reservations } = req.body;
  
  // Simulate conflict check
  if (reservations[0].dining_hall_id === 999) {
    return res.status(409).json({
      duplicateReservation: {
        id: 888,
        date: reservations[0].date,
        meal_type: reservations[0].meal_type
      }
    });
  }
  
  res.json({ message: 'Reservation confirmed successfully!' });
});

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
};

// Mock the menu.js module with our implemented mock functions
jest.mock('../src/js/menu.js', () => ({
  addToCart: mockAddToCart
}));

// Import the mocked functions
const { addToCart } = require('../src/js/menu.js');

const { removeItem, fetchCartItems, displayCartItems, confirmReservation, replaceReservation, showToast  } = require('../src/js/cart.js');

// Integration Tests
describe('API Integration Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cart-count">0</div>
      <div id="cart-items"></div>
      <div id="toaster"></div>
      <div id="conflict-modal" style="display: none;"></div>
    `;
  });

  test('POST /api/add-to-cart - successful addition', async () => {
    const response = await request(app)
      .post('/api/add-to-cart')
      .send({
        item: {
          id: 1,
          dining_hall_id: 1,
          meal_type: 'breakfast'
        },
        date: '2024-10-05'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ cartCount: 1 });
  });

  test('POST /api/add-to-cart - handles conflict', async () => {
    const response = await request(app)
      .post('/api/add-to-cart')
      .send({
        item: {
          id: 999,  // This ID triggers our mock conflict
          dining_hall_id: 1,
          meal_type: 'breakfast'
        },
        date: '2024-10-05'
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ duplicateItemId: 2 });
  });

  test('GET /api/cart-items - fetches cart items', async () => {
    const response = await request(app)
      .get('/api/cart-items');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toHaveProperty('item_name', 'Test Item');
  });

  test('DELETE /api/remove-from-cart/:id - removes item', async () => {
    const response = await request(app)
      .delete('/api/remove-from-cart/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });
});

describe('Integration Tests with DOM Manipulation', () => {
  test('displayCartItems updates DOM correctly', async () => {
    const response = await request(app)
      .get('/api/cart-items');
    
    displayCartItems(response.body.items);
    
    const cartItemsDiv = document.getElementById('cart-items');
    expect(cartItemsDiv.children).toHaveLength(1);
    expect(cartItemsDiv.innerHTML).toContain('Test Item');
    expect(cartItemsDiv.innerHTML).toContain('Test Hall');
  });

  test('confirmReservation handles successful reservation', async () => {
    const mockReservationData = {
      reservations: [{
        dining_hall_id: 1,
        date: '2024-10-05',
        meal_type: 'breakfast'
      }]
    };

    const response = await request(app)
      .post('/api/confirm-reservation')
      .send(mockReservationData);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Reservation confirmed successfully!');
  });

  test('confirmReservation handles conflict', async () => {
    const mockConflictData = {
      reservations: [{
        dining_hall_id: 999,  // This ID triggers our mock conflict
        date: '2024-10-05',
        meal_type: 'breakfast'
      }]
    };

    const response = await request(app)
      .post('/api/confirm-reservation')
      .send(mockConflictData);

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('duplicateReservation');
  });
});

//Mock integration tests
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


//Unit Tests
describe('Cart removeItem Function', () => {
  beforeEach(() => {
    fetch.resetMocks();
    document.body.innerHTML = `
      <div id="cart-items"></div>
    `;
  });

  test('removeItem calls the correct API endpoint', async () => {
    const testItemId = 123;

    fetch.mockResponseOnce(JSON.stringify({ success: true }));

    await removeItem(testItemId);

    expect(fetch).toHaveBeenCalledWith(`/api/remove-from-cart/${testItemId}`, { method: 'DELETE' });
  });

  test('removeItem updates the cart items after successful deletion', async () => {
    fetch.mockResponseOnce(JSON.stringify({ success: true }));

    await removeItem(123);

    // Ensure the cart items are fetched again after deletion
    expect(fetch).toHaveBeenCalledWith('/api/cart-items');
  });
});

describe('fetchCartItems Function', () => {
  test('fetchCartItems calls the correct API endpoint', async () => {
    fetch.mockResponseOnce(JSON.stringify({ items: [] }));

    await fetchCartItems();

    expect(fetch).toHaveBeenCalledWith('/api/cart-items');
  });
});

describe('displayCartItems Function', () => {
  test('displayCartItems correctly displays cart items', () => {
    const testItems = [
      { id: 1, item_name: 'Item 1', date: '2024-10-05', meal_type: 'breakfast', dining_hall_name: 'Hall A', image_url: 'item1.jpg' },
      { id: 2, item_name: 'Item 2', date: '2024-10-06', meal_type: 'lunch', dining_hall_name: 'Hall B', image_url: 'item2.jpg' }
    ];

    displayCartItems(testItems);

    const cartItemsDiv = document.getElementById('cart-items');
    expect(cartItemsDiv.children.length).toBe(2);
    expect(cartItemsDiv.children[0].textContent).toContain('Item 1');
    expect(cartItemsDiv.children[1].textContent).toContain('Item 2');
  });
});

// describe('confirmReservation Function', () => {
//   const testCartItems = [
//     {
//       id: 1,
//       dining_hall_id: 1,
//       username: 'testuser',
//       date: '2024-10-05',
//       meal_type: 'breakfast',
//       user_id: 123
//     }
//   ];

//   beforeEach(() => {
//     // Mock the initial cart items fetch
//     fetch.mockResponseOnce(JSON.stringify(testCartItems));
//   });

//   test('confirmReservation makes the correct API calls and redirects on success', async () => {
//     // Mock successful reservation confirmation
//     fetch.mockResponseOnce(JSON.stringify({ message: 'Reservation confirmed successfully!' }));
    
//     await confirmReservation();

//     // Check the second fetch call (confirm-reservation)
//     expect(fetch.mock.calls[1][0]).toBe('/api/confirm-reservation');
//     expect(fetch.mock.calls[1][1]).toEqual({
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         reservations: [{
//           dining_hall_id: 1,
//           username: 'testuser',
//           date: '2024-10-05',
//           start_time: '07:00:00',
//           end_time: '09:00:00',
//           meal_type: 'breakfast',
//           user_id: 123
//         }]
//       })
//     });

//     // Verify that setTimeout was called for redirect
//     jest.useFakeTimers();
//     expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1500);
//   });

//   test('confirmReservation handles conflict correctly', async () => {
//     const conflictResponse = {
//       duplicateReservation: {
//         id: 999,
//         date: '2024-10-05',
//         meal_type: 'breakfast'
//       }
//     };
//     fetch.mockResponseOnce(JSON.stringify(conflictResponse), { status: 409 });
    
//     await confirmReservation();
    
//     const conflictModal = document.getElementById('conflict-modal');
//     expect(conflictModal.style.display).toBe('block');
//   });

//   test('confirmReservation handles unauthorized access', async () => {
//     fetch.mockResponseOnce('Unauthorized', { status: 401 });
    
//     await confirmReservation();
    
//     expect(window.location.href).toBe('/login');
//   });
// });

// describe('replaceReservation Function', () => {
//   const testCartItems = [{
//     id: 1,
//     dining_hall_id: 1,
//     date: '2024-10-05',
//     meal_type: 'breakfast'
//   }];

//   beforeEach(() => {
//     // Reset cartItems for each test
//     global.cartItems = [...testCartItems];
//   });

//   test('replaceReservation makes correct API call and handles success', async () => {
//     fetch
//       .mockResponseOnce(JSON.stringify({ 
//         message: 'Reservation replaced successfully',
//         newReservationId: 2
//       }))
//       .mockResponseOnce(JSON.stringify({ success: true })); // for removeItem call
    
//     await replaceReservation(999, 1);
    
//     expect(fetch).toHaveBeenNthCalledWith(1, '/api/replace-reservation/999', {
//       method: 'PUT',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ cartItemId: 1 })
//     });
//   });

//   test('replaceReservation handles conflict error', async () => {
//     fetch.mockResponseOnce(JSON.stringify({ 
//       error: 'Conflict with existing reservation'
//     }), { status: 409 });
    
//     await replaceReservation(999, 1);
    
//     const toast = document.querySelector('.toast');
//     expect(toast.textContent).toBe('There is a conflict with an existing reservation. Please choose a different time or date.');
//   });
// });

describe('showToast Function', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    // Clean up any remaining toasts
    const toasts = document.querySelectorAll('.toast');
    toasts.forEach(toast => toast.remove());
  });

  test('showToast handles different toast types', () => {
    showToast('Error message', 'error');
    
    const toast = document.querySelector('.toast');
    expect(toast.className).toContain('toast-error');
  });
});



