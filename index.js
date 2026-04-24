import express from "express";
import { MongoClient } from "mongodb";
import session from "express-session";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// -----------------------------
// MongoDB
// -----------------------------
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

let ticketsCollectionEstrella;
let ticketsCollectionGalpon;

async function connectDB() {
  await client.connect();
  const db1 = client.db("ticketsDB");
  const db2 = client.db("ticketsDB_galpon");
  ticketsCollectionEstrella = db1.collection("tickets");
  ticketsCollectionGalpon = db2.collection("tickets");
  console.log("✅ Conectado a MongoDB (2 tiendas)");
}

// -----------------------------
// Middlewares
// -----------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(
  session({
    name: "tickets-session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 12 * 60 * 60 * 1000, // 12 horas
      httpOnly: true,
      secure: true,              // OBLIGATORIO en Render
      sameSite: "lax"            // OBLIGATORIO en Render
    }
  })
);

// LOGIN
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

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/me", (req, res) => {
  if (req.session.user) {
    res.json({
      logueado: true,
      usuario: req.session.user.usuario
    });
  } else {
    res.json({ logueado: false });
  }
});

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: "No autorizado" });
}

// -------------------
// PROTECCION DEL PANEL
// -------------------
app.get("/admin.html", (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login.html");
});

// -----------------------------
// Static files (AL FINAL)
// -----------------------------
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
  const token = req.query.token;
  let collection;
  if (token === process.env.TOKEN_ESTRELLA) {
    collection = ticketsCollectionEstrella;
  } else if (token === process.env.TOKEN_GALPON){
    collection = ticketsCollectionGalpon;
  } else {
    console.log("❌ Webhook no autorizado");
    return res.status(401).send("Unauthorized");
  }
  
  console.log("📩 WEBHOOK RECIBIDO");
  console.log("Keys:", Object.keys(req.body));
  
  try {
    const pedido = req.body;

    const ticket = {
      pedidoId: pedido.id,
      fecha: pedido.fechaEsOrden || new Date(),
      tienda: token === process.env.TOKEN_ESTRELLA ? "estrella" : "galpon",
      
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
      anticipo: 0,
      estado: "pendiente",
      creadoEn: new Date()
    };

    // 🔥 EVITAR DUPLICADOS POR WEBHOOK
    const existe = await collection.findOne({ pedidoId: pedido.id });

    if (existe) {
      console.log("⚠️ Ticket duplicado (webhook), no se guarda");
      return res.sendStatus(200);
    }
    await collection.insertOne(ticket);

    // -----------------------------
    // Limitar colección a 5000 tickets
    // -----------------------------
    const MAX_TICKETS = 5000;

    const total = await collection.countDocuments();

    if (total > MAX_TICKETS) {
      const exceso = total - MAX_TICKETS;
    
      const viejos = await collection
        .find({})
        .sort({ creadoEn: 1 })
        .limit(exceso)
        .toArray();

      const ids = viejos.map(t => t._id);

      await collection.deleteMany({
        _id: { $in: ids }
      });
      console.log(`🗑️ Eliminados ${exceso} tickets antiguos`);
    }

    console.log("🧾 Ticket guardado en MongoDB");
    res.sendStatus(200);
    
  } catch (error) {
    console.error("❌ Error guardando ticket:", error);
    res.sendStatus(500);
  }
});

// -----------------------------
// FALLBACK MANUAL (por si falla el webhook)
// -----------------------------
app.post("/manual-order", async (req, res) => {
  try {
    const pedido = req.body;
    console.log("🧾 DETALLE COMPLETO DEL PEDIDO:");
    console.log(JSON.stringify(pedido.detalle, null, 2));
    const tienda = req.body.tienda || "estrella";
    const collection =
      tienda === "galpon"
        ? ticketsCollectionGalpon
        : ticketsCollectionEstrella;

    // 🔥 EVITAR DUPLICADOS (CORRECTO)
    const existe = await collection.findOne({ pedidoId: pedido.id });

    if (existe) {
      console.log("⚠️ Ticket ya existe en esta tienda");
      return res.json({ ok: true, duplicado: true });
    }

    const ticket = {
      pedidoId: pedido.id,
      fecha: pedido.fechaEsOrden || new Date(),
      tienda: tienda,

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
      anticipo: 0,
      estado: "pendiente",
      creadoEn: new Date()
    };

    await collection.insertOne(ticket);

    console.log("🛠️ Ticket insertado manualmente");
    res.json({ ok: true });

  } catch (error) {
    console.error("❌ Error en fallback manual:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

// -----------------------------
// Ver todos los tickets
// -----------------------------
app.get("/tickets", requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search || "";
  const limit = 50;

  let filtro = {};

  if (search) {
    const regex = new RegExp("^" + search, "i");
    filtro = {
      $or: [
        { pedidoId: regex },
        { "cliente.nombre": regex },
        { "cliente.apellido": regex }
      ]
    };
  }

  // 🔥 TRAER TODO (sin skip ni limit)
  const ticketsEstrella = await ticketsCollectionEstrella
    .find(filtro)
    .toArray();

  const ticketsGalpon = await ticketsCollectionGalpon
    .find(filtro)
    .toArray();

  // 🔥 UNIR
  let todos = [...ticketsEstrella, ...ticketsGalpon];

  // 🔥 ORDENAR
  todos.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));

  // 🔥 TOTAL REAL
  const totalTickets = todos.length;

  // 🔥 PAGINACIÓN REAL
  const start = (page - 1) * limit;
  const paginados = todos.slice(start, start + limit);

  res.json({
    tickets: paginados,
    totalPages: Math.ceil(totalTickets / limit),
    currentPage: page
  });
});

// -----------------------------
// Actualizar ticket (editar desde el panel)
// -----------------------------
app.put("/tickets/:pedidoId", async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const ticket = req.body;

    const collection =
      ticket.tienda === "galpon"
        ? ticketsCollectionGalpon
        : ticketsCollectionEstrella;

    const result = await collection.updateOne(
      { pedidoId: String(pedidoId) },
      {
        $set: {
          productos: ticket.productos,
          total: ticket.total,
          anticipo: Number(ticket.anticipo) || 0,

          bultos: Number(ticket.bultos) || 0,            // 👈 NUEVO
          transportista: ticket.transportista || "",     // 👈 NUEVO
          dni: ticket.dni || "",                         // 👈 NUEVO
          envioSucursal: ticket.envioSucursal || false,  // 👈 NUEVO

          cliente: ticket.cliente,
          envio: ticket.envio,

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
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ Error conectando a MongoDB:", err);
    process.exit(1);
  });















































