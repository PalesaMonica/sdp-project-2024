document.addEventListener('DOMContentLoaded', () => {
    function fetchTransactions(filter = 'all') {
        fetch(`http://localhost:3000/api/transactions?filter=${filter}`)
            .then(response => response.json())
            .then(data => {
                const transactionList = document.getElementById('transaction-list');
                const transactions = data.transactions || [];
                transactionList.innerHTML = transactions.map(transaction => `
                    <tr>
                        <td>${new Date(transaction.date).toLocaleDateString()}</td>
                        <td>R${transaction.amount.toFixed(2)}</td>
                        <td>${transaction.description}</td>
                    </tr>
                `).join('');
            })
            .catch(error => {
                console.error('Error fetching transaction data:', error);
            });
    }

    // Fetch initial transactions with no filter (all)
    fetchTransactions();

    // Event listeners for filtering transactions
    document.getElementById('filter-day')?.addEventListener('click', () => fetchTransactions('day'));
    document.getElementById('filter-week')?.addEventListener('click', () => fetchTransactions('week'));
    document.getElementById('filter-month')?.addEventListener('click', () => fetchTransactions('month'));
    document.getElementById('filter-all')?.addEventListener('click', () => fetchTransactions('all'));
});

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function filterTransactions(transactions, period) {
    const today = new Date();
    let startDate = new Date(today);

    switch (period) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(today.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate.setMonth(today.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= today;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function formatAmount(amount) {
    const absAmount = Math.abs(amount).toFixed(2);
    return amount >= 0 ? `+R${absAmount}` : `-R${absAmount}`;
}

function createTransactionHTML(transaction) {
    return `
        <div class="transaction">
            <div class="transaction-details">
                <strong>${transaction.description}</strong>
                <small>${formatDate(transaction.date)}</small>
            </div>
            <div>
                <span class="transaction-amount ${transaction.amount >= 0 ? 'positive' : ''}">
                    ${formatAmount(transaction.amount)}
                </span>
            </div>
        </div>
    `;
}

function renderTransactions(transactions, period) {
    const filteredTransactions = filterTransactions(transactions, period);
    if (filteredTransactions.length === 0) {
        return '<div>No transactions found for this period.</div>';
    }

    let html = '';
    let currentDate = '';
    filteredTransactions.forEach(transaction => {
        if (transaction.date !== currentDate) {
            currentDate = transaction.date;
            html += `<div class="date-header">${formatDate(currentDate)}</div>`;
        }
        html += createTransactionHTML(transaction);
    });

    return html;
}

// Client-side rendering for transactions with filtering
if (typeof window !== 'undefined') {
    window.onload = () => {
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = renderTransactions('all');

        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                transactionsList.innerHTML = renderTransactions(tab.dataset.period);
            });
        });
    };
}
