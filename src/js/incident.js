document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('incidentReportForm').addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        // Collect form data
        const type = document.getElementById('incidentType').value;
        const building_name = document.getElementById('buildingName').value;
        const description = document.getElementById('description').value;
        const photo = document.getElementById('incidentImage').files[0]; // Get the file

        // Create a FormData object
        // const formData = new FormData();
        // formData.append('description', 'fire hazard');
        // formData.append('building_name', 'Wits University Jubilee Hall');
        // formData.append('type', 'fire');
        const formData = new FormData();
        formData.append('description', description);
        formData.append('building_name', building_name);
        formData.append('type', type);
        
        // Check if a photo is selected; if not, append null
        if (photo) {
            formData.append('photo', photo); // Append the image file
        } else {
            // Append a null value to indicate no photo was uploaded
            formData.append('photo', null);
        }

        // Send the POST request to the API
        fetch('https://campussafetyapp.azurewebsites.net/incidents/report-incidents-external', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (response.status === 401) {
                // Redirect to login page if user is not authorized
                window.location.href = "/login";
                throw new Error("Unauthorized access. Redirecting to login...");
            } else if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Parse the JSON response
        })
        .then(data => {
            console.log('Incident reported successfully:', data);
            // Display success message
            const successMessage = document.getElementById('successMessage');
            successMessage.style.display = 'block';
            // Clear the form fields
            document.getElementById('incidentReportForm').reset();
        })
        .catch(error => {
            console.error('Error reporting incident:', error);
        });
    });
});

function goBack() {
    window.location.href = '../../userDashboard.html'; // Replace with the actual page you want to go back to
}
