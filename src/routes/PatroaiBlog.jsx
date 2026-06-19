import React from "react";
import { Link, useLocation } from "react-router-dom";
import usePatroaiSeo from "../lib/usePatroaiSeo.js";

const POSTS = {
  pt: [
    {
      slug: "ia-governada-para-lideres",
      tag: "IA aplicada",
      title: "O novo ciclo da inteligência artificial empresarial exige governança.",
      summary:
        "A adoção de IA deixou de ser uma discussão apenas tecnológica. A questão central passa a ser como líderes transformam informação, risco e decisão em sistemas confiáveis.",
      body:
        "A Patroai entende que a inteligência artificial deve ser tratada como uma camada de gestão. Isso exige clareza de propósito, dados organizados, controles, supervisão humana e foco em resultado. A tecnologia só se torna estratégica quando melhora decisões, reduz ruído e cria continuidade operacional.",
    },
    {
      slug: "esg-perpetuacao-negocios",
      tag: "ESG",
      title: "ESG e perpetuação: tecnologia com visão de longo prazo.",
      summary:
        "Sustentabilidade, governança e inteligência aplicada fazem parte da mesma agenda: preparar empresas para crescer com responsabilidade e continuidade.",
      body:
        "Projetos de crescimento precisam considerar impacto, governança, eficiência e capacidade de adaptação. A Patroai posiciona ESG como critério estratégico, não como camada decorativa. A intenção é apoiar negócios mais resilientes, auditáveis e preparados para ciclos longos.",
    },
    {
      slug: "consultech-holding-ai-factory",
      tag: "Categoria",
      title: "Consultech, Holding e AI Factory: uma categoria em construção.",
      summary:
        "O mercado não precisa apenas de software, nem apenas de consultoria. Precisa de estruturas capazes de conectar estratégia, tecnologia e execução.",
      body:
        "A Patroai combina consultoria estratégica, desenvolvimento de tecnologia aplicada e visão de novos negócios. Essa combinação permite atuar desde o diagnóstico até a construção de caminhos operacionais, mantendo discrição, controle de acesso e relacionamento qualificado.",
    },
    {
      slug: "onde-estamos-para-onde-vamos",
      tag: "Mercado",
      title: "Onde estamos e para onde queremos chegar.",
      summary:
        "A Patroai está em fase de tração controlada: validando relacionamento, qualificando oportunidades e protegendo sua tecnologia privada.",
      body:
        "O próximo passo é transformar posicionamento em prova: cases anonimizados, whitepapers, rede de consultores qualificados e projetos estruturados. A ambição é construir uma categoria própria de IA governada para empresas, investidores e parceiros estratégicos.",
    },
  ],
  en: [
    {
      slug: "governed-ai-for-leaders",
      tag: "Applied AI",
      title: "The new cycle of enterprise AI requires governance.",
      summary:
        "AI adoption is no longer only a technology discussion. The central question is how leaders transform information, risk and decisions into reliable systems.",
      body:
        "Patroai understands artificial intelligence as a management layer. It requires clear purpose, organized data, controls, human oversight and focus on outcomes. Technology becomes strategic when it improves decisions, reduces noise and creates operational continuity.",
    },
    {
      slug: "esg-business-continuity",
      tag: "ESG",
      title: "ESG and continuity: technology with a long-term perspective.",
      summary:
        "Sustainability, governance and applied intelligence belong to the same agenda: preparing companies to grow responsibly and continuously.",
      body:
        "Growth projects must consider impact, governance, efficiency and adaptability. Patroai positions ESG as a strategic criterion, not a decorative layer. The goal is to support more resilient, auditable and long-term businesses.",
    },
    {
      slug: "consultech-holding-ai-factory",
      tag: "Category",
      title: "Consultech, Holding and AI Factory: a category in construction.",
      summary:
        "The market does not need only software, nor only consulting. It needs structures capable of connecting strategy, technology and execution.",
      body:
        "Patroai combines strategic consulting, applied technology development and a new venture perspective. This combination supports the journey from diagnosis to operational pathways, preserving discretion, controlled access and qualified relationships.",
    },
    {
      slug: "where-we-are-where-we-go",
      tag: "Market",
      title: "Where we are and where we want to go.",
      summary:
        "Patroai is in a controlled traction stage: validating relationships, qualifying opportunities and protecting its private technology.",
      body:
        "The next step is to turn positioning into proof: anonymized cases, whitepapers, qualified consultant networks and structured projects. The ambition is to build a proprietary category of governed AI for companies, investors and strategic partners.",
    },
  ],
};

const TEXT = {
  pt: {
    title: "Blog e Insights Patroai",
    subtitle:
      "Inteligência de mercado, IA aplicada, ESG, novos negócios e governança para líderes que pensam em longo prazo.",
    note:
      "Os conteúdos têm caráter institucional e estratégico. Não constituem recomendação de investimento, oferta pública ou promessa de resultado.",
    back: "Voltar para a página inicial",
    badge: "Patroai Insights",
  },
  en: {
    title: "Patroai Blog and Insights",
    subtitle:
      "Market intelligence, applied AI, ESG, new ventures and governance for leaders with a long-term perspective.",
    note:
      "Content is institutional and strategic. It does not constitute investment advice, public offering or a promise of results.",
    back: "Back to home",
    badge: "Patroai Insights",
  },
};

export default function PatroaiBlog() {
  usePatroaiSeo();
  const location = useLocation();
  const isEnglish = location.pathname === "/en" || location.pathname.startsWith("/en/");
  const locale = isEnglish ? "en" : "pt";
  const posts = POSTS[locale];
  const t = TEXT[locale];
  const homeHref = isEnglish ? "/en" : "/";
  const languageHref = isEnglish ? "/blog" : "/en/blog";

  return (
    <main className="min-h-screen bg-[#060813] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(125,92,255,0.15),transparent_30%),linear-gradient(180deg,#060813,#090d16_45%,#05060b)]" />

      <header className="border-b border-white/10 bg-[#060813]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:py-4">
          <Link to={homeHref} className="flex min-w-0 items-center gap-3">
            <img src="/patroai-assets/logo-patroai-novo.png" alt="Grupo Patroai" className="h-12 w-auto shrink-0 md:h-14" />
            <div className="min-w-0">
              <div className="whitespace-nowrap text-[11px] font-black uppercase tracking-[0.22em] text-white sm:text-xs">GRUPO PATROAI</div>
              <div className="hidden text-[11px] font-semibold text-white/45 sm:block">Consultech • Holding • AI Factory</div>
            </div>
          </Link>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link to={homeHref} className="whitespace-nowrap rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/75">
              {t.back}
            </Link>
            <Link to={languageHref} title={isEnglish ? "Ver em português" : "View in English"} className="whitespace-nowrap rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
              {isEnglish ? "PT" : "EN"}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
          {t.badge}
        </div>
        <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.96] tracking-[-0.06em] text-white md:text-7xl">
          {t.title}
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-white/68">{t.subtitle}</p>
        <p className="mt-5 max-w-3xl text-xs font-semibold uppercase leading-6 tracking-[0.16em] text-white/38">
          {t.note}
        </p>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {posts.map((post) => (
            <article key={post.slug} className="rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-black/20">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">{post.tag}</div>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">{post.title}</h2>
              <p className="mt-4 text-base leading-7 text-white/66">{post.summary}</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/18 p-5 text-sm leading-7 text-white/62">
                {post.body}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10">
        <div className="mx-auto max-w-7xl text-sm text-white/45">
          <div className="font-semibold text-white/60">“Ele muda os tempos e as estações; dá sabedoria aos sábios e conhecimento aos entendidos.” — Daniel 2:21</div>
          <div className="mt-3">© 2026 Grupo Patroai. Todos os direitos reservados.</div>
        </div>
      </footer>
    </main>
  );
}
