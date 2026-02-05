const express = require("express");
const PDFDocument = require("pdfkit");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor funcionando OK 🚀");
});

app.post("/webhook", (req, res) => {
  const order = req.body;

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=ticket.pdf");

  doc.pipe(res);

  doc.fontSize(20).text("TICKET DE PEDIDO", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Pedido Nº: ${order.id || "Sin número"}`);
  doc.text(`Cliente: ${order.cliente || "Sin nombre"}`);
  doc.moveDown();

  doc.text("Detalle:");
  (order.items || []).forEach(item => {
    doc.text(`- ${item.nombre} x ${item.cantidad}`);
  });

  doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor listo en puerto", PORT);
});

