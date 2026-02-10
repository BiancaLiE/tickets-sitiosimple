let tickets = [];
let ticketSeleccionado = null;

// -----------------------------
// Cargar tickets
// -----------------------------
async function cargarTickets() {
  const res = await fetch("/tickets");
  tickets = await res.json();

  const list = document.getElementById("ticketsList");
  list.innerHTML = "";

  tickets.forEach(t => {
    const div = document.createElement("div");
    div.className = "ticket border p-2 mb-2 rounded";
    div.style.cursor = "pointer";
    div.innerText = `#${t.pedidoId} - ${t.cliente?.nombre || ""} ${t.cliente?.apellido || ""} - $${t.total}`;
    div.onclick = () => mostrarDetalle(t);
    list.appendChild(div);
  });
}

// -----------------------------
// Mostrar detalle
// -----------------------------
function mostrarDetalle(ticket) {
  // Copia profunda para editar sin romper el original
  ticketSeleccionado = JSON.parse(JSON.stringify(ticket));

  let html = `
  <h4 class="mb-3">Ticket #${ticketSeleccionado.pedidoId}</h4>
  <p class="text-muted">
    Fecha de la orden: 
      <b>${new Date(ticketSeleccionado.fecha).toLocaleString("es-AR")}</b>
  </p>

  <div class="row mb-3">
    <div class="col-md-6">
      <p><b>Cliente:</b> ${ticketSeleccionado.cliente?.nombre || ""} ${ticketSeleccionado.cliente?.apellido || ""}</p>
      <p><b>Email:</b> ${ticketSeleccionado.cliente?.email || "-"}</p>
      <p><b>Teléfono:</b> ${ticketSeleccionado.cliente?.telefono || "-"}</p>
    </div>

    <div class="col-md-6">
      <p><b>Dirección:</b> ${ticketSeleccionado.envio?.direccion || "-"}</p>
      <p><b>Código Postal:</b> ${ticketSeleccionado.envio?.codigoPostal || "-"}</p>
      <p><b>Ciudad:</b> ${ticketSeleccionado.envio?.ciudad || "-"}</p>
      <p><b>Provincia:</b> ${ticketSeleccionado.envio?.provincia || "-"}</p>
    </div>
  </div>

    <table class="table table-bordered mt-3">
      <thead class="table-dark">
        <tr>
          <th>Producto</th>
          <th style="width:120px">Cantidad</th>
          <th style="width:150px">Precio</th>
          <th style="width:80px"></th>
        </tr>
      </thead>
      <tbody id="productosBody">
  `;

  ticketSeleccionado.productos.forEach((item, i) => {
    html += filaProductoHTML(item, i);
  });

  html += `
      </tbody>
    </table>

    <button class="btn btn-outline-secondary mb-3" onclick="agregarProducto()">
      ➕ Agregar producto
    </button>

    <h5>Total: $<span id="totalTicket">${calcularTotal()}</span></h5>

    <div class="mt-3">
      <button class="btn btn-primary me-2" onclick="guardarCambios()">
        💾 Guardar cambios
      </button>

      <button class="btn btn-success" onclick="generarPDF()">
        📄 Generar PDF
      </button>
    </div>
  `;

  document.getElementById("ticketDetail").innerHTML = html;
}

// -----------------------------
// HTML de una fila de producto
// -----------------------------
function filaProductoHTML(item, i) {
  return `
    <tr>
      <td>
        <input type="text" class="form-control"
          value="${item.descripcion}"
          data-i="${i}"
          data-tipo="descripcion"
          oninput="actualizarCampo(this)">
      </td>
      <td>
        <input type="number" class="form-control"
          value="${item.cantidad}"
          data-i="${i}"
          data-tipo="cantidad"
          oninput="actualizarCampo(this)">
      </td>
      <td>
        <input type="number" class="form-control"
          value="${item.precio}"
          data-i="${i}"
          data-tipo="precio"
          oninput="actualizarCampo(this)">
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${i})">
          ✖
        </button>
      </td>
    </tr>
  `;
}

// -----------------------------
// Actualizar campo en vivo
// -----------------------------
function actualizarCampo(input) {
  const i = input.dataset.i;
  const tipo = input.dataset.tipo;

  ticketSeleccionado.productos[i][tipo] =
    tipo === "descripcion" ? input.value : Number(input.value);

  document.getElementById("totalTicket").innerText = calcularTotal();
}

// -----------------------------
// Agregar producto
// -----------------------------
function agregarProducto() {
  ticketSeleccionado.productos.push({
    descripcion: "",
    cantidad: 1,
    precio: 0
  });

  const body = document.getElementById("productosBody");
  const i = ticketSeleccionado.productos.length - 1;
  body.insertAdjacentHTML("beforeend", filaProductoHTML(ticketSeleccionado.productos[i], i));

  document.getElementById("totalTicket").innerText = calcularTotal();
}

// -----------------------------
// Eliminar producto
// -----------------------------
function eliminarProducto(index) {
  ticketSeleccionado.productos.splice(index, 1);
  mostrarDetalle(ticketSeleccionado);
}

// -----------------------------
// Calcular total
// -----------------------------
function calcularTotal() {
  return ticketSeleccionado.productos.reduce(
    (sum, p) => sum + p.cantidad * p.precio,
    0
  );
}

// -----------------------------
// Guardar cambios
// -----------------------------
async function guardarCambios() {
  ticketSeleccionado.total = calcularTotal();

  const res = await fetch(`/tickets/${ticketSeleccionado.pedidoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketSeleccionado)
  });

  if (!res.ok) {
    alert("❌ Error al guardar los cambios");
    return;
  }

  alert("✅ Cambios guardados correctamente");
  cargarTickets();
}

// -----------------------------
// Generar PDF
// -----------------------------
function generarPDF() {
  if (!ticketSeleccionado) {
    alert("Seleccioná un ticket primero");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 15;

  // ---------------------------
  // ENCABEZADO
  // ---------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("COMPROBANTE DE PEDIDO", 105, y, { align: "center" });

  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Orden N°: ${ticketSeleccionado.pedidoId}`, 14, y);

  const fecha = new Date(ticketSeleccionado.fecha || ticketSeleccionado.creadoEn);
  doc.text(`Fecha: ${fecha.toLocaleDateString("es-AR")}`, 150, y);

  y += 6;
  doc.line(14, y, 196, y);
  y += 8;

  // ---------------------------
  // DATOS DEL CLIENTE
  // ---------------------------
  doc.setFont("helvetica", "bold");
  doc.text("Datos del cliente", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Nombre: ${ticketSeleccionado.cliente?.nombre || ""} ${ticketSeleccionado.cliente?.apellido || ""}`, 14, y);
  y += 5;
  doc.text(`Email: ${ticketSeleccionado.cliente?.email || "-"}`, 14, y);
  y += 5;
  doc.text(`Teléfono: ${ticketSeleccionado.cliente?.telefono || "-"}`, 14, y);
  y += 5;
  doc.text(`Dirección: ${ticketSeleccionado.envio?.direccion || "-"}`, 14, y);
  y += 5;
  doc.text(
    `CP: ${ticketSeleccionado.envio?.codigoPostal || "-"} - ${ticketSeleccionado.envio?.ciudad || ""}, ${ticketSeleccionado.envio?.provincia || ""}`,
    14,
    y
  );

  y += 8;
  doc.line(14, y, 196, y);
  y += 8;

  // ---------------------------
  // TABLA DE PRODUCTOS
  // ---------------------------
  doc.setFont("helvetica", "bold");
  doc.text("Detalle del pedido", 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.text("Producto", 14, y);
  doc.text("Cant.", 120, y);
  doc.text("Precio", 145, y);
  doc.text("Subtotal", 170, y);

  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont("helvetica", "normal");

  ticketSeleccionado.productos.forEach(p => {
    const subtotal = p.cantidad * p.precio;

    doc.text(p.descripcion, 14, y);
    doc.text(String(p.cantidad), 125, y, { align: "right" });
    doc.text(`$${p.precio.toFixed(2)}`, 155, y, { align: "right" });
    doc.text(`$${subtotal.toFixed(2)}`, 195, y, { align: "right" });

    y += 6;

    // Salto de página automático
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  y += 4;
  doc.line(14, y, 196, y);
  y += 8;

  // ---------------------------
  // TOTAL
  // ---------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`TOTAL: $${calcularTotal().toFixed(2)}`, 196, y, { align: "right" });

  // ---------------------------
  // PIE
  // ---------------------------
  y += 15;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Este documento no es una factura ni comprobante fiscal.",
    105,
    y,
    { align: "center" }
  );

  // ---------------------------
  // GUARDAR
  // ---------------------------
  doc.save(`Pedido_${ticketSeleccionado.pedidoId}.pdf`);
}

// -----------------------------
cargarTickets();
