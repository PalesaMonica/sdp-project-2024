/**
 * @jest-environment jsdom
 */

const request = require('supertest');
const express = require('express');
require('jest-fetch-mock').enableMocks();
const { JSDOM } = require('jsdom');
const { fetchReservations, deleteReservation, groupReservationsByDay } = require('../src/js/reservations'); // Import your functions

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock routes for testing purposes
app.delete('/api/reservations/:id', (req, res) => {
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

// Mock the DOM environment for unit tests
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="reservations-list"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock fetch API
global.fetch = require('jest-fetch-mock');

describe('Reservations Unit Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
    document.body.innerHTML = '<div id="reservations-list"></div>';
  });

  // test('fetchReservations fetches reservations and filters out cancelled ones', async () => {
  //   // Mock fetch response
  //   fetch.mockResponseOnce(JSON.stringify([
  //     { id: 1, meal_type: 'lunch', date: '2024-10-05', dining_hall_name: 'Main Hall', status: 'cancelled' },
  //     { id: 2, meal_type: 'dinner', date: '2024-10-06', dining_hall_name: 'South Hall', status: 'cancelled' }
  //   ]));
  
  //   // Call the function
  //   await fetchReservations();

  //   const reservationList = document.getElementById('reservations-list');
    
  //   // Debug log to check what is inside the reservation list
  //   console.log(reservationList.innerHTML);  // This will print the HTML content in the console for debugging
  
  //   // Ensure there is only one confirmed reservation being rendered
  //   expect(reservationList.children.length).toBe(0);  
  //   expect(reservationList.innerHTML).toContain('Main Hall');
  // });
  

  test('deleteReservation removes reservation and updates DOM', async () => {
    fetch.mockResponseOnce(JSON.stringify({ success: true }));

    await deleteReservation(1);  // Assuming reservation ID 1

    const reservationList = document.getElementById('reservations-list');
    expect(reservationList.children.length).toBe(0);  // No reservations left
  });

  test('groupReservationsByDay correctly groups reservations by date', () => {
    const reservations = [
      { id: 1, meal_type: 'lunch', date: '2024-10-05', dining_hall_name: 'Main Hall' },
      { id: 2, meal_type: 'dinner', date: '2024-10-05', dining_hall_name: 'South Hall' }
    ];

    const groupedReservations = groupReservationsByDay(reservations);
    expect(Object.keys(groupedReservations)).toHaveLength(1);  // Both on the same day
    expect(groupedReservations['2024-10-05']).toHaveLength(2);
  });
});

describe('Reservations Integration Tests', () => {
  test('POST /api/confirm-reservation confirms a reservation', async () => {
    const response = await request(app)
      .post('/api/confirm-reservation')
      .send({
        reservations: [{
          dining_hall_id: 1,
          date: '2024-10-05',
          meal_type: 'breakfast'
        }]
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Reservation confirmed successfully!');
  });

  test('POST /api/confirm-reservation handles conflicts', async () => {
    const response = await request(app)
      .post('/api/confirm-reservation')
      .send({
        reservations: [{
          dining_hall_id: 999,  // Triggers conflict
          date: '2024-10-05',
          meal_type: 'breakfast'
        }]
      });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('duplicateReservation');
  });

  test('DELETE /api/reservations/:id deletes a reservation successfully', async () => {
    const response = await request(app)
      .delete('/api/reservations/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });
});


