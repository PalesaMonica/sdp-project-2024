document.addEventListener('DOMContentLoaded', function () {
    function fetchAndDisplay(dietPlan) {
        ['breakfast', 'lunch', 'dinner'].forEach(category => {
            fetch(`/${category}?dietPlan=${dietPlan}`)
                .then(response => response.json())
                .then(data => {
                    console.log(`${category} data:`, data);

                    const types = {
                        breakfast: ['Snack Pack', 'Main Meal'],
                        lunch: ['Snack Pack', 'Main Meal', 'Fast food'],
                        dinner: ['Snack Pack', 'Main Meal', 'Fast food']
                    };

                    types[category].forEach(type => {
                        const tableBody = document.getElementById(`${category}-${type.toLowerCase().replace(/\s+/g, '')}TableBody`);
                        if (tableBody) {
                            tableBody.innerHTML = '';
                        }
                    });

                    const groupedData = data.reduce((acc, item) => {
                        const type = item.TYPE ? item.TYPE.trim() : 'Unknown';
                        if (!acc[type]) {
                            acc[type] = [];
                        }
                        acc[type].push(item);
                        return acc;
                    }, {});

                    types[category].forEach(type => {
                        const tableBody = document.getElementById(`${category}-${type.toLowerCase().replace(/\s+/g, '')}TableBody`);
                        if (tableBody) {
                            const items = groupedData[type] || [];
                            items.forEach(item => {
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td>${item.ITEM_NAME}</td>
                                    <td>${item.ITEM_INGREDIENTS || 'N/A'}</td>
                                `;
                                tableBody.appendChild(row);
                            });
                        }
                    });
                })
                .catch(error => console.error(`Error fetching ${category} items:`, error));
        });
    }

    document.getElementById('dietPlanForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const dietPlan = document.getElementById('dietPlanInput').value.trim();
        if (dietPlan) {
            fetchAndDisplay(dietPlan);
        } else {
            console.error('Diet plan input is empty.');
        }
    });
});
