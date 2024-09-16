const pool = require('./db-connection'); // Make sure your database connection file is correctly imported

class DiningHall {
    // Fetch dining halls from the database along with their images
    static async getDiningHalls() {
        try {
            const [results] = await pool.query('SELECT id, name, image_url FROM dining_halls');
            return results;
        } catch (error) {
            console.error('Error fetching dining halls:', error);
            throw new Error('Error fetching dining halls from the database');
        }
    }
}

module.exports = DiningHall;
