import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static("public"));

// -----------------------------
// Almacenamiento en memoria
// -----------------------------
let tickets = [];
let contadorTickets = 1;

// -----------------------------
// Health check
// -----------------------------
app.get("/", (req, res) => {
  res.send("Servidor funcionando OK");
});

// -----------------------------
// Webhook SitioSimple
// -----------------------------
app.post("/webhook", (req, res) => {
  const pedido = req.body;

  // Crear ticket interno simplificado
  const ticket = {
    ticketNumero: contadorTickets++,
    pedidoId: pedido.id,
    fecha: pedido.fechaEsOrden,
    cliente: {
      email: pedido?.cliente?.email || "",
      telefono: pedido?.direccionEnvio?.telefono || "",
      direccion: pedido?.direccionEnvio?.direccion || ""
    },
    productos: pedido.detalle
      .filter(item => item.tipo === "PRO")
      .map(item => ({
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad),
        precio: Number(item.precio)
      })),
    total: Number(pedido.detallePrecios?.[0]?.total || 0),
    estado: "pendiente"
  };

  tickets.push(ticket);

  console.log("🧾 NUEVO TICKET CREADO");
  console.log(ticket);

  res.sendStatus(200);
});

// -----------------------------
// Ver todos los tickets
// -----------------------------
app.get("/tickets", (req, res) => {
  res.json(tickets);
});

// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});

