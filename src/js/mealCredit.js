const transactions = [
    //Adding more recent dates from 01 September to 07 September
    { name: '4NMP Dining Hall', date: '2024-09-07', amount: -55.00, type: 'Lunch' },
    { name: 'Joyous Dining Hall', date: '2024-09-06', amount: -60.00, type: 'Breakfast' },
    { name: '4NMP Dining Hall', date: '2024-09-05', amount: -60.00, type: 'Supper' },
    { name: 'Monate Mpolaye Dining', date: '2024-09-04', amount: -55.00, type: 'Lunch' },
    { name: '4NMP Dining Hall', date: '2024-09-03', amount: 60.00, type: 'Cancellation' },
    { name: '4NMP Dining Hall', date: '2024-09-02', amount: -60.00, type: 'Supper' },
    { name: 'Joyous Dining Hall', date: '2024-09-01', amount: -55.00, type: 'Lunch' },    
//
    { name: '4NMP Dining Hall', date: '2024-08-20', amount: -55.00, type: 'Lunch' },
    { name: 'Joyous Dining Hall', date: '2024-08-20', amount: -60.00, type: 'Breakfast' },
    { name: '4NMP Dining Hall', date: '2024-08-19', amount: -60.00, type: 'Supper' },
    { name: 'Monate Mpolaye Dining', date: '2024-08-19', amount: -55.00, type: 'Lunch' },
    { name: '4NMP Dining Hall', date: '2024-08-19', amount: 60.00, type: 'Cancellation' },
    { name: '4NMP Dining Hall', date: '2024-08-18', amount: -60.00, type: 'Supper' },
    { name: 'Joyous Dining Hall', date: '2024-08-18', amount: -55.00, type: 'Lunch' },
    { name: 'Monate Mpolaye Dining', date: '2024-08-18', amount: -60.00, type: 'Breakfast' },
    { name: 'Joyous Dining Hall', date: '2024-08-17', amount: -60.00, type: 'Supper' }

];

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

function renderTransactions() {
    // Only show the last 4 transactions
    const recentTransactions = transactions.slice(0, 4);
    
    return recentTransactions.map(createTransactionHTML).join('');
}

function updateDOM(html) {
    if (typeof document !== 'undefined') {
        const transactionsList = document.getElementById('transactions-list');
        if (transactionsList) {
            transactionsList.innerHTML = html;
        }
    }
}

// Only run this if we're in a browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const initialHtml = renderTransactions();
    updateDOM(initialHtml);
}

module.exports = { renderTransactions, formatDate, createTransactionHTML, updateDOM };