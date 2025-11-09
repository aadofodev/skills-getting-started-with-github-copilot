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
  const response = await fetch("/activities", { cache: "no-store" });
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

        // Populate participants list (no bullets) and add remove icon/button
        const list = activityCard.querySelector(".participants-list");
        const participants = details.participants || [];
        if (participants.length === 0) {
          const li = document.createElement("li");
          li.className = "empty";
          li.textContent = "No participants yet — be the first!";
          list.appendChild(li);
        } else {
          participants.forEach(email => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = email;

            const btn = document.createElement("button");
            btn.className = "remove-participant";
            btn.title = "Remove participant";
            // Trash emoji is simple and cross-platform; replace with SVG if desired
            btn.innerHTML = "🗑️";

            // Wire up click to call DELETE endpoint
            btn.addEventListener("click", async (ev) => {
              ev.preventDefault();
              // Confirm before removing (small safeguard)
              const ok = confirm(`Remove ${email} from ${name}?`);
              if (!ok) return;

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`,
                  { method: "DELETE", cache: "no-store" }
                );
                const result = await resp.json();
                if (resp.ok) {
                  // Refresh activities so UI updates
                  await fetchActivities();
                } else {
                  messageDiv.textContent = result.detail || result.message || "Failed to remove participant";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                }
              } catch (err) {
                console.error("Error removing participant:", err);
                messageDiv.textContent = "Failed to remove participant. Please try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 5000);
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            list.appendChild(li);
          });
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
          cache: "no-store",
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
