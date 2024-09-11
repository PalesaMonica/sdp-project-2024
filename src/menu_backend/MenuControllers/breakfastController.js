const breakfastModel = require('../MenuModels/BreakfastItem');

async function fetchbreakfastItems(req, res) {
    try {
        const dietPlan = req.query.dietPlan || 'all';
        const items = await breakfastModel.fetchBreakfastItems(dietPlan);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}



module.exports = {
    fetchbreakfastItems
    
};
