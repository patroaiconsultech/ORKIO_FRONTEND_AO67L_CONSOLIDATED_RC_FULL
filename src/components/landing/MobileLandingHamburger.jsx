import React, { useState } from "react";

export default function MobileLandingHamburger({
  links = [
    { href: "#orkio", label: "Orkio" },
    { href: "#patroai", label: "Patroai" },
    { href: "#amcham", label: "AmCham" },
    { href: "/auth", label: "Entrar" },
  ],
  ctaHref = "/auth",
  ctaLabel = "Começar",
}) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((value) => !value)}
        style={{
          minWidth: 44,
          minHeight: 44,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          fontSize: 22,
          fontWeight: 900,
          display: "inline-grid",
          placeItems: "center",
          cursor: "pointer",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {open ? "×" : "☰"}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={close}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 998,
              border: 0,
              background: "rgba(2,6,23,0.54)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              cursor: "default",
            }}
          />

          <nav
            aria-label="Navegação mobile"
            style={{
              position: "fixed",
              top: 72,
              left: 14,
              right: 14,
              zIndex: 999,
              display: "grid",
              gap: 8,
              padding: 14,
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(15,23,42,0.96)",
              color: "#fff",
              boxShadow: "0 28px 90px rgba(0,0,0,0.48)",
            }}
          >
            {links.map((link) => (
              <a
                key={`${link.href}-${link.label}`}
                href={link.href}
                onClick={close}
                style={{
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  borderRadius: 12,
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 850,
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {link.label}
              </a>
            ))}

            <a
              href={ctaHref}
              onClick={close}
              style={{
                minHeight: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 14px",
                borderRadius: 14,
                color: "#04111d",
                textDecoration: "none",
                fontWeight: 950,
                background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
              }}
            >
              {ctaLabel}
            </a>
          </nav>
        </>
      ) : null}
    </div>
  );
}
