const LunchModel = require('../MenuModels/LunchItem');

async function fetchLunchItems(req, res) {
    try {
        const dietPlan = req.query.dietPlan || 'all';
        const items = await LunchModel.fetchLunchItems(dietPlan);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}



module.exports = {
    fetchLunchItems
    
};
