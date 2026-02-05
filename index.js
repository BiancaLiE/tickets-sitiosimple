import express from "express";
import { MongoClient } from "mongodb";

// -----------------------------
// MongoDB
// -----------------------------
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

let db;
let ticketsCollection;

async function connectDB() {
  await client.connect();
  db = client.db("ticketsDB");
  ticketsCollection = db.collection("tickets");
  console.log("✅ Conectado a MongoDB");
}

connectDB();

// -----------------------------
// App
// -----------------------------
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// -----------------------------
// Health check
// -----------------------------
app.get("/", (req, res) => {
  res.send("Servidor funcionando OK");
});

// -----------------------------
// Webhook SitioSimple
// -----------------------------
app.post("/webhook", async (req, res) => {
  try {
    const pedido = req.body;

    const ticket = {
      pedidoId: pedido.id,
      fecha: pedido.fechaEsOrden || new Date(),
      cliente: {
        email: pedido?.cliente?.email || "",
        telefono: pedido?.direccionEnvio?.telefono || "",
        direccion: pedido?.direccionEnvio?.direccion || ""
      },
      productos: pedido.detalle
        ?.filter(item => item.tipo === "PRO")
        .map(item => ({
          descripcion: item.descripcion,
          cantidad: Number(item.cantidad),
          precio: Number(item.precio)
        })) || [],
      total: Number(pedido.detallePrecios?.[0]?.total || 0),
      estado: "pendiente",
      createdAt: new Date()
    };

    await ticketsCollection.insertOne(ticket);

    console.log("🧾 TICKET GUARDADO EN MONGODB");
    console.log(ticket);

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook", error);
    res.sendStatus(500);
  }
});

// -----------------------------
// Ver todos los tickets
// -----------------------------
app.get("/tickets", async (req, res) => {
  const tickets = await ticketsCollection
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  res.json(tickets);
});

// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
