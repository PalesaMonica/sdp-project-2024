const pool = require('./db-connection'); // Adjust the path as necessary

class DiningHall {
    static async getDiningHalls() {
        try {
            const [results] = await pool.query('SELECT * FROM dining_halls');
            return results;
        } catch (error) {
            console.error('Error fetching dining halls:', error);
            throw new Error('Error fetching dining halls from the database');
        }
    }
}

module.exports = DiningHall; // Ensure this line is present
