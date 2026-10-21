/** Shared navigation: switching pages must not abandon an active device operation. */
export function setupNavigation({ canNavigate, onBlocked }) {
  const select = document.getElementById("page-select");
  const current = select.value;
  select.onchange = () => {
    if (!canNavigate()) {
      select.value = current;
      onBlocked();
      return;
    }
    location.href = select.value;
  };
  for (const link of document.querySelectorAll(".toolbar a")) {
    link.onclick = event => {
      if (!canNavigate()) { event.preventDefault(); onBlocked(); }
    };
  }
}
