import express from "express";
import { MongoClient } from "mongodb";

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------
// MongoDB
// -----------------------------
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

let ticketsCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("ticketsDB");
  ticketsCollection = db.collection("tickets");
  console.log("✅ Conectado a MongoDB");
}

connectDB();

// -----------------------------
// Middlewares
// -----------------------------
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
  console.log("📩 WEBHOOK RECIBIDO");
  console.log("Keys:", Object.keys(req.body));
  console.log(JSON.stringify(req.body, null, 2));
  
  try {
    const pedido = req.body;

    const ticket = {
      pedidoId: pedido.id,
      fecha: pedido.fechaEsOrden || new Date(),

      cliente: {
        nombre: pedido?.cliente?.nombre || "",
        apellido: pedido?.cliente?.apellido || "",
        email: pedido?.cliente?.email || "",
        telefono: pedido?.direccionEnvio?.telefono || ""
      },
      
      envio: {
        direccion: pedido?.direccionEnvio?.direccion || "",
        codigoPostal: pedido?.direccionEnvio?.codigoPostal || "",
        ciudad: pedido?.direccionEnvio?.ciudad || "",
        provincia: pedido?.direccionEnvio?.provincia || "",
        pais: pedido?.direccionEnvio?.pais || ""
      },

      productos: Array.isArray(pedido.detalle)
        ? pedido.detalle
          .filter(item => item.tipo === "PRO")
          .map(item => ({
            descripcion: item.descripcion,
            cantidad: Number(item.cantidad),
            precio: Number(item.precio)
          }))
      : [],

      total: Number(pedido.detallePrecios?.[0]?.total || 0),
      estado: "pendiente",
      creadoEn: new Date()
    };

    await ticketsCollection.insertOne(ticket);

    console.log("🧾 Ticket guardado en MongoDB");
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error guardando ticket:", error);
    res.sendStatus(500);
  }
});

// -----------------------------
// Ver todos los tickets
// -----------------------------
app.get("/tickets", async (req, res) => {
  const tickets = await ticketsCollection
    .find({})
    .sort({ creadoEn: -1 })
    .toArray();

  res.json(tickets);
});

// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});





