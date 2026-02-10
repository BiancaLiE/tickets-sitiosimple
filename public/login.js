async function login() {
  const usuario = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 🔥 CLAVE
    body: JSON.stringify({ usuario, password })
  });

  const data = await res.json();

  if (data.ok) {
    window.location.href = "/admin.html";
  } else {
    document.getElementById("error").innerText =
      data.error || "Error al iniciar sesión";
  }
}
