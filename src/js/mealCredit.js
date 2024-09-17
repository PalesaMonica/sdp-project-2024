document.addEventListener('DOMContentLoaded', () => {
    function fetchCurrentUser() {
        return fetch('http://localhost:3000/api/current-user')
            .then(response => response.json())
            .then(data => data.userId)
            .catch(error => {
                console.error('Error fetching current user:', error);
                return null;
            });
    }

    function fetchMealCredits(userId) {
        return fetch(`http://localhost:3000/api/meal-credits/${userId}`)
            .then(response => response.json())
            .then(data => {
                document.querySelector('.credits-amount').textContent = `R${data.remainingCredits.toFixed(2)}`;
            })
            .catch(error => console.error('Error fetching meal credits:', error));
    }

    function fetchTransactions(userId, filter = 'all') {
        return fetch(`http://localhost:3000/api/transactions/${userId}?filter=${filter}`)
            .then(response => response.json())
            .then(data => {
                // Update the transactions list with the fetched data
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
                    <strong>${transaction.name}</strong>
                    <small>${formatDate(transaction.date)}</small>
                </div>
                <div>
                    <span class="transaction-amount ${transaction.amount > 0 ? 'positive' : ''}">
                        ${transaction.amount > 0 ? '+' : ''}R${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                    <small>${transaction.type}</small>
                </div>
            </div>
        `;
    }

    function renderTransactions(transactions) {
        // Only show the last 4 transactions
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
    fetchCurrentUser()
        .then(userId => {
            if (userId) {
                fetchMealCredits(userId);
                fetchTransactions(userId);  // Default to 'all' filter
            }
        });

    // Event listeners for filtering transactions
    document.getElementById('filter-day')?.addEventListener('click', () => fetchTransactions(userId, 'day'));
    document.getElementById('filter-week')?.addEventListener('click', () => fetchTransactions(userId, 'week'));
    document.getElementById('filter-month')?.addEventListener('click', () => fetchTransactions(userId, 'month'));
    document.getElementById('filter-all')?.addEventListener('click', () => fetchTransactions(userId, 'all'));
});
