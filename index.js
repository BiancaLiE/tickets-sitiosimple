import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para leer JSON
app.use(express.json());

// -----------------------------
// Health check (Render / navegador)
// -----------------------------
app.get("/", (req, res) => {
  res.send("Servidor funcionando OK");
});

// -----------------------------
// Webhook SitioSimple
// -----------------------------
app.post("/webhook", (req, res) => {
  console.log("🔥 WEBHOOK DE PEDIDO RECIBIDO 🔥");
  console.log(JSON.stringify(req.body, null, 2));

  /**
   * Acá SitioSimple envía el pedido
   * apenas el cliente lo crea
   * (NO cuando se paga)
   */

  // Responder SIEMPRE 200
  res.sendStatus(200);
});

// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
