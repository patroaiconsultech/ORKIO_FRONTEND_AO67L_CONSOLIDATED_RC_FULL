--- frontend/src/routes/Landing.jsx
+++ frontend/src/routes/Landing.jsx
@@ -430,6 +430,7 @@
   const nav = useNavigate();
   const { locale, setLocale, ttsLocale } = useLandingLocale();
   const copy = ORKIO_PAGE_COPY[locale] || ORKIO_PAGE_COPY.pt;
+  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 
   const heroSubtitle = useMemo(() => copy.hero.subtitle, [copy.hero.subtitle]);
 
@@ -440,7 +441,12 @@
       query.set(key, String(value));
     });
 
+    setMobileMenuOpen(false);
     nav(`${ROUTES.auth}${query.toString() ? `?${query.toString()}` : ""}`);
+  }
+
+  function closeMobileMenu() {
+    setMobileMenuOpen(false);
   }
 
   return (
@@ -479,6 +485,7 @@
 
         .orkio-header__inner {
           min-height: 92px;
+          position: relative;
           display: flex;
           align-items: center;
           justify-content: space-between;
@@ -548,6 +555,48 @@
           display: flex;
           align-items: center;
           gap: 12px;
+        }
+
+        .orkio-mobile-menu-button {
+          display: none;
+          min-width: 48px;
+          min-height: 48px;
+          align-items: center;
+          justify-content: center;
+          gap: 7px;
+          border: 1px solid rgba(255,255,255,0.14);
+          border-radius: 15px;
+          color: rgba(255,255,255,0.90);
+          background: rgba(255,255,255,0.06);
+          cursor: pointer;
+          touch-action: manipulation;
+          -webkit-tap-highlight-color: transparent;
+        }
+
+        .orkio-mobile-menu-button span {
+          display: block;
+          width: 18px;
+          height: 2px;
+          border-radius: 999px;
+          background: currentColor;
+        }
+
+        .orkio-mobile-menu-button em {
+          font-style: normal;
+          font-size: 12px;
+          font-weight: 900;
+          letter-spacing: 0.08em;
+          text-transform: uppercase;
+        }
+
+        .orkio-mobile-menu-button__lines {
+          display: inline-flex;
+          flex-direction: column;
+          gap: 4px;
+        }
+
+        .orkio-mobile-menu {
+          display: none;
         }
 
         .orkio-button {
@@ -1197,6 +1246,58 @@
             display: none;
           }
 
+          .orkio-mobile-menu-button {
+            display: inline-flex;
+          }
+
+          .orkio-mobile-menu {
+            position: absolute;
+            top: calc(100% - 8px);
+            left: 0;
+            right: 0;
+            z-index: 30;
+            display: grid;
+            gap: 10px;
+            padding: 14px;
+            border: 1px solid rgba(136,243,160,0.22);
+            border-radius: 22px;
+            background: rgba(4,10,18,0.96);
+            box-shadow: 0 24px 70px rgba(0,0,0,0.42);
+            backdrop-filter: blur(18px);
+          }
+
+          .orkio-mobile-menu a,
+          .orkio-mobile-menu button {
+            width: 100%;
+            min-height: 46px;
+            display: inline-flex;
+            align-items: center;
+            justify-content: space-between;
+            padding: 0 14px;
+            border: 1px solid rgba(255,255,255,0.10);
+            border-radius: 15px;
+            color: rgba(255,255,255,0.88);
+            background: rgba(255,255,255,0.045);
+            text-decoration: none;
+            font-size: 14px;
+            font-weight: 850;
+            cursor: pointer;
+            touch-action: manipulation;
+            -webkit-tap-highlight-color: transparent;
+          }
+
+          .orkio-mobile-menu a:hover,
+          .orkio-mobile-menu button:hover {
+            border-color: rgba(136,243,160,0.34);
+            color: #9cffae;
+          }
+
+          .orkio-mobile-menu__cta {
+            color: #061108 !important;
+            background: linear-gradient(135deg, #abff8f 0%, #54d568 48%, #177a35 100%) !important;
+            border-color: transparent !important;
+          }
+
           .orkio-logo strong {
             font-size: 24px;
           }
@@ -1304,6 +1405,39 @@
           <div className="orkio-actions">
 <Link to={ROUTES.patroai}>{copy.nav.patroai}</Link>
           </div>
+
+          <button
+            type="button"
+            className="orkio-mobile-menu-button"
+            aria-controls="orkio-mobile-menu"
+            aria-expanded={mobileMenuOpen}
+            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
+            onClick={() => setMobileMenuOpen((open) => !open)}
+          >
+            <span className="orkio-mobile-menu-button__lines" aria-hidden="true">
+              <span />
+              <span />
+              <span />
+            </span>
+            <em>Menu</em>
+          </button>
+
+          {mobileMenuOpen ? (
+            <div id="orkio-mobile-menu" className="orkio-mobile-menu" role="dialog" aria-label={copy.navAria}>
+              <a href="#recursos" onClick={closeMobileMenu}>{copy.nav.resources}</a>
+              <a href="#como-funciona" onClick={closeMobileMenu}>{copy.nav.how}</a>
+              <a href="#integracoes" onClick={closeMobileMenu}>{copy.nav.integrations}</a>
+              <a href="#assistente" onClick={closeMobileMenu}>{copy.nav.assistant}</a>
+              <Link to={ROUTES.patroai} onClick={closeMobileMenu}>{copy.nav.patroai}</Link>
+              <button
+                type="button"
+                className="orkio-mobile-menu__cta"
+                onClick={() => goToAuth({ source: "landing_mobile_menu", intent: "diagnosis", lang: locale })}
+              >
+                {copy.hero.primary}
+              </button>
+            </div>
+          ) : null}
         </div>
       </header>
 
