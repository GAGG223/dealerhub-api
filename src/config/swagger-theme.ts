/**
 * Tema visual customizado para o Swagger UI do DealerHub.
 * Tema CLARO e clean com a identidade da marca: fundo branco, header próprio,
 * cores suaves por método e cantos arredondados. Não altera a API.
 */

/** CSS que estiliza toda a página de documentação. */
export const swaggerCustomCss = `
/* ---- Fonte ---- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  --dh-bg: #f6f8fc;
  --dh-surface: #ffffff;
  --dh-border: #e4e9f2;
  --dh-text: #1e2637;
  --dh-text-dim: #64748b;
  --dh-brand: #0ea472;
  --dh-brand-2: #10b981;
  --dh-accent: #4f46e5;
  --dh-radius: 14px;
  --dh-shadow: 0 6px 24px rgba(30, 41, 59, 0.06);
}

/* ---- Base ---- */
body {
  margin: 0;
  background:
    radial-gradient(900px 420px at 12% -8%, rgba(79,70,229,0.06), transparent 60%),
    radial-gradient(800px 380px at 92% -4%, rgba(14,164,114,0.07), transparent 55%),
    var(--dh-bg) !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  color: var(--dh-text) !important;
}

.swagger-ui, .swagger-ui p, .swagger-ui label,
.swagger-ui .opblock-tag, .swagger-ui table thead tr th,
.swagger-ui .parameter__name, .swagger-ui .response-col_status {
  color: var(--dh-text) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
}

/* Esconde a topbar padrão do Swagger */
.swagger-ui .topbar { display: none !important; }

/* ---- Header customizado DealerHub ---- */
#dh-hero {
  max-width: 1460px;
  margin: 0 auto;
  padding: 40px 24px 8px;
}
#dh-hero .dh-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid var(--dh-border);
  border-radius: 999px;
  background: rgba(14,164,114,0.08);
  color: var(--dh-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
#dh-hero h1 {
  margin: 18px 0 6px;
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(90deg, #0f172a 0%, var(--dh-brand) 60%, var(--dh-accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
#dh-hero p {
  margin: 0;
  max-width: 720px;
  color: var(--dh-text-dim) !important;
  font-size: 16px;
  line-height: 1.6;
}
#dh-hero .dh-chips { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; }
#dh-hero .dh-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--dh-border);
  background: var(--dh-surface);
  color: var(--dh-text-dim);
  font-size: 12px;
  font-weight: 600;
  box-shadow: var(--dh-shadow);
}

/* ---- Info block original (escondemos, usamos o hero) ---- */
.swagger-ui .info { display: none !important; }
.swagger-ui .scheme-container {
  background: transparent !important;
  box-shadow: none !important;
  padding: 8px 0 24px !important;
  max-width: 1460px;
  margin: 0 auto;
}

/* ---- Botão Authorize ---- */
.swagger-ui .btn.authorize {
  background: linear-gradient(135deg, var(--dh-brand) 0%, var(--dh-brand-2) 100%) !important;
  border: none !important;
  color: #ffffff !important;
  border-radius: 999px !important;
  font-weight: 700 !important;
  box-shadow: 0 6px 18px rgba(14,164,114,0.28) !important;
}
.swagger-ui .btn.authorize span { color: #ffffff !important; }
.swagger-ui .btn.authorize svg { fill: #ffffff !important; }

/* ---- Cartões de tag ---- */
.swagger-ui .opblock-tag {
  border: none !important;
  border-bottom: 1px solid var(--dh-border) !important;
  font-size: 20px !important;
  font-weight: 700 !important;
  margin: 26px 0 10px !important;
}
.swagger-ui .opblock-tag small { color: var(--dh-text-dim) !important; }

/* ---- Blocos de operação ---- */
.swagger-ui .opblock {
  border: 1px solid var(--dh-border) !important;
  border-radius: var(--dh-radius) !important;
  background: var(--dh-surface) !important;
  box-shadow: var(--dh-shadow) !important;
  margin: 0 0 12px !important;
  overflow: hidden;
}
.swagger-ui .opblock .opblock-summary {
  border: none !important;
  padding: 6px 10px !important;
}
.swagger-ui .opblock .opblock-summary-path,
.swagger-ui .opblock .opblock-summary-path__deprecated {
  color: var(--dh-text) !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-weight: 600 !important;
}
.swagger-ui .opblock .opblock-summary-description {
  color: var(--dh-text-dim) !important;
}
.swagger-ui .opblock .opblock-summary-method {
  border-radius: 8px !important;
  font-weight: 700 !important;
  min-width: 84px;
}

/* Cores suaves por método (fundo claro, borda colorida) */
.swagger-ui .opblock.opblock-get { background: rgba(79,70,229,0.035) !important; border-color: rgba(79,70,229,0.35) !important; }
.swagger-ui .opblock.opblock-post { background: rgba(14,164,114,0.04) !important; border-color: rgba(14,164,114,0.35) !important; }
.swagger-ui .opblock.opblock-put { background: rgba(217,119,6,0.04) !important; border-color: rgba(217,119,6,0.35) !important; }
.swagger-ui .opblock.opblock-patch { background: rgba(13,148,136,0.04) !important; border-color: rgba(13,148,136,0.35) !important; }
.swagger-ui .opblock.opblock-delete { background: rgba(220,38,38,0.04) !important; border-color: rgba(220,38,38,0.35) !important; }

.swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--dh-accent) !important; }
.swagger-ui .opblock.opblock-post .opblock-summary-method { background: var(--dh-brand) !important; }
.swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #0d9488 !important; }
.swagger-ui .opblock.opblock-put .opblock-summary-method { background: #d97706 !important; }
.swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #dc2626 !important; }

/* ---- Corpo expandido ---- */
.swagger-ui .opblock-body,
.swagger-ui .opblock-description-wrapper,
.swagger-ui .opblock .opblock-section {
  background: #fbfcfe !important;
  color: var(--dh-text) !important;
}
.swagger-ui .opblock-section-header {
  background: #f2f5fa !important;
  box-shadow: none !important;
  border-top: 1px solid var(--dh-border) !important;
}
.swagger-ui .opblock-section-header h4,
.swagger-ui .opblock-section-header label { color: var(--dh-text) !important; }

/* Inputs */
.swagger-ui input[type=text],
.swagger-ui input[type=password],
.swagger-ui input[type=email],
.swagger-ui textarea,
.swagger-ui select {
  background: #ffffff !important;
  color: var(--dh-text) !important;
  border: 1px solid var(--dh-border) !important;
  border-radius: 8px !important;
}

/* Blocos de código / respostas */
.swagger-ui .highlight-code, .swagger-ui .microlight {
  background: #0f172a !important;
  border-radius: 10px !important;
}
.swagger-ui .responses-inner { background: transparent !important; }
.swagger-ui table.model { background: #ffffff !important; border-radius: 10px !important; }
.swagger-ui .response-col_status { font-weight: 700 !important; }

/* Botões "Try it out" / Execute */
.swagger-ui .btn.execute {
  background: linear-gradient(135deg, var(--dh-accent) 0%, #6366f1 100%) !important;
  border: none !important;
  border-radius: 999px !important;
  color: #fff !important;
  font-weight: 700 !important;
}
.swagger-ui .btn {
  border-radius: 999px !important;
  border-color: var(--dh-border) !important;
  color: var(--dh-text) !important;
}

/* Modelos / schemas */
.swagger-ui .model, .swagger-ui .model-title { color: var(--dh-text) !important; }
.swagger-ui section.models {
  border-color: var(--dh-border) !important;
  background: var(--dh-surface) !important;
  border-radius: var(--dh-radius) !important;
  box-shadow: var(--dh-shadow) !important;
}
.swagger-ui section.models .model-container { background: #fbfcfe !important; }

/* Scrollbar */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: #d3dae7; border-radius: 999px; }
::-webkit-scrollbar-track { background: transparent; }

/* Footer sutil */
#dh-footer {
  max-width: 1460px;
  margin: 24px auto 48px;
  padding: 18px 24px;
  color: var(--dh-text-dim);
  font-size: 13px;
  border-top: 1px solid var(--dh-border);
}
#dh-footer b { color: var(--dh-text); }
`;

/**
 * JS injetado que monta o header (hero) e o footer com a identidade DealerHub.
 * O swagger-ui-express aceita customJsStr para rodar script na página de docs.
 */
export const swaggerCustomJs = `
window.addEventListener('load', function () {
  function build() {
    var container = document.querySelector('.swagger-ui');
    if (!container || document.getElementById('dh-hero')) return;

    var hero = document.createElement('section');
    hero.id = 'dh-hero';
    hero.innerHTML =
      '<span class="dh-badge">◆ DealerHub Platform · API v1</span>' +
      '<h1>DealerHub API</h1>' +
      '<p>Plataforma SaaS multi-tenant para gestão de concessionárias de veículos. ' +
      'Cada concessionária é um tenant isolado, com autenticação via JWT e isolamento garantido no back-end.</p>' +
      '<div class="dh-chips">' +
        '<span class="dh-chip">Multi-tenant</span>' +
        '<span class="dh-chip">JWT + Refresh</span>' +
        '<span class="dh-chip">RBAC</span>' +
        '<span class="dh-chip">Node · TypeScript · Prisma</span>' +
        '<span class="dh-chip">PostgreSQL</span>' +
        '<span class="dh-chip">OpenAPI 3.0</span>' +
      '</div>';

    container.insertBefore(hero, container.firstChild);

    var footer = document.createElement('footer');
    footer.id = 'dh-footer';
    footer.innerHTML = '<b>DealerHub API</b> — gestão inteligente para concessionárias · Documentação OpenAPI 3.0 · MIT';
    container.appendChild(footer);
  }
  build();
  // Reaplica caso o Swagger re-renderize
  var tries = 0;
  var t = setInterval(function () { build(); if (++tries > 20) clearInterval(t); }, 300);
});
`;
