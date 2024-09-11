function fetchLunchItems(dietPlan = 'All') {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT ITEM_NAME, ITEM_INGREDIENTS, TYPE FROM LUNCH WHERE DATE(DATE_TIME) = CURDATE()';
        const params = [];

        if (dietPlan !== 'All') {
            sql += ' AND DIET_PLAN = ?';
            params.push(dietPlan);
        }

        connection.query(sql, params, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

module.exports = {
    fetchLunchItems
};
