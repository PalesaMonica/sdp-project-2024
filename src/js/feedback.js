document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('feedback-form');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the default form submission

        const reviewText = document.getElementById('review-text').value;
        const rating = document.getElementById('rating').value;

        fetch('/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ review_text: reviewText, rating: rating })
        })
        .then(response => {
            if (response.ok) {
                // Show success message
                document.getElementById('confirmation-message').textContent = 'Your review has been submitted successfully!';
                document.getElementById('confirmation-message').style.color = 'green';
                
                // Clear the form
                form.reset();
            } else {
                return response.text().then(text => { throw new Error(text); });
            }
        })
        .catch(error => {
            console.error('Error submitting feedback:', error);
            document.getElementById('confirmation-message').textContent = 'There was an error submitting your review. Please try again.';
            document.getElementById('confirmation-message').style.color = 'red';
        });
    });
});

function fetchReviews() {
    const ratingFilter = document.getElementById('review_filter').value;
    let url = '/feedback';
    
    if (ratingFilter !== 'all') {
        url += `?rating=${ratingFilter}`;
    }

    fetch(url)
    .then(response => response.json())
    .then(data => {
        const reviewsDiv = document.getElementById('reviews');
        reviewsDiv.innerHTML = ''; // Clear previous reviews
        data.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.innerHTML = `
                <h3>Rating: ${review.rating}</h3>
                <p>${review.review_text}</p>
                <small>Posted on: ${new Date(review.created_at).toLocaleString()}</small>
            `;
            reviewsDiv.appendChild(reviewElement);
        });
    })
    .catch(error => {
        console.error('Error fetching reviews:', error);
    });
}

function backToDash(){
    window.location.href = 'userDashboard.html';
}
