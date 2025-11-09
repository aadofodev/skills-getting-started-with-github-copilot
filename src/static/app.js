document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Minimal HTML escape to avoid injection
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message / existing cards
      activitiesList.innerHTML = "";

      // Reset select and keep placeholder
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build card HTML including participants section (bulleted list)
        activityCard.innerHTML = `
          <h4 class="activity-name">${escapeHtml(name)}</h4>
          <p class="activity-desc">${escapeHtml(details.description)}</p>
          <p class="meta"><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p class="meta"><strong>Availability:</strong> ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left</p>

          <div class="participants">
            <h5>Participants</h5>
            <ul class="participants-list"></ul>
          </div>
        `;

        // Populate participants list (bulleted)
        const list = activityCard.querySelector(".participants-list");
        (details.participants || []).forEach(email => {
          const li = document.createElement("li");
          li.textContent = email;
          list.appendChild(li);
        });
        if (!details.participants || details.participants.length === 0) {
          const li = document.createElement("li");
          li.className = "empty";
          li.textContent = "No participants yet — be the first!";
          list.appendChild(li);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so participants list updates immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
