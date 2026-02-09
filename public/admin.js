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
    div.innerText = `#${t.id} - ${t.cliente?.email || "Cliente"} - $${t.total}`;
    div.onclick = () => mostrarDetalle(t);
    list.appendChild(div);
  });
}

// -----------------------------
// Mostrar detalle
// -----------------------------
function mostrarDetalle(ticket) {
  ticketSeleccionado = JSON.parse(JSON.stringify(ticket)); // copia segura

  let html = `
    <h4>Ticket #${ticketSeleccionado.ticketNumero}</h4>
    <p><b>Email:</b> ${ticketSeleccionado.cliente?.email || "-"}</p>
    <p><b>Teléfono:</b> ${ticketSeleccionado.cliente?.telefono || "-"}</p>
    <p><b>Dirección:</b> ${ticketSeleccionado.cliente?.direccion || "-"}</p>

    <table class="table table-bordered mt-3">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio</th>
        </tr>
      </thead>
      <tbody>
  `;

  ticketSeleccionado.productos.forEach((item, i) => {
    html += `
      <tr>
        <td>${item.descripcion}</td>
        <td>
          <input type="number" class="form-control"
            value="${item.cantidad}"
            data-i="${i}"
            data-tipo="cantidad">
        </td>
        <td>
          <input type="number" class="form-control"
            value="${item.precio}"
            data-i="${i}"
            data-tipo="precio">
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <button class="btn btn-primary me-2" onclick="guardarCambios()">
      Guardar cambios
    </button>

    <button class="btn btn-success" onclick="generarPDF()">
      Generar PDF
    </button>
  `;

  document.getElementById("ticketDetail").innerHTML = html;
}

// -----------------------------
// Guardar cambios
// -----------------------------
async function guardarCambios() {
  const inputs = document.querySelectorAll("input[data-i]");

  inputs.forEach(input => {
    const i = input.dataset.i;
    const tipo = input.dataset.tipo;
    ticketSeleccionado.productos[i][tipo] = Number(input.value);
  });

  // recalcular total
  ticketSeleccionado.total = ticketSeleccionado.productos.reduce(
    (sum, p) => sum + p.cantidad * p.precio,
    0
  );

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
  window.open(`/tickets/${ticketSeleccionado.ticketNumero}/pdf`, "_blank");
}

// -----------------------------
cargarTickets();
