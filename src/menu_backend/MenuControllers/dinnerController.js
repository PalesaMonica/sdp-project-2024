const DinnerModel = require('../MenuModels/DinnerItem');

async function fetchDinnerItems(req, res) {
    try {
        const dietPlan = req.query.dietPlan || 'all';
        const items = await DinnerModel.fetchDinnerItems(dietPlan);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}



module.exports = {
    fetchDinnerItems
    
};
