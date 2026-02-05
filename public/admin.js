let tickets = [];
let ticketSeleccionado = null;

async function cargarTickets() {
  const res = await fetch("/tickets");
  tickets = await res.json();

  const list = document.getElementById("ticketsList");
  list.innerHTML = "";

  tickets.forEach(t => {
    const div = document.createElement("div");
    div.className = "ticket";
    div.innerText = `#${t.id} - ${t.cliente?.email || "Cliente"} - $${t.total}`;
    div.onclick = () => mostrarDetalle(t);
    list.appendChild(div);
  });
}

function mostrarDetalle(ticket) {
  ticketSeleccionado = ticket;

  let html = `
    <p><b>Ticket:</b> #${ticket.id}</p>
    <p><b>Email:</b> ${ticket.cliente?.email || "-"}</p>

    <table>
      <tr>
        <th>Producto</th>
        <th>Cant</th>
        <th>Precio</th>
      </tr>
  `;

  ticket.items.forEach((item, i) => {
    html += `
      <tr>
        <td>${item.descripcion}</td>
        <td><input type="number" value="${item.cantidad}" data-i="${i}" data-tipo="cantidad"></td>
        <td><input type="number" value="${item.precio}" data-i="${i}" data-tipo="precio"></td>
      </tr>
    `;
  });

  html += `
    </table>
    <button onclick="guardarCambios()">Guardar cambios</button>
  `;

  document.getElementById("ticketDetail").innerHTML = html;
}

async function guardarCambios() {
  const inputs = document.querySelectorAll("input");

  inputs.forEach(input => {
    const i = input.dataset.i;
    const tipo = input.dataset.tipo;
    ticketSeleccionado.items[i][tipo] = Number(input.value);
  });

  await fetch(`/tickets/${ticketSeleccionado.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketSeleccionado)
  });

  alert("Cambios guardados");
  cargarTickets();
}

cargarTickets();
