document.addEventListener('DOMContentLoaded', () => {
    function fetchMealCredits() {
        return fetch('/api/meal-credits')
            .then(response => response.json())
            .then(data => {
                if (data.remaining_credits !== undefined) {
                    document.querySelector('.credits-amount').textContent = `R${data.remaining_credits.toFixed(2)}`;
                }

                if (data.transactions && data.transactions.length > 0) {
                    const html = renderTransactions(data.transactions);
                    updateDOM(html);
                } else {
                    document.getElementById('transactions-list').innerHTML = '<p>No recent transactions</p>';
                }
            })
            .catch(error => console.error('Error fetching meal credits:', error));
    }

    function renderTransactions(transactions) {
        return transactions.map(transaction => `
            <div class="transaction">
                <div class="transaction-details">
                    <strong>${transaction.meal_type}</strong>
                    <small>${new Date(transaction.date).toLocaleDateString()}</small>
                </div>
                <div>
                    <span class="transaction-amount ${transaction.amount > 0 ? 'positive' : ''}">
                        ${transaction.amount > 0 ? '+' : '-'}R${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    function updateDOM(html) {
        document.getElementById('transactions-list').innerHTML = html;
    }

    // Initial load
    fetchMealCredits();
});
