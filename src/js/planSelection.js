// Assuming userId is retrieved from the session or local storage after login
const userId = sessionStorage.getItem('userId'); // Adjust this line based on how you're storing user ID

if (!userId) {
    // Handle case where user is not logged in
    alert("You must be logged in to select a meal plan.");
    window.location.href = '/public/login.html'; // Redirect to login page if not logged in
}

function selectPlan(plan) {
    // Prepare the data to be sent to the server
    const data = {
        userId: userId,
        plan: plan
    };

    fetch('/select-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        const messageDiv = document.getElementById('message');
        if (data.success) {
            messageDiv.innerText = `You have successfully selected the ${plan === 'thrice-daily' ? 'Thrice-Daily' : 'Twice-Daily'} Plan.`;
        } else {
            messageDiv.innerText = 'Error selecting plan. Please try again.';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('message').innerText = 'There was an error processing your request.';
    });
}
