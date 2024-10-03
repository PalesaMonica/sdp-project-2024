// Get the diet plan from the URL parameter
const urlParams = new URLSearchParams(window.location.search);
const dietPlan = urlParams.get('diet') || 'Diet Plan';

// Update the text to reflect the selected diet plan
document.getElementById('dietPlan').textContent = dietPlan;

function confirmSelection() {
    fetch('/saveDietPreference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dietPlan })
    })
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
    .then(data => {
        alert(`Your ${dietPlan} diet plan has been confirmed!`);
        window.location.href = 'menu.html';
    })
    .catch(error => console.error('Error:', error));
}
