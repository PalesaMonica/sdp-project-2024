function selectPlan(plan) {
    fetch('/selectPlan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedPlan: plan })
    })
    .then(response => response.json())
    .then(data => {
      if (data.msg) {
        document.getElementById('message').textContent = data.msg;
        setTimeout(() => {
          window.location.href = 'userDashboard.html';  // Redirect after confirming
        }, 2000);
      }
    })
    .catch(error => console.error('Error:', error));
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-meal-plan')
      .then(response => response.json())
      .then(data => {
        if (data.plan_name) {
          document.getElementById('message').textContent = `You have selected the ${data.plan_name} plan.`;
        } else {
          document.getElementById('message').textContent = 'No plan selected.';
        }
      })
      .catch(error => console.error('Error fetching meal plan:', error));
  });
  