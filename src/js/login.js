async function handleLogin(event) {
    event.preventDefault();
  
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
  
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.msg);
      }
  
      // Redirect to User Dashboard page automatically
      window.location.href = "/userDashboard";
    } catch (error) {
      document.getElementById("error-message").textContent = error.message;
    }
  }
  
  module.exports = { handleLogin };
  