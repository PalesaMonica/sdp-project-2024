document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('feedback-form');
    let ratingValue = 0;

    // Star rating system event listener
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            ratingValue = this.getAttribute('data-value');
            document.getElementById('rating').value = ratingValue;

            // Highlight selected stars
            document.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
            for (let i = 1; i <= ratingValue; i++) {
                document.querySelector(`.star[data-value="${i}"]`).classList.add('selected');
            }
        });
    });

    // Handle form submission
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the default form submission

        const reviewText = document.getElementById('review-text').value;
        const rating = ratingValue;
        const diningHall = document.getElementById('dining_hall').value;
        const reviewType = document.getElementById('review_type').value;

        fetch('/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                review_text: reviewText,
                rating: rating,
                dining_hall: diningHall,
                review_type: reviewType
            })
        })
        .then(response => {
            if (response.status === 401) {
                // Redirect to login page if user is not authorized
                window.location.href = "/login";
                throw new Error("Unauthorized access. Redirecting to login...");
            } else if (response.ok) {
                document.getElementById('confirmation-message').textContent = 'Your review has been submitted successfully!';
                document.getElementById('confirmation-message').style.color = 'green';

                form.reset();
                document.querySelectorAll('.star').forEach(star => star.classList.remove('selected')); // Reset star highlight
            } else {
                return response.text().then(text => { throw new Error(text); });
            }
        })
        .catch(error => {
            document.getElementById('confirmation-message').textContent = 'There was an error submitting your review. Please try again.';
            document.getElementById('confirmation-message').style.color = 'red';
        });
    });
});

// Open the review modal
function openReviewModal() {
    document.getElementById('review-modal').style.display = 'flex';
}

// Close the review modal
function closeReviewModal() {
    document.getElementById('review-modal').style.display = 'none';
}

// Fetch and display reviews
function fetchReviews() {
    const ratingFilter = document.getElementById('review_filter').value;
    let url = '/feedback';
    
    if (ratingFilter !== 'all') {
        url += `?rating=${ratingFilter}`;
    }

    fetch(url)
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
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

// Close the modal if clicked outside
window.onclick = function(event) {
    const modal = document.getElementById('review-modal');
    if (event.target === modal) {
        closeReviewModal();
    }
}

// Go back function
function goBack() {
    window.location.href = '../../userDashboard.html'; // Replace with the actual page you want to go back to
}


/*function fetchReviews() {
    const ratingFilter = document.getElementById('review_filter').value;
    let url = '/feedback';
    
    if (ratingFilter !== 'all') {
        url += `?rating=${ratingFilter}`;
    }

    fetch(url)
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
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
}*/
// Open the review modal
