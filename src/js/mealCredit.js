document.addEventListener('DOMContentLoaded', () => {
    function fetchMealCredits() {
        return fetch('http://localhost:3000/api/meal-credits')
            .then(response => response.json())
            .then(data => {
                if (data.remainingCredits) {
                    document.querySelector('.credits-amount').textContent = `R${data.remainingCredits.toFixed(2)}`;
                }
                if (data.transactions) {
                    const html = renderTransactions(data.transactions);
                    updateDOM(html);
                }
            })
            .catch(error => console.error('Error fetching meal credits:', error));
    }

    function fetchTransactions(filter = 'all') {
        return fetch(`http://localhost:3000/api/transactions?filter=${filter}`)
            .then(response => response.json())
            .then(data => {
                const html = renderTransactions(data.transactions);
                updateDOM(html);
            })
            .catch(error => console.error('Error fetching transactions:', error));
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function createTransactionHTML(transaction) {
        return `
            <div class="transaction">
                <div class="transaction-details">
                    <strong>${transaction.description}</strong>
                    <small>${formatDate(transaction.date)}</small>
                </div>
                <div>
                    <span class="transaction-amount ${transaction.amount > 0 ? 'positive' : ''}">
                        ${transaction.amount > 0 ? '+' : ''}R${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                </div>
            </div>
        `;
    }

    function renderTransactions(transactions) {
        const recentTransactions = transactions.slice(0, 4);
        return recentTransactions.map(createTransactionHTML).join('');
    }

    function updateDOM(html) {
        const transactionsList = document.getElementById('transactions-list');
        if (transactionsList) {
            transactionsList.innerHTML = html;
        }
    }

    // Execute fetch operations
    fetchMealCredits();

    // Event listeners for filtering transactions
    document.getElementById('filter-day')?.addEventListener('click', () => fetchTransactions('day'));
    document.getElementById('filter-week')?.addEventListener('click', () => fetchTransactions('week'));
    document.getElementById('filter-month')?.addEventListener('click', () => fetchTransactions('month'));
    document.getElementById('filter-all')?.addEventListener('click', () => fetchTransactions('all'));
});
