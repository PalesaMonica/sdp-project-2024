const diningHalls = {
    1: "Main",
    2: "Convocation",
    3: "Jubilee"
};

function fetchTransactions(period) {
    fetch('/api/transactions')
        .then(response => response.json())
        .then(transactions => renderTransactions(transactions, period))
        .catch(error => console.error('Error fetching transactions:', error));
}

function renderTransactions(transactions, period) {
    const listElement = document.getElementById('transactions-list');
    listElement.innerHTML = '';

    const now = dayjs();
    const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = dayjs(transaction.date);
        if (period === 'day') return transactionDate.isSame(now, 'day');
        if (period === 'week') return transactionDate.isAfter(now.subtract(1, 'week'));
        if (period === 'month') return transactionDate.isAfter(now.subtract(1, 'month'));
    });

    filteredTransactions.forEach(transaction => {
        const transactionElement = document.createElement('div');
        transactionElement.classList.add('transaction');
        
        // Determine sign and color
        const sign = transaction.amount < 0 ? '+ ' : '- ';
        const colorClass = transaction.amount < 0 ? 'negative' : 'positive';
        
        transactionElement.innerHTML = `
        <div class="transaction-details">
            <p><strong>${diningHalls[transaction.dining_hall_id]}</strong> - ${transaction.meal_type}</p>
            <p>${dayjs(transaction.date).format('MMMM D, YYYY h:mm A')}</p>
            <p>${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}</p>
        </div>
        <div class="transaction-amount ${colorClass}">
            ${sign}R${Math.abs(transaction.amount).toFixed(2)}
        </div>
        `;
        
        listElement.appendChild(transactionElement);
    });
    }

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelector('.tab.active').classList.remove('active');
        e.target.classList.add('active');
        fetchTransactions(e.target.dataset.period);
    });
});

// Initial fetch for 'day' transactions
fetchTransactions('day');