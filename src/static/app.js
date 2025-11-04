document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: get initials from an email or name
  function getInitials(text) {
    const local = (text || "").split("@")[0] || "";
    const parts = local.split(/[\._\-]/).filter(Boolean);
    if (parts.length === 0) return (local.charAt(0) || "?").toUpperCase();
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase().slice(0,2);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message / previous list
      activitiesList.innerHTML = "";

      // Reset select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Build participants block
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = "Registered Participants";
        participantsDiv.appendChild(participantsHeader);

        const participantsListEl = document.createElement("ul");

        if (!details.participants || details.participants.length === 0) {
          const li = document.createElement("li");
          li.className = "no-participants";
          li.textContent = "No registered participants yet.";
          participantsListEl.appendChild(li);
        } else {
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const avatar = document.createElement("span");
            avatar.className = "avatar";
            avatar.textContent = getInitials(p);

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = p;

            const deleteIcon = document.createElement('span');
            deleteIcon.className = 'delete-icon';
            deleteIcon.textContent = '🗑️';
            deleteIcon.style.cursor = 'pointer';
            deleteIcon.addEventListener('click', async () => {
              const success = await unregisterParticipant(p);
              if (success) {
                // Check if this was the last participant
                const participantsList = li.parentElement;
                li.remove();
                if (participantsList.children.length === 0) {
                  const noParticipantsLi = document.createElement("li");
                  noParticipantsLi.className = "no-participants";
                  noParticipantsLi.textContent = "No registered participants yet.";
                  participantsList.appendChild(noParticipantsLi);
                }
              }
            });

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            li.appendChild(deleteIcon);
            participantsListEl.appendChild(li);
          });
        }

        participantsDiv.appendChild(participantsListEl);
        activityCard.appendChild(participantsDiv);
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
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities to show the newly registered participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Function to unregister a participant
  async function unregisterParticipant(email) {
    try {
      // Find the activity this participant belongs to
      const activityCard = Array.from(document.querySelectorAll('.activity-card')).find(card => 
        Array.from(card.querySelectorAll('.participant-name')).some(span => span.textContent === email)
      );
      
      const activityName = activityCard?.querySelector('h4')?.textContent;

      if (!activityName) {
        console.error('Could not find activity for participant:', email);
        return false;
      }

      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = "Successfully unregistered from activity";
        messageDiv.className = "message success";
        return true;
      } else {
        messageDiv.textContent = result.detail || "An error occurred while unregistering";
        messageDiv.className = "message error";
        // Refresh the activities list to ensure UI is in sync with server
        fetchActivities();
        return false;
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
      // Refresh the activities list to ensure UI is in sync with server
      fetchActivities();
      return false;
    }
  }

  // Initialize app
  fetchActivities();
});
