const pool = require('./db-connection');
const { v4: uuidv4 } = require('uuid');
const qr = require('qr-image');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');

class Reservation {
    static breakfastStart = '07:00:00';
    static breakfastEnd = '09:00:00';
    static lunchStart = '11:00:00';
    static lunchEnd = '14:00:00';
    static supperStart = '16:00:00';
    static supperEnd = '19:00:00';
    static reservationCutoffHour = 21; // 9 PM cutoff for reservation

    // Get all dining halls with their images
    static async getDiningHalls() {
        try {
            const [results] = await pool.query('SELECT * FROM dining_halls');
            return results;
        } catch (error) {
            console.error('Error fetching dining halls:', error);
            throw new Error('Error fetching dining halls from the database');
        }
    }

    // Create a new reservation
    static async createReservation(reservationDetails) {
        const { diningHallId, name, surname, date, meals, specialRequest, status } = reservationDetails;
    
        // Validate required fields
        if (!name || !surname || !date || !meals) {
          throw new Error('Missing required fields: name, surname, date, and meals are required.');
        }
    
        const validStatuses = ['confirmed', 'cancelled', 'modified'];
        const reservationStatus = validStatuses.includes(status) ? status : 'confirmed';
    
        const reservationUuid = uuidv4(); // Generate a UUID for the reservation QR code
        const qrCode = qr.imageSync(reservationUuid, { type: 'png' });
    
        try {
          // Prepare the SQL insert query and values
          const queries = [];
          const values = [];
    
          // Insert each meal type and its associated time into the reservations table
          for (const [mealType, time] of Object.entries(meals)) {
            if (time) {
              queries.push(`
                INSERT INTO reservations 
                (dining_hall_id, name, surname, date, time, meal_type, special_requests, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `);
              values.push([diningHallId, name, surname, date, time, mealType, specialRequest, reservationStatus]);
            }
          }
    
          // Execute all queries sequentially
          for (let i = 0; i < queries.length; i++) {
            await pool.query(queries[i], values[i]);
          }
    
          // Return reservation ID (UUID) and generated QR code
          return { reservationId: reservationUuid, qrCode };
        } catch (error) {
          console.error('Error creating reservation:', error);
          throw new Error('Error creating reservation in the database');
        }
    }

    // Fetch meal prices
    static async getMealPrices() {
        try {
            const [rows] = await pool.execute('SELECT * FROM meal_prices');
            return rows;
        } catch (err) {
            throw new Error(`Failed to fetch meal prices: ${err.message}`);
        }
    }

    // Fetch dining hall name
    static async fetchDiningHallName(diningHallId) {
        try {
            // Fetch the dining hall information from your backend API
            const response = await fetch(`http://localhost:3000/api/dining-halls/${diningHallId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch dining hall details.');
            }
            const diningHall = await response.json();
            return diningHall.name;  // Assuming the response contains a field 'name'
        } catch (error) {
            console.error(error);
            return 'Unknown Dining Hall';
        }
    }

    // Get all reservations
    static async getReservations() {
        try {
            const [rows] = await pool.query('SELECT * FROM reservations');
            return rows;
        } catch (error) {
            console.error('Detailed Database Error:', error);
            throw new Error(`Error fetching reservations from the database: ${error.message}`);
        }
    }

    // Update a reservation
    static async updateReservation(id, newTime, currentDate) {
        try {
            console.log('Fetching reservation with ID:', id);

            // Fetch the current reservation
            const [reservationRows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [parseInt(id, 10)]);
            console.log('Retrieved reservation rows:', reservationRows);

            if (reservationRows.length === 0) {
                throw new Error('Reservation not found');
            }

            const reservationData = reservationRows[0];
            const reservationDate = reservationData.date;
            const reservationTime = new Date(`${reservationDate} ${reservationData.time}`);
            const latestUpdateTime = new Date(`${reservationDate} 21:00`);

            // Validate the new time if provided
            if (newTime) {
                // Ensure new time is within allowed range for the meal type
                const mealTimes = {
                    'breakfast': ['07:00', '09:00'],
                    'lunch': ['11:00', '14:00'],
                    'supper': ['16:00', '19:00']
                };

                const mealType = reservationData.meal_type || 'lunch'; // Default to lunch times if meal type is not found
                const [startTime, endTime] = mealTimes[mealType] || mealTimes['lunch'];
                const [newHours, newMinutes] = newTime.split(':').map(Number);
                const [startHours, startMinutes] = startTime.split(':').map(Number);
                const [endHours, endMinutes] = endTime.split(':').map(Number);

                if (newHours < startHours || (newHours === startHours && newMinutes < startMinutes) ||
                    newHours > endHours || (newHours === endHours && newMinutes > endMinutes)) {
                    throw new Error(`New time should be between ${startTime} and ${endTime} for ${mealType}`);
                }

                // Ensure new time is within the allowed update window
                const newReservationTime = new Date(`${reservationDate} ${newTime}`);
                if (newReservationTime > latestUpdateTime) {
                    throw new Error('Updates can only be made until 21:00 the day before the reservation');
                }
            }

            // Update the reservation
            const query = `
                UPDATE reservations 
                SET time = COALESCE(?, time)
                WHERE id = ?
            `;
            const [result] = await pool.query(query, [newTime, id]);

            if (result.affectedRows === 0) {
                throw new Error('Update failed or no rows affected');
            }

            return { message: 'Reservation updated successfully' };
        } catch (error) {
            console.error('Error updating reservation:', error.message); // Detailed logging

            // Specific error handling
            if (error.message.includes('New time should be between')) {
                throw new Error(`Validation Error: ${error.message}`);
            }
            throw new Error(`Error updating reservation in the database: ${error.message}`);
        }
    }

    // Cancel a reservation
    static async cancelReservation(id, reason) {
        try {
            // Check if reservation exists
            const [results] = await pool.query('SELECT date FROM reservations WHERE id = ?', [id]);
            if (results.length === 0) {
                throw new Error('Reservation not found.');
            }

            const reservationDate = new Date(results[0].date);
            const currentDate = new Date();

            // Set the cutoff time for cancellation: 21:00 the day before the reservation date
            const cutoffDate = new Date(reservationDate);
            cutoffDate.setDate(cutoffDate.getDate() - 1);
            cutoffDate.setHours(21, 0, 0, 0);

            // Check if current time is past the cutoff time
            if (currentDate > cutoffDate) {
                throw new Error('Cancellation is not allowed after 21:00 the day before the reservation date.');
            }

            // Proceed with deletion
            const [deleteResult] = await pool.query('DELETE FROM reservations WHERE id = ?', [id]);

            if (deleteResult.affectedRows === 0) {
                throw new Error('Failed to delete reservation or reservation does not exist.');
            }

            return { message: 'Reservation cancelled and removed successfully' };
        } catch (error) {
            // Enhanced error logging
            console.error('Detailed Error:', error.message);
            throw new Error(`Error canceling reservation: ${error.message}`);
        }
    }
}

module.exports = Reservation;
