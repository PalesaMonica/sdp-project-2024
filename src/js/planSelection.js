// Fetch user data from the server
fetch('/get-userid')
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login'; // Redirect to login if not authenticated
            throw new Error('Unauthorized access.');
        }
        return response.json();
    })
    .then(data => {
        const userId = data.userId; // Extract userId from the response

        if (!userId) {
            alert("You must be logged in to select a meal plan.");
            window.location.href = '/login'; // Redirect to login page if not logged in
        } else {
            // Define the selectPlan function here
            window.selectPlan = function(plan) {
                const requestData = {
                    userId: userId,
                    plan: plan
                };

                fetch('/select-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                })
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        throw new Error('Unauthorized access. Redirecting to login...');
                    }
                    if (!response.ok) {
                        throw new Error('Server error occurred.');
                    }
                    return response.json();
                })
                .then(data => {
                    const messageDiv = document.getElementById('message');
                    if (data.success) {
                        messageDiv.innerText = `You have successfully selected the ${plan === 'thrice-daily' ? 'Thrice-Daily' : 'Twice-Daily'} Plan.`;
                    } else {
                        messageDiv.innerText = data.error || 'Error selecting plan. Please try again.';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('message').innerText = 'There was an error processing your request.';
                });
            };
        }
    })
    .catch(error => console.error('Error fetching user data:', error));
