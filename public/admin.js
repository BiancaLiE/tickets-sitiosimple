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

  await fetch(`/tickets/${ticketSeleccionado.ticketNumero}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketSeleccionado)
  });

  alert("✅ Cambios guardados");
  cargarTickets();
}

// -----------------------------
// Generar PDF
// -----------------------------
function generarPDF() {
  if (!ticketSeleccionado) {
    alert("No hay ticket seleccionado");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;

  // ------------------------
  // Encabezado
  // ------------------------
  doc.setFontSize(16);
  doc.text("TICKET DE COMPRA", 105, y, { align: "center" });

  y += 10;
  doc.setFontSize(10);
  doc.text(`Orden Nº: ${ticketSeleccionado.pedidoId}`, 10, y);
  y += 6;

  const fecha = new Date(ticketSeleccionado.fecha).toLocaleString("es-AR");
  doc.text(`Fecha: ${fecha}`, 10, y);

  y += 10;

  // ------------------------
  // Cliente
  // ------------------------
  doc.setFontSize(12);
  doc.text("Datos del Cliente", 10, y);
  y += 6;

  doc.setFontSize(10);
  doc.text(
    `${ticketSeleccionado.cliente.nombre || ""} ${ticketSeleccionado.cliente.apellido || ""}`,
    10,
    y
  );
  y += 5;

  doc.text(`Email: ${ticketSeleccionado.cliente.email || ""}`, 10, y);
  y += 5;

  doc.text(`Tel: ${ticketSeleccionado.cliente.telefono || ""}`, 10, y);
  y += 5;

  doc.text(
    `Dirección: ${ticketSeleccionado.cliente.direccion || ""}`,
    10,
    y
  );
  y += 5;

  doc.text(
    `Ciudad: ${ticketSeleccionado.cliente.ciudad || ""} - ${ticketSeleccionado.cliente.provincia || ""}`,
    10,
    y
  );
  y += 10;

  // ------------------------
  // Productos
  // ------------------------
  doc.setFontSize(12);
  doc.text("Detalle de Productos", 10, y);
  y += 6;

  doc.setFontSize(10);

  ticketSeleccionado.productos.forEach((p) => {
    doc.text(
      `${p.cantidad} x ${p.descripcion}  $${p.precio}`,
      10,
      y
    );
    y += 5;
  });

  y += 5;

  // ------------------------
  // Total
  // ------------------------
  doc.setFontSize(12);
  doc.text(`TOTAL: $${ticketSeleccionado.total}`, 10, y);

  // ------------------------
  // Guardar
  // ------------------------
  doc.save(`Ticket_${ticketSeleccionado.pedidoId}.pdf`);
}

// -----------------------------
cargarTickets();
