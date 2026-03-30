let tickets = [];
let ticketSeleccionado = null;

const btn = document.querySelector("button[onclick='recuperarTicket()']");
document.getElementById("tiendaSelect").addEventListener("change", (e) => {
  btn.disabled = !e.target.value;
});

document.getElementById("searchInput").addEventListener("input", () => {
  cargarTickets(1);
});

// -----------------------------
// Cargar tickets
// -----------------------------
let paginaActual = 1;
async function cargarTickets(page = 1) {
  paginaActual = page;
  const search = document.getElementById("searchInput")?.value || "";
  const list = document.getElementById("ticketsList");
  list.innerHTML = "<div class='text-center p-3'>Cargando...</div>";
  const res = await fetch(`/tickets?page=${page}&search=${encodeURIComponent(search)}`, {
    credentials: "include"
  });
  const data = await res.json();
  tickets = data.tickets;

  list.innerHTML = "";

  tickets.forEach(t => {
    const div = document.createElement("div");
    div.className = "ticket border p-2 mb-2 rounded";
    if (t.tienda === "estrella") {
      div.style.backgroundColor = "rgba(0, 255, 200, 0.15)";
    } else if (t.tienda === "galpon") {
      div.style.backgroundColor = "rgba(255, 165, 0, 0.15)";
    }
    div.style.cursor = "pointer";
    const badge = t.tienda === "galpon"
      ? `<span style="background-color:orange;color:white;padding:2px 6px;border-radius:6px;font-size:12px;margin-right:6px;">GALPÓN</span>`
      : `<span style="background-color:#00c8a0;color:white;padding:2px 6px;border-radius:6px;font-size:12px;margin-right:6px;">ESTRELLA</span>`;
    div.innerHTML = `${badge} #${t.pedidoId} - ${t.cliente?.nombre || ""} ${t.cliente?.apellido || ""} - $${t.total}`;
    div.onclick = () => mostrarDetalle(t);
    list.appendChild(div);
  });
  renderPagination(data.totalPages, data.currentPage);
}

function renderPagination(totalPages, currentPage) {

  const container = document.getElementById("pagination");
  container.innerHTML = "";

  if (totalPages <= 1) return;

  const maxVisible = 5;

  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  // BOTON ANTERIOR
  if (currentPage > 1) {

    const li = document.createElement("li");
    li.className = "page-item";

    const a = document.createElement("a");
    a.className = "page-link";
    a.innerHTML = "&laquo;";
    a.href = "#";

    a.onclick = (e) => {
      e.preventDefault();
      cargarTickets(currentPage - 1);
    };

    li.appendChild(a);
    container.appendChild(li);
  }

  // PAGINAS
  for (let i = start; i <= end; i++) {

    const li = document.createElement("li");
    li.className = "page-item " + (i === currentPage ? "active" : "");

    const a = document.createElement("a");
    a.className = "page-link";
    a.innerText = i;
    a.href = "#";

    a.onclick = (e) => {
      e.preventDefault();
      cargarTickets(i);
    };

    li.appendChild(a);
    container.appendChild(li);
  }

  // BOTON SIGUIENTE
  if (currentPage < totalPages) {

    const li = document.createElement("li");
    li.className = "page-item";

    const a = document.createElement("a");
    a.className = "page-link";
    a.innerHTML = "&raquo;";
    a.href = "#";

    a.onclick = (e) => {
      e.preventDefault();
      cargarTickets(currentPage + 1);
    };

    li.appendChild(a);
    container.appendChild(li);
  }
}

// --------------------------
// Recuperar Ticket Manualmente
// -------------------------
async function recuperarTicket() {
  const id = document.getElementById("fallbackId").value;
  const tienda = document.getElementById("tiendaSelect").value;
  if (!tienda) {
    alert("Seleccioná la tienda");
    return;
  }
  if (!id) {
    alert("Ingresá un ID");
    return;
  }

  try {
    const res = await fetch("/manual-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        id: id,
        tienda: tienda,
        fechaEsOrden: new Date(),
        cliente: {},
        direccionEnvio: {},
        detallePrecios: [{ total: 0 }]
      })
    });

    const data = await res.json();

    if (data.ok) {
      alert("✅ Ticket recuperado");
      cargarTickets(); // refresca lista
    } else {
      alert("❌ Error");
    }

  } catch (error) {
    console.error(error);
    alert("❌ Error de conexión");
  }
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
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Nombre:</strong></label>
        <input type="text" id="clienteNombre" class="form-control" value="${ticketSeleccionado.cliente?.nombre || ""}">
      </div>
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Apellido:</strong></label>
        <input type="text" id="clienteApellido" class="form-control" value="${ticketSeleccionado.cliente?.apellido || ""}">
      </div>
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Email:</strong></label>
        <input type="text" id="clienteEmail" class="form-control" value="${ticketSeleccionado.cliente?.email || ""}">
      </div>
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Teléfono:</strong></label>
        <input type="text" id="clienteTelefono" class="form-control" value="${ticketSeleccionado.cliente?.telefono || ""}">
      </div>
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>DNI:</strong></label>
        <input type="text" id="dniCliente" class="form-control" value="${ticketSeleccionado.dni || ""}">
      </div>
    </div>

    <div class="col-md-6">
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Dirección:</strong></label>
        <input type="text" id="direccionEnvio" class="form-control" value="${ticketSeleccionado.envio?.direccion || ""}">
      </div>
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Código Postal:</strong></label>
        <input type="text" id="cpEnvio" class="form-control" value="${ticketSeleccionado.envio?.codigoPostal || ""}">
      </div>
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Ciudad:</strong></label>
        <input type="text" id="ciudadEnvio" class="form-control" value="${ticketSeleccionado.envio?.ciudad || ""}">
      </div>
      <div class="input-group mb-2">
        <label class="input-group-text"><strong>Provincia:</strong></label>
        <input type="text" id="provinciaEnvio" class="form-control" value="${ticketSeleccionado.envio?.provincia || ""}">
      </div>
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

    <div class="row mb-3">
      <div class="col-md-6">
        <h5>Total: $<span id="totalTicket">${calcularTotal()}</span></h5>
        <div class="input-group" style="margin-top:15px;">
          <label class="input-group-text"><strong>Anticipo:</strong></label>
          <input type="number" id="anticipo" class="form-control" style="max-width:120px;" value="${ticketSeleccionado.anticipo || 0}" min="0" step="0.01">
        </div>
        <div style="margin-top:15px;">
          <strong>Total final: $<span id="totalFinal">0</span></strong>
        </div>
      </div>
      <div class="col-md-6">
        <div class="mt-2 input-group">
          <label class="input-group-text">Bultos:</label>
          <input id="bultosInput" type="number" class="form-control" style="max-width:80px;">
        </div>
        <div class="mt-2 input-group">
          <label class="input-group-text">Transportista:</label>
          <input id="transportistaInput" type="text" class="form-control" style="max-width:250px;">
        </div>
        <div class="mt-2 input-group">
          <label class="input-group-text">Envío a Sucursal:</label>
          <select id="envioSucursal" class="form-select" style:"max-width:80px;">
            <option value="false" ${ticket.envioSucursal ? "" : "selected"}>No</option>
            <option value="true" ${ticket.envioSucursal ? "selected" : ""}>Si</option>
          </select>
        </div>
      </div>
    </div>
   
    <div class="mt-3">
      <button class="btn btn-primary me-2" onclick="guardarCambios()">
        💾 Guardar cambios
      </button>

      <button class="btn btn-success" onclick="generarPDF()">
        📄 Generar PDF
      </button>
      <button class="btn btn-success" onclick="generarRemito()">
        📄 Generar Remito
      </button>
    </div>
  `;

  document.getElementById("ticketDetail").innerHTML = html;
  // 🔥 Activar listener del anticipo después de renderizar
  const anticipoInput = document.getElementById("anticipo");
  if (anticipoInput) {
      anticipoInput.addEventListener("input", calcularTotal);
  }
  // Traer Cantidad de Bultos y Transportista
  document.getElementById("bultosInput").value = ticket.bultos || "";
  document.getElementById("transportistaInput").value = ticket.transportista || "";

// Calcular total inicial
calcularTotal();

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
  const total = ticketSeleccionado.productos.reduce(
    (sum, p) => sum + p.cantidad * p.precio,
    0
  );

  const anticipoInput = document.getElementById("anticipo");
  const anticipo = anticipoInput
    ? parseFloat(anticipoInput.value) || 0
    : 0;

  const totalFinal = Math.max(total - anticipo, 0);

  const totalElement = document.getElementById("total");
  const totalFinalElement = document.getElementById("totalFinal");

  if (totalElement) totalElement.innerText = total;
  if (totalFinalElement) totalFinalElement.innerText = totalFinal;

  return total; // 🔥 IMPORTANTE: devolvemos el total como antes
}

// -----------------------------
// Guardar cambios
// -----------------------------
async function guardarCambios() {

  ticketSeleccionado.cliente.nombre = document.getElementById("clienteNombre").value;
  ticketSeleccionado.cliente.apellido = document.getElementById("clienteApellido").value;
  ticketSeleccionado.cliente.email = document.getElementById("clienteEmail").value;
  ticketSeleccionado.cliente.telefono = document.getElementById("clienteTelefono").value;
  ticketSeleccionado.envio.direccion = document.getElementById("direccionEnvio").value;
  ticketSeleccionado.envio.codigoPostal = document.getElementById("cpEnvio").value;
  ticketSeleccionado.envio.ciudad = document.getElementById("ciudadEnvio").value;
  ticketSeleccionado.envio.provincia = document.getElementById("provinciaEnvio").value;

  const anticipoInput = document.getElementById("anticipo");
  const bultosInput = document.getElementById("bultosInput");
  const transportistaInput = document.getElementById("transportistaInput");
  const dniInput = document.getElementById("dniCliente");
  const envioSucursalInput = document.getElementById("envioSucursal");

  const anticipo = anticipoInput
    ? parseFloat(anticipoInput.value) || 0
    : 0;

  const bultos = bultosInput
    ? parseInt(bultosInput.value) || 0
    : 0;

  const transportista = transportistaInput
    ? transportistaInput.value || ""
    : "";

  const dni = dniInput
    ? dniInput.value 
    : "";

  const envioSucursal = envioSucursalInput
    ? envioSucursalInput.value === "true"
    : false;

  ticketSeleccionado.total = calcularTotal();
  ticketSeleccionado.anticipo = anticipo;
  ticketSeleccionado.bultos = bultos;                // 👈 NUEVO
  ticketSeleccionado.transportista = transportista;  // 👈 NUEVO
  ticketSeleccionado.dni = dni;
  ticketSeleccionado.envioSucursal = envioSucursal;

  const res = await fetch(`/tickets/${ticketSeleccionado.pedidoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(ticketSeleccionado)
  });

  if (!res.ok) {
    alert("❌ Error al guardar los cambios");
    return;
  }

  alert("✅ Cambios guardados correctamente");
  cargarTickets();
}

// -----------------
// Cerrar Sesion
// -----------------------
async function logout() {
  await fetch("/logout", {
    method: "POST",
    credentials: "include"
  });

  window.location.href = "/login.html";
}

// -----------------------------
// Generar PDF
// -----------------------------
function generarPDF() {
  function checkPageBreak(doc, y, espacioNecesario) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + espacioNecesario > pageHeight - 15) {
      doc.addPage();
      return 20; // margen superior nueva página
    }
    return y;
  }
  
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
  
  // 🔥 Nombre de la tienda dinámico
  const nombreTienda =
    ticketSeleccionado.tienda === "galpon"
      ? "EL GALPON DE ONCE"
      : "LA ESTRELLA DE BELEN";
  
  doc.setFont("helvetica", "bold");
  // 🔥 Nombre tienda
  doc.setFontSize(18);
  doc.text(nombreTienda, 105, y, { align: "center" });
  y += 6;
  // 🔥 Título principal
  doc.setFontSize(11);
  doc.text("COMPROBANTE DE PEDIDO", 105, y, { align: "center" });

  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Orden N°: ${ticketSeleccionado.pedidoId}`, 14, y);

  const fecha = new Date(ticketSeleccionado.fecha || ticketSeleccionado.creadoEn);
  doc.text(`Fecha: ${fecha.toLocaleDateString("es-AR")}`, 150, y);

  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  // ---------------------------
  // DATOS DEL CLIENTE
  // ---------------------------
  doc.setFont("helvetica", "bold");
  doc.text("Datos del cliente", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${ticketSeleccionado.cliente?.nombre || ""} ${ticketSeleccionado.cliente?.apellido || ""}`, 14, y);
  y += 5;
  doc.text(
    `CP: ${ticketSeleccionado.envio?.codigoPostal || "-"} - ${ticketSeleccionado.envio?.ciudad || ""}, ${ticketSeleccionado.envio?.provincia || ""}`,
    14,
    y
  );

  y += 4;
  doc.line(14, y, 196, y);
  y += 4;

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
  const descripcionMaxWidth = 90;
  const descripcionLineas = doc.splitTextToSize(
    p.descripcion,
    descripcionMaxWidth
  );

  const alturaProducto = descripcionLineas.length * 6;

  // 🔥 1️⃣ Verificamos ANTES de dibujar
  y = checkPageBreak(doc, y, alturaProducto);

  // 🔥 2️⃣ Dibujamos descripción
  doc.text(descripcionLineas, 14, y);

  // 🔥 3️⃣ Dibujamos columnas
  doc.text(p.cantidad.toString(), 125, y, { align: "right" });
  doc.text(
    `$${p.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
    150,
    y,
    { align: "right" }
  );
  doc.text(
    `$${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
    196,
    y,
    { align: "right" }
  );

  // 🔥 4️⃣ Ahora sí bajamos la Y
  y += alturaProducto;
});
  
  y += 2;
  doc.line(14, y, 196, y);
  y += 5;

  // ---------------------------
  // CÁLCULO TOTAL + ANTICIPO
  // ---------------------------
  const total = calcularTotal();

  const anticipoInput = document.getElementById("anticipo");
  const anticipo = anticipoInput
    ? parseFloat(anticipoInput.value) || 0
    : 0;

  const totalFinal = Math.max(total - anticipo, 0);
  // Estimamos cuánto espacio necesita el bloque completo
  const espacioTotales = anticipo > 0 ? 40 : 20;

  // Verificamos si entra
  y = checkPageBreak(doc, y, espacioTotales);
  
// ---------------------------
// TOTALES
// ---------------------------
y += 6;

doc.setFont("helvetica", "normal");
doc.setFontSize(11);

if (anticipo > 0) {

  // Total normal
  doc.text(`TOTAL: $${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, 196, y, { align: "right" });

  y += 6;
  doc.text(`Anticipo: -$${anticipo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, 196, y, { align: "right" });

  y += 10;

  // === CAJA DESTACADA ===
  const boxHeight = 12;
  const boxWidth = 80;
  const boxX = 196 - boxWidth;
  const boxY = y - 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, boxWidth, boxHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const textoTotalFinal = `TOTAL FINAL: $${totalFinal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

  // Centro horizontal de la caja
  const centerX = boxX + boxWidth / 2;

  doc.text(
    textoTotalFinal,
    centerX,
    boxY + boxHeight / 2 + 3,
    { align: "center" }
  );
} else {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`TOTAL: $${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, 196, y, { align: "right" });
}

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
// ---------------------------
// GENERAR REMITO
// ------------------------
function generarRemito() {
  if (!ticketSeleccionado) {
    alert("Seleccioná un ticket primero");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // 📌 Cargar imagen de fondo
  const img = new Image();
  img.src = "/remito_base.png";

  img.onload = function () {
    doc.addImage(img, "JPEG", 0, 0, 210, 297);

    doc.setFont("courier", "bold");

    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, "0");
    const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
    const anio = fechaActual.getFullYear();
    // const fechaTexto = `${dia}/${mes}/${anio}`;

    const bultosInput = document.getElementById("bultosInput");
    const cantidadBultos = bultosInput ? bultosInput.value : "";

    const transportistaInput = document.getElementById("transportistaInput");
    const transportista = transportistaInput ? transportistaInput.value : "";

    const dniInput = document.getElementById("dniCliente");
    const dni = dniInput ? dniInput.value : "";
    
    const envioSucursalInput = document.getElementById("envioSucursal");
    const envioSucursal = envioSucursalInput ? envioSucursalInput.value === "true" : false;

    // =============================
    // DATOS DINÁMICOS
    // =============================
    
    const cliente = ticketSeleccionado.cliente;
    const envio = ticketSeleccionado.envio;

    // Fecha
    // doc.text(fechaTexto, 109, 36);
    doc.setFontSize(16);
    doc.text(`${dia}`, 111, 28);
    doc.text(`${mes}`, 125, 28);
    doc.text(`${anio}`, 138, 28);

    doc.setFontSize(15);
    // Codigo Postal
    doc.text(`CP: ${envio?.codigoPostal || "-"}`.toUpperCase(), 132, 37);
    
    // Cliente
    doc.text(`${cliente?.nombre || ""} ${cliente?.apellido || ""}`.toUpperCase(), 22, 51);

    // Teléfono (si querés)
    doc.text((cliente?.telefono || "").toUpperCase(), 111, 51);

    // Domicilio
    if(envioSucursal){
      doc.text("RETIRA EN SUCURSAL", 25, 59);
    } else {
      doc.text((envio?.direccion || "").toUpperCase(), 25, 59);
    }

    // 🔥 NUEVO CAMPO — LOCALIDAD
    doc.text(`Loc: ${(envio?.ciudad || "").toUpperCase()}`, 10, 65);

    // Provincia
    doc.text((envio?.provincia || "").toUpperCase(), 99, 65);

    // DNI
    doc.text((dni || "").toUpperCase(), 112, 77);

    doc.setFontSize(19);
    // Cantidad de Bultos
    doc.text(String(cantidadBultos).toUpperCase(), 55, 165);

    doc.setFontSize(15);
    // Transportista
    doc.text(transportista.toUpperCase(), 32, 178);

    // =============================
    // DESCRIPCIÓN FIJA
    // =============================

    doc.setFontSize(17);
    const textoDescripcion = "BULTO DE MERCADERIA EN TRANSITO DE ORIGEN NACIONAL";

    // Área aproximada de la descripción
    const descripcionX = 24;
    const descripcionY = 110; // ajustar fino si querés
    const descripcionWidth = 130;

    // Centrado horizontal dentro del bloque
    doc.text(
      textoDescripcion,
      descripcionX + descripcionWidth / 2,
      descripcionY,
      { align: "center", maxWidth: descripcionWidth }
    );

    // =============================
    // GUARDAR
    // =============================

    doc.save(`Remito_${ticketSeleccionado.pedidoId}.pdf`);
  };
}

// -----------------------------
cargarTickets();
