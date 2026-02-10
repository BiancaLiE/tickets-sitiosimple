import express from "express";
import { MongoClient } from "mongodb";
import session from "express-session";

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
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false // Render usa https pero esto así funciona bien
    }
  })
);
app.post("/login", (req, res) => {
  const { usuario, password } = req.body;

  if (
    usuario === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.user = {
      usuario
    };

    return res.json({ ok: true });
  }

  res.status(401).json({ ok: false, error: "Credenciales inválidas" });
});
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
// Actualizar ticket (editar desde el panel)
// -----------------------------
app.put("/tickets/:pedidoId", async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const ticket = req.body;

    const result = await ticketsCollection.updateOne(
      { pedidoId: String(pedidoId) },
      {
        $set: {
          productos: ticket.productos,
          total: ticket.total,
          estado: ticket.estado || "pendiente",
          actualizadoEn: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("❌ Error actualizando ticket:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});











