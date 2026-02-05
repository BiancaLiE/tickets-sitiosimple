fetch("/tickets")
  .then(res => res.json())
  .then(tickets => {
    const lista = document.getElementById("lista");

    tickets.forEach(t => {
      const li = document.createElement("li");
      li.innerHTML = `
        Ticket ${t.ticketNumero} – ${t.cliente.email} – $${t.total}
        <a href="/ticket.html?numero=${t.ticketNumero}">[Editar]</a>
      `;
      lista.appendChild(li);
    });
  });
