document.addEventListener('DOMContentLoaded', () => {
    fetch('http://localhost:3000/api/current-user')
        .then(response => response.json())
        .then(data => {
            const userId = data.userId;
            if (!userId) {
                console.error('No userId found');
                return;
            }

            const transactionList = document.getElementById('transaction-list');

            fetch(`http://localhost:3000/api/meal-credits/${userId}`)
                .then(response => response.json())
                .then(data => {
                    const transactions = data.transactions;
                    transactionList.innerHTML = transactions.map(transaction => `
                        <tr>
                            <td>${new Date(transaction.date).toLocaleDateString()}</td>
                            <td>${transaction.amount}</td>
                            <td>${transaction.description}</td>
                        </tr>
                    `).join('');
                })
                .catch(error => {
                    console.error('Error fetching transaction data:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
        });
});


function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function filterTransactions(period) {
    const today = new Date();
    let startDate = new Date(today);

    switch(period) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(today.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate.setMonth(today.getMonth() - 1);
            startDate.setDate(today.getDate());
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    return transactions
        .filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= startDate && transactionDate <= today;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function formatAmount(amount) {
    const absAmount = Math.abs(amount).toFixed(2);
    return amount >= 0 ? `+R${absAmount}` : `-R${absAmount}`;
}

function createTransactionHTML(transaction) {
    return `
        <div class="transaction">
            <div class="transaction-details">
                <strong>${transaction.name}</strong>
                <small>${transaction.type}</small>
            </div>
            <div>
                <span class="transaction-amount ${transaction.amount >= 0 ? 'positive' : ''}">
                    ${formatAmount(transaction.amount)}
                </span>
            </div>
        </div>
    `;
}

function renderTransactions(period) {
    const filteredTransactions = filterTransactions(period);
    
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

// If running in a browser environment
if (typeof window !== 'undefined') {
    window.onload = () => {
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = renderTransactions('day');

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

module.exports = { renderTransactions, filterTransactions, formatAmount, formatDate, createTransactionHTML };