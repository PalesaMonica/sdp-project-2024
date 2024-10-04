const diningHalls = {
    1: "Main",
    2: "Convocation",
    3: "Jubilee"
};

function fetchCredits() {
    fetch('/api/credits/remaining')
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
        .then(data => {
            const creditsElement = document.getElementById('credits-amount');
            creditsElement.innerText = `R${data.redits.toFixed(2)}`;
        })
        .catch(error => {
            console.error('Error fetching remaining credits:', error);
            document.getElementById('credits-amount').innerText = 'Error';
        });
}

function fetchCredits() {
    fetch('/api/credits/remaining')
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
        .then(data => {
            const creditsElement = document.getElementById('credits-amount');

            // Check if remaining_credits is present in the response data
            if (data && typeof data.remaining_credits !== 'undefined') {
                creditsElement.innerText = `R ${parseFloat(data.remaining_credits).toFixed(2)}`;
            } else {
                creditsElement.innerText = 'No credits available';
            }
        })
        .catch(error => {
            console.error('Error fetching remaining credits:', error);
            document.getElementById('credits-amount').innerText = 'Error fetching credits';
        });
}

// Fetch and display recent transactions
function fetchRecentTransactions() {
    fetch('/api/transactions/recent')
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
        .then(transactions => renderRecentTransactions(transactions))
        .catch(error => {
            console.error('Error fetching transactions:', error);
        });
}

// Render the recent transactions
function renderRecentTransactions(transactions) {
    const listElement = document.getElementById('transactions-list');
    listElement.innerHTML = '';

    transactions.forEach(transaction => {
        const transactionElement = document.createElement('div');
        transactionElement.classList.add('transaction');
        
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


fetchCredits();
fetchRecentTransactions();