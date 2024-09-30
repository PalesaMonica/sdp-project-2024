document.addEventListener('DOMContentLoaded', () => {
    function fetchTransactions(filter = 'all') {
        fetch(`/api/transactions?filter=${filter}`)
            .then(response => response.json())
            .then(data => {
                const transactionList = document.getElementById('transaction-list');
                transactionList.innerHTML = data.transactions.map(transaction => `
                    <tr>
                        <td>${new Date(transaction.date).toLocaleDateString()}</td>
                        <td>R${transaction.amount.toFixed(2)}</td>
                        <td>${transaction.meal_type}</td> <!-- e.g., Breakfast, Lunch -->
                    </tr>
                `).join('');
            })
            .catch(error => {
                console.error('Error fetching transactions:', error);
            });
    }

    // Initial load
    fetchTransactions();

    // Filter event listeners
    document.getElementById('filter-day').addEventListener('click', () => fetchTransactions('day'));
    document.getElementById('filter-week').addEventListener('click', () => fetchTransactions('week'));
    document.getElementById('filter-month').addEventListener('click', () => fetchTransactions('month'));
    document.getElementById('filter-all').addEventListener('click', () => fetchTransactions('all'));
});
