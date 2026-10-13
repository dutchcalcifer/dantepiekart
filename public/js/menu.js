const toggle = document.querySelector("#menu-toggle");
const dialog = document.querySelector("#menu-dialog");
const close = document.querySelector("#menu-close");

if (toggle && dialog && close) {
  toggle.hidden = false;

  toggle.addEventListener("click", (event) => {
    dialog.showModal();
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    // Pointer users need focus inside the dialog, without highlighting a link.
    // Keyboard and assistive activation keep a visible, actionable focus target.
    const initialFocus =
      event.detail === 0
        ? dialog.querySelector("a")
        : dialog.querySelector("#menu-title");
    initialFocus.focus({ preventScroll: true });
  });

  close.addEventListener("click", () => dialog.close());

  // A history navigation can restore the page with its dialog still open.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    if (dialog.open) dialog.close();
    document.body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  });

  // Keep Tab within the menu; native dialog handles Escape and the inert background.
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll("button, a[href]")];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  dialog.addEventListener("close", () => {
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    toggle.focus();
  });

  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (event.target === dialog && outside) dialog.close();
  });
}
