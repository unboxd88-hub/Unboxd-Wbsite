// ===============================
// 1) Scroll animation (safe)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const services = document.querySelectorAll(".service");

  if (services.length) {
    window.addEventListener("scroll", () => {
      services.forEach((service) => {
        const position = service.getBoundingClientRect().top;
        const screenHeight = window.innerHeight;

        if (position < screenHeight - 100) {
          service.style.opacity = 1;
          service.style.transform = "translateY(0)";
        }
      });
    });
  }
});

// ===============================
// 2) AI request (returns { reply, action, version })
// ===============================
async function sendMessage(message) {
  const response = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  // If backend returns non-200, show the actual error
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend error ${response.status}: ${text}`);
  }

  return await response.json(); // { reply, action, version }
}

// ===============================
// 3) Chat UI logic (runs only if chat exists)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const CONTACT_PAGE = "contact.html";

  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  // ✅ If no chatbot on this page, do nothing (prevents errors on other pages)
  if (!chatMessages || !chatInput || !sendBtn) return;

  function addMsg(text, who) {
    const row = document.createElement("div");
    row.className = `msg ${who}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return row;
  }

  async function handleSend() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    addMsg(msg, "user");
    chatInput.value = "";
    sendBtn.disabled = true;

    const typingRow = addMsg("Typing...", "ai");

    try {
      const result = await sendMessage(msg);

      // ✅ Debug (shows you exactly what the server returned)
      console.log("AI RESULT:", result);

      typingRow.querySelector(".bubble").textContent = result.reply || "…";

      // ✅ Redirect if action says contact
      if (result.action === "contact") {
  // OPTIONAL: pass the user's last message as the booking reason
  const details = encodeURIComponent(msg);
  setTimeout(() => {
    window.location.href = `${CONTACT_PAGE}?booking=${details}`;
  }, 600);
}
    } catch (e) {
      typingRow.querySelector(".bubble").textContent =
        "Could not reach the AI server. Make sure node server.js is running.";
      console.error(e);
    } finally {
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  sendBtn.addEventListener("click", handleSend);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });

  console.log("✅ Chat is ready");
});
