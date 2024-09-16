function handleBoxClick(option) {
           
    switch(option) {
        case 'vegetarian':
            window.location.href = `confirmation.html?diet=${option}`;
        case 'glutenFree':
            window.location.href = `confirmation.html?diet=${option}`; 
            break;
        case 'halal':
            window.location.href = `confirmation.html?diet=${option}`; 
            break;
        case 'none':
            window.location.href = `confirmation.html?diet=${option}`; 
            break;
        default:
            console.log('Unknown option selected');
    }
}

function backToDash(){
    window.location.href = 'userDashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-username')
      .then(response => response.json())
      .then(data => {
        if (data.username) {
          document.getElementById('hello').textContent = `${data.username}!`;
        } else {
          console.error("Failed to load username.");
        }
      })
      .catch(error => console.error('Error fetching username:', error));


    // Fetch and display the current dietary plan
    fetch('/get-dietary_preference')
    .then(response => response.json())
    .then(data => {
        if (data.preference) {
            document.getElementById('current-diet-plan').textContent = data.preference;
        } else {
            document.getElementById('current-diet-plan').textContent = 'No plan selected';
        }
    })
    .catch(error => console.error('Error fetching dietary preference:', error));
  });
  