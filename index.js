const express = require("express");
const app = express();

// Capturar TODO sin importar formato
app.use((req, res, next) => {
  console.log("================================");
  console.log("📥 REQUEST RECIBIDO");
  console.log("Método:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("Headers:", req.headers);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Servidor funcionando OK 🚀");
});

// Capturar webhook en CUALQUIER método
app.all("/webhook", (req, res) => {
  console.log("🔥 WEBHOOK DISPARADO 🔥");
  console.log("Body:", req.body);
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor listo en puerto", PORT);
});
