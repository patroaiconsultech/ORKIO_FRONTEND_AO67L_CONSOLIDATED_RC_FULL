import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePatroaiSeo from "../lib/usePatroaiSeo.js";
import { useLandingLocale } from "../lib/landingLocale.js";
import { submitStrategicIntake } from "../ui/api.js";

const PATROAI_WHATSAPP_URL = "https://wa.me/5551989697605?text=Ol%C3%A1%2C%20Grupo%20Patroai.%20Gostaria%20de%20falar%20sobre%20uma%20oportunidade%20estrat%C3%A9gica.";

const TEXT = {
  pt: {
    langToggle: "EN",
    langTitle: "View in English",
    brand: "GRUPO PATROAI",
    pillars: "Consultech • Holding • AI Factory",
    nav: {
      about: "Atuação",
      consultech: "Consultech",
      holding: "Holding",
      factory: "AI Factory",
      esg: "ESG",
      mission: "Missão",
      insights: "Blog",
      consultants: "Consultores",
      investors: "Investidores",
      contact: "Contato",
    },
    auth: {
      login: "Login",
      signup: "Cadastro com código",
      signupTitle: "Cadastro somente mediante código especial fornecido pelo Grupo Patroai",
      whatsapp: "WhatsApp",
      whatsappTitle: "Falar com o Grupo Patroai no WhatsApp",
    },
    hero: {
      badge: "Acesso privado e controlado",
      title: "Sistemas governados de IA para fluxos executivos.",
      subtitle:
        "O Grupo Patroai atua na interseção entre consultoria estratégica, tecnologia aplicada e desenvolvimento de negócios para transformar informação complexa em clareza, decisão e execução.",
      primary: "Solicitar contato estratégico",
      secondary: "Conhecer frentes de atuação",
      note:
        "Acesso à nossa tecnologia é concedido apenas após qualificação, validação interna e convite privado.",
    },
    intro: {
      eyebrow: "Ecossistema Patroai",
      title: "Consultoria, tecnologia e novos negócios com visão de longo prazo.",
      text:
        "Atuamos com empresas, investidores, consultores e parceiros estratégicos para estruturar planos, avaliar oportunidades, desenvolver sistemas e construir caminhos sustentáveis de crescimento.",
    },
    units: [
      {
        id: "consultech",
        title: "Patroai Consultech",
        subtitle: "Estratégia, valuation e suporte executivo especializado.",
        body:
          "Apoiamos empresas em momentos de análise, estruturação, crescimento, reposicionamento e tomada de decisão. Atuamos com business plan, valuation, diagnóstico estratégico, suporte executivo e estruturação comercial, financeira e operacional.",
        items: [
          "Business plan e planejamento estratégico",
          "Valuation e modelagens dinâmicas de valor",
          "Diagnóstico de negócios e oportunidades",
          "Suporte executivo especializado",
          "Rede premium de consultores associados",
        ],
      },
      {
        id: "holding",
        title: "Patroai Holding",
        subtitle: "Desenvolvimento de novos negócios e parcerias estratégicas.",
        body:
          "Estruturamos projetos empresariais com parceiros em diferentes setores, buscando oportunidades com potencial de escala, sinergia e geração de valor. Investidores qualificados podem cadastrar interesse para conhecer iniciativas futuras.",
        items: [
          "Desenvolvimento de novos negócios",
          "Parcerias estratégicas por segmento",
          "Construção de teses de crescimento",
          "Conexão institucional com investidores",
          "Estruturação de projetos e expansão",
        ],
      },
      {
        id: "factory",
        title: "Patroai AI Factory",
        subtitle: "Tecnologia aplicada para transformar conhecimento em operação.",
        body:
          "Desenvolvemos sistemas, automações e ambientes digitais seguros para apoiar decisões, processos e fluxos executivos em empresas e projetos estratégicos, sempre com acesso controlado e implantação responsável.",
        items: [
          "Sistemas governados de inteligência artificial",
          "Automações corporativas",
          "Ambientes digitais para gestão e decisão",
          "Organização de informações complexas",
          "Soluções sob medida para operação e escala",
        ],
      },
    ],
    esg: {
      eyebrow: "ESG e perpetuação",
      title: "Crescimento responsável, sustentável e preparado para o futuro.",
      text:
        "Nosso foco em ESG considera sustentabilidade, governança, impacto e continuidade dos negócios. Acreditamos que a inteligência artificial deve apoiar empresas não apenas a crescer, mas a crescer com responsabilidade, eficiência, visão de longo prazo e capacidade de perpetuação.",
      items: [
        "Sustentabilidade como critério estratégico",
        "Governança e rastreabilidade desde o desenho da solução",
        "Eficiência operacional com responsabilidade",
        "Tecnologia orientada à continuidade dos negócios",
      ],
    },
    mission: {
      eyebrow: "Missão, visão e valores",
      title: "Tecnologia, estratégia e propósito para perpetuar negócios.",
      intro:
        "A Patroai nasce para unir inteligência estratégica, tecnologia aplicada e responsabilidade empresarial em projetos capazes de gerar valor sustentável.",
      cards: [
        {
          title: "Missão",
          text:
            "Apoiar empresas, investidores, consultores e parceiros na estruturação de negócios mais inteligentes, governados e sustentáveis, transformando informação complexa em clareza, decisão e execução.",
        },
        {
          title: "Visão",
          text:
            "Ser uma referência brasileira em consultech, AI Factory e desenvolvimento de novos negócios, construindo uma categoria própria de sistemas governados de IA para gestão, crescimento e perpetuação empresarial.",
        },
        {
          title: "Valores",
          text:
            "Verdade operacional, governança, sustentabilidade, responsabilidade, excelência, discrição, parceria, inovação aplicada, visão de longo prazo e fé traduzida em serviço.",
        },
      ],
    },
    market: {
      eyebrow: "Tese de mercado",
      title: "Onde estamos e para onde queremos chegar.",
      text:
        "O mercado empresarial entrou em um novo ciclo: a inteligência artificial deixou de ser apenas ferramenta e passou a exigir governança, integração, segurança, pessoas qualificadas e clareza estratégica.",
      cards: [
        {
          title: "Mercado",
          text:
            "Empresas buscam IA aplicada, mas ainda enfrentam dificuldade para transformar tecnologia em decisão, operação, controle de risco e resultado mensurável.",
        },
        {
          title: "Onde estamos",
          text:
            "Estamos em fase de tração controlada, com posicionamento público validado, captação qualificada, ambiente privado protegido e foco em projetos estratégicos de alto valor.",
        },
        {
          title: "Onde queremos chegar",
          text:
            "Queremos construir uma categoria própria: uma consultech com AI Factory e visão de holding, capaz de apoiar empresas na continuidade, expansão e perpetuação dos negócios.",
        },
      ],
    },
    insights: {
      eyebrow: "Blog e inteligência de mercado",
      title: "Insights para líderes, investidores e consultores.",
      text:
        "Publicaremos análises sobre IA aplicada, governança, ESG, novos negócios, valuation, transformação empresarial e perpetuação, sem expor detalhes sensíveis da plataforma privada.",
      cta: "Acessar blog",
      posts: [
        {
          title: "O novo ciclo da IA empresarial exige governança",
          text:
            "A próxima fase da inteligência artificial não será vencida apenas por quem adotar ferramentas, mas por quem construir processos confiáveis, auditáveis e alinhados ao negócio.",
        },
        {
          title: "ESG e perpetuação: tecnologia com visão de longo prazo",
          text:
            "Sustentabilidade, governança e inteligência aplicada passam a fazer parte da mesma agenda: proteger a continuidade das empresas e preparar novas gerações de valor.",
        },
        {
          title: "Consultech, Holding e AI Factory: uma categoria em construção",
          text:
            "A Patroai combina estratégia, tecnologia e capital relacional para estruturar negócios, apoiar decisões e desenvolver oportunidades com controle e responsabilidade.",
        },
      ],
    },
    mission: {
      eyebrow: "Mission, vision and values",
      title: "Technology, strategy and purpose for business continuity.",
      intro:
        "Patroai was created to combine strategic intelligence, applied technology and responsible business design in projects capable of generating sustainable value.",
      cards: [
        {
          title: "Mission",
          text:
            "To support companies, investors, consultants and partners in structuring smarter, governed and sustainable businesses, turning complex information into clarity, decision and execution.",
        },
        {
          title: "Vision",
          text:
            "To become a Brazilian reference in consultech, AI Factory and new venture development, building a proprietary category of governed AI systems for management, growth and business continuity.",
        },
        {
          title: "Values",
          text:
            "Operational truth, governance, sustainability, responsibility, excellence, discretion, partnership, applied innovation, long-term vision and faith expressed through service.",
        },
      ],
    },
    market: {
      eyebrow: "Market thesis",
      title: "Where we are and where we want to go.",
      text:
        "The enterprise market has entered a new cycle: artificial intelligence is no longer just a tool. It requires governance, integration, security, qualified people and strategic clarity.",
      cards: [
        {
          title: "Market",
          text:
            "Companies are pursuing applied AI, but many still struggle to turn technology into decision-making, operations, risk control and measurable business outcomes.",
        },
        {
          title: "Where we are",
          text:
            "We are in a controlled traction stage, with validated public positioning, qualified intake, a protected private environment and focus on high-value strategic projects.",
        },
        {
          title: "Where we want to go",
          text:
            "We aim to build a proprietary category: a consultech with an AI Factory and holding perspective, supporting companies in continuity, expansion and long-term business value.",
        },
      ],
    },
    insights: {
      eyebrow: "Blog and market intelligence",
      title: "Insights for leaders, investors and consultants.",
      text:
        "We will publish perspectives on applied AI, governance, ESG, new ventures, valuation, business transformation and continuity, without exposing sensitive details of the private platform.",
      cta: "Visit blog",
      posts: [
        {
          title: "The new cycle of enterprise AI requires governance",
          text:
            "The next stage of artificial intelligence will not be won only by those adopting tools, but by those building reliable, auditable and business-aligned processes.",
        },
        {
          title: "ESG and continuity: technology with a long-term perspective",
          text:
            "Sustainability, governance and applied intelligence now belong to the same agenda: protecting business continuity and preparing new generations of value.",
        },
        {
          title: "Consultech, Holding and AI Factory: a category in construction",
          text:
            "Patroai combines strategy, technology and relational capital to structure businesses, support decisions and develop opportunities with control and responsibility.",
        },
      ],
    },
    audiences: {
      companies: {
        title: "Para empresas",
        text:
          "Solicite uma análise estratégica para entender como consultoria, tecnologia e inteligência aplicada podem apoiar seu negócio.",
        cta: "Solicitar análise estratégica",
      },
      investors: {
        title: "Para investidores",
        text:
          "Cadastre interesse institucional para conhecer projetos e oportunidades futuras em desenvolvimento pelo Grupo Patroai.",
        cta: "Cadastrar interesse como investidor",
      },
      consultants: {
        title: "Para consultores",
        text:
          "Se você é consultor, executivo ou especialista com experiência de mercado e deseja atuar conosco em projetos de IA, gestão, valuation, ESG ou transformação de negócios, cadastre seu interesse.",
        cta: "Quero ser consultor associado",
      },
    },
    form: {
      eyebrow: "Pré-onboarding qualificado",
      title: "Cadastro para análise e contato",
      subtitle:
        "Este cadastro não libera acesso à plataforma. As informações são usadas para triagem, análise de aderência e eventual contato privado do Grupo Patroai.",
      typeLabel: "Perfil de interesse",
      types: {
        company: "Empresa / Cliente",
        investor: "Investidor",
        consultant: "Consultor associado",
      },
      fields: {
        full_name: "Nome completo",
        email: "E-mail",
        whatsapp: "WhatsApp",
        company: "Empresa / organização",
        role: "Cargo ou função",
        city: "Cidade",
        state: "Estado",
        country: "País",
        website: "Site",
        linkedin: "LinkedIn",
        segment: "Segmento",
        company_size: "Tamanho aproximado da empresa",
        challenge: "Principal desafio ou oportunidade",
        interest_area: "Área de interesse",
        person_type: "Pessoa física ou jurídica",
        investor_type: "Perfil / tese do investidor",
        capital_range: "Faixa indicativa / tese de investimento",
        sectors: "Setores de interesse ou experiência",
        expertise: "Especialidade principal",
        years_experience: "Anos de experiência",
        engagement_model: "Modelo de atuação desejado",
        availability: "Disponibilidade para projetos",
        ai_experience: "Experiência com IA, tecnologia ou transformação digital",
        esg_focus: "Interesse ou experiência em ESG / sustentabilidade",
        message: "Mensagem complementar",
      },
      placeholders: {
        challenge: "Conte brevemente o que sua empresa busca estruturar, avaliar ou transformar.",
        investor: "Descreva sua tese, perfil de investimento ou tipo de oportunidade que deseja conhecer.",
        consultant: "Conte sua trajetória, áreas de atuação e como poderia contribuir com projetos do Grupo Patroai.",
        message: "Inclua informações relevantes para análise do perfil.",
      },
      consentTerms:
        "Li e aceito os Termos de Uso e a Política de Privacidade.",
      consentData:
        "Autorizo o Grupo Patroai a analisar meus dados para fins de triagem, aderência e contato institucional.",
      consentContact:
        "Autorizo contato por e-mail, telefone ou WhatsApp sobre este cadastro.",
      consentMarketing:
        "Aceito receber comunicações institucionais e conteúdos do Grupo Patroai.",
      submit: "Enviar cadastro para análise",
      sending: "Enviando...",
      successTitle: "Cadastro recebido",
      successText:
        "Recebemos suas informações. Nossa equipe fará uma análise interna e poderá entrar em contato caso exista aderência com nossos critérios, projetos ou oportunidades.",
      protocol: "Protocolo",
      noAccess:
        "Nenhum acesso automático foi liberado. Convites privados dependem de aprovação manual.",
      errorConsent: "Para enviar, aceite os termos, a análise de dados e o contato institucional.",
      errorRequired: "Preencha os campos obrigatórios para análise: {fields}.",
      errorGeneric: "Não foi possível enviar agora. Tente novamente em instantes.",
    },
    legal: {
      investor:
        "O cadastro de investidores tem finalidade de relacionamento institucional e apresentação privada de oportunidades futuras. Não constitui oferta pública de investimento, promessa de rentabilidade ou garantia de participação.",
      consultant:
        "O cadastro de consultores não constitui vínculo empregatício, associação automática ou promessa de contratação. Perfis são avaliados conforme experiência, reputação, disponibilidade e aderência aos projetos.",
    },
    footer: {
      verse:
        "“Ele muda os tempos e as estações; dá sabedoria aos sábios e conhecimento aos entendidos.”",
      reference: "Daniel 2:21",
      rights: "© 2026 Grupo Patroai. Todos os direitos reservados.",
      terms: "Termos",
      privacy: "Privacidade",
      contact: "Contato",
    },
  },
  en: {
    langToggle: "PT",
    langTitle: "Ver em português",
    brand: "GRUPO PATROAI",
    pillars: "Consultech • Holding • AI Factory",
    nav: {
      about: "Scope",
      consultech: "Consultech",
      holding: "Holding",
      factory: "AI Factory",
      esg: "ESG",
      mission: "Mission",
      insights: "Blog",
      consultants: "Consultants",
      investors: "Investors",
      contact: "Contact",
    },
    auth: {
      login: "Login",
      signup: "Sign up with code",
      signupTitle: "Registration is available only with a special code provided by Grupo Patroai",
      whatsapp: "WhatsApp",
      whatsappTitle: "Talk to Grupo Patroai on WhatsApp",
    },
    hero: {
      badge: "Private and controlled access",
      title: "Governed AI systems for executive workflows.",
      subtitle:
        "Grupo Patroai operates at the intersection of strategic consulting, applied technology and business development to turn complex information into clarity, decisions and execution.",
      primary: "Request strategic contact",
      secondary: "Explore our scope",
      note:
        "Access to our technology is granted only after qualification, internal validation and private invitation.",
    },
    intro: {
      eyebrow: "Patroai ecosystem",
      title: "Consulting, technology and new ventures with a long-term perspective.",
      text:
        "We work with companies, investors, consultants and strategic partners to structure plans, evaluate opportunities, develop systems and build sustainable growth paths.",
    },
    units: [
      {
        id: "consultech",
        title: "Patroai Consultech",
        subtitle: "Strategy, valuation and specialized executive support.",
        body:
          "We support companies through analysis, structuring, growth, repositioning and decision-making moments. Our work includes business plans, valuation, strategic diagnosis, executive support and commercial, financial and operational structuring.",
        items: [
          "Business plans and strategic planning",
          "Valuation and dynamic value modeling",
          "Business diagnosis and opportunity mapping",
          "Specialized executive support",
          "Premium network of associated consultants",
        ],
      },
      {
        id: "holding",
        title: "Patroai Holding",
        subtitle: "New venture development and strategic partnerships.",
        body:
          "We structure business projects with partners across different sectors, pursuing opportunities with scale potential, synergy and value creation. Qualified investors may register interest to learn about future initiatives.",
        items: [
          "New venture development",
          "Strategic partnerships by sector",
          "Growth thesis structuring",
          "Institutional connection with investors",
          "Project structuring and expansion",
        ],
      },
      {
        id: "factory",
        title: "Patroai AI Factory",
        subtitle: "Applied technology to turn knowledge into operation.",
        body:
          "We develop systems, automations and secure digital environments to support decisions, processes and executive workflows in companies and strategic projects, always through controlled access and responsible implementation.",
        items: [
          "Governed artificial intelligence systems",
          "Corporate automations",
          "Digital environments for management and decision-making",
          "Organization of complex information",
          "Tailored solutions for operation and scale",
        ],
      },
    ],
    esg: {
      eyebrow: "ESG and business continuity",
      title: "Responsible, sustainable growth prepared for the future.",
      text:
        "Our ESG focus considers sustainability, governance, impact and business continuity. We believe artificial intelligence should help companies not only grow, but grow responsibly, efficiently, with long-term vision and capacity for perpetuation.",
      items: [
        "Sustainability as a strategic criterion",
        "Governance and traceability from solution design",
        "Operational efficiency with responsibility",
        "Technology oriented to business continuity",
      ],
    },
    audiences: {
      companies: {
        title: "For companies",
        text:
          "Request a strategic analysis to understand how consulting, technology and applied intelligence can support your business.",
        cta: "Request strategic analysis",
      },
      investors: {
        title: "For investors",
        text:
          "Register institutional interest to learn about future projects and opportunities developed by Grupo Patroai.",
        cta: "Register investor interest",
      },
      consultants: {
        title: "For consultants",
        text:
          "If you are a consultant, executive or experienced specialist and want to work with us in AI, management, valuation, ESG or business transformation projects, register your interest.",
        cta: "Become an associated consultant",
      },
    },
    form: {
      eyebrow: "Qualified pre-onboarding",
      title: "Registration for review and contact",
      subtitle:
        "This registration does not grant platform access. The information is used for screening, fit analysis and possible private contact from Grupo Patroai.",
      typeLabel: "Interest profile",
      types: {
        company: "Company / Client",
        investor: "Investor",
        consultant: "Associated consultant",
      },
      fields: {
        full_name: "Full name",
        email: "Email",
        whatsapp: "WhatsApp",
        company: "Company / organization",
        role: "Role",
        city: "City",
        state: "State",
        country: "Country",
        website: "Website",
        linkedin: "LinkedIn",
        segment: "Industry",
        company_size: "Approximate company size",
        challenge: "Main challenge or opportunity",
        interest_area: "Area of interest",
        person_type: "Individual or legal entity",
        investor_type: "Investor profile / thesis",
        capital_range: "Indicative range / investment thesis",
        sectors: "Sectors of interest or experience",
        expertise: "Main expertise",
        years_experience: "Years of experience",
        engagement_model: "Preferred engagement model",
        availability: "Project availability",
        ai_experience: "Experience with AI, technology or digital transformation",
        esg_focus: "ESG / sustainability interest or experience",
        message: "Additional message",
      },
      placeholders: {
        challenge: "Briefly describe what your company wants to structure, evaluate or transform.",
        investor: "Describe your thesis, investment profile or type of opportunity you want to learn about.",
        consultant: "Describe your background, areas of expertise and how you could contribute to Grupo Patroai projects.",
        message: "Include relevant information for profile review.",
      },
      consentTerms:
        "I have read and accept the Terms of Use and Privacy Policy.",
      consentData:
        "I authorize Grupo Patroai to review my data for screening, fit analysis and institutional contact.",
      consentContact:
        "I authorize contact by email, phone or WhatsApp regarding this registration.",
      consentMarketing:
        "I agree to receive institutional communications and content from Grupo Patroai.",
      submit: "Submit registration for review",
      sending: "Sending...",
      successTitle: "Registration received",
      successText:
        "We received your information. Our team will perform an internal review and may contact you if there is fit with our criteria, projects or opportunities.",
      protocol: "Protocol",
      noAccess:
        "No automatic access was granted. Private invitations depend on manual approval.",
      errorConsent: "To submit, accept the terms, data review and institutional contact.",
      errorRequired: "Please complete the required fields for review: {fields}.",
      errorGeneric: "We could not submit right now. Please try again shortly.",
    },
    legal: {
      investor:
        "Investor registration is intended for institutional relationship and private presentation of future opportunities. It does not constitute a public investment offering, promise of returns or guarantee of participation.",
      consultant:
        "Consultant registration does not constitute employment, automatic association or promise of engagement. Profiles are reviewed according to experience, reputation, availability and project fit.",
    },
    footer: {
      verse:
        "“He changes times and seasons; He gives wisdom to the wise and knowledge to those who have understanding.”",
      reference: "Daniel 2:21",
      rights: "© 2026 Grupo Patroai. All rights reserved.",
      terms: "Terms",
      privacy: "Privacy",
      contact: "Contact",
    },
  },
};

const INITIAL_FORM = {
  intake_type: "company",
  full_name: "",
  email: "",
  whatsapp: "",
  company: "",
  role: "",
  city: "",
  state: "",
  country: "Brasil",
  website: "",
  linkedin: "",
  segment: "",
  company_size: "",
  challenge: "",
  interest_area: "",
  person_type: "",
  investor_type: "",
  capital_range: "",
  sectors: "",
  expertise: "",
  years_experience: "",
  engagement_model: "",
  availability: "",
  ai_experience: "",
  esg_focus: "",
  message: "",
  consent_terms: false,
  consent_data_review: false,
  consent_contact: false,
  consent_marketing: false,
  website_url: "",
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">{label}</span>
      {children}
    </label>
  );
}

function textInputProps() {
  return "w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white placeholder-white/28 outline-none transition focus:border-emerald-300/60 focus:bg-white/[0.075]";
}

function TextInput({ value, onChange, required = false, placeholder = "", type = "text" }) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={textInputProps()}
    />
  );
}

function TextArea({ value, onChange, required = false, placeholder = "", rows = 4 }) {
  return (
    <textarea
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${textInputProps()} resize-none`}
    />
  );
}

function Select({ value, onChange, children, required = false }) {
  return (
    <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className={textInputProps()}>
      {children}
    </select>
  );
}

function PillarCard({ unit }) {
  return (
    <article id={unit.id} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/20">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">{unit.title}</div>
      <h3 className="mt-4 text-2xl font-black tracking-tight text-white">{unit.subtitle}</h3>
      <p className="mt-4 text-sm leading-7 text-white/68">{unit.body}</p>
      <ul className="mt-6 space-y-3">
        {unit.items.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-white/72">
            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function AudienceCard({ title, text, cta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.075] to-white/[0.035] p-6 text-left transition hover:border-emerald-300/35 hover:from-emerald-300/[0.11] hover:to-white/[0.045]"
    >
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-white/64">{text}</p>
      <div className="mt-6 text-sm font-black text-emerald-200 group-hover:text-emerald-100">{cta} →</div>
    </button>
  );
}

function ConsentBox({ checked, onChange, children, required = false }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-white/68">
      <input
        type="checkbox"
        required={required}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
      />
      <span>{children}</span>
    </label>
  );
}

export default function PatroaiLanding() {
  usePatroaiSeo();
  const { locale, setLocale, isEnglish } = useLandingLocale();
  const t = TEXT[isEnglish ? "en" : "pt"];

  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const activePlaceholder = useMemo(() => {
    if (form.intake_type === "investor") return t.form.placeholders.investor;
    if (form.intake_type === "consultant") return t.form.placeholders.consultant;
    return t.form.placeholders.challenge;
  }, [form.intake_type, t]);

  const scrollToForm = (type) => {
    set("intake_type", type);
    requestAnimationFrame(() => {
      document.getElementById("strategic-intake")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const missing = [];
    const present = (value) => String(value || "").trim().length > 0;
    const requireField = (key, label = t.form.fields[key] || key) => {
      if (!present(form[key])) missing.push(label);
    };

    ["full_name", "email", "whatsapp", "city", "state"].forEach((key) => requireField(key));

    if (form.intake_type === "company") {
      ["company", "role", "segment", "company_size", "interest_area", "challenge"].forEach((key) => requireField(key));
    } else if (form.intake_type === "investor") {
      ["person_type", "investor_type", "capital_range", "sectors", "message"].forEach((key) => requireField(key));
      if (!present(form.linkedin) && !present(form.website)) {
        missing.push(isEnglish ? "LinkedIn or website" : "LinkedIn ou site");
      }
    } else if (form.intake_type === "consultant") {
      ["linkedin", "expertise", "years_experience", "sectors", "engagement_model", "availability", "message"].forEach((key) => requireField(key));
    }

    if (missing.length > 0) {
      setError(t.form.errorRequired.replace("{fields}", missing.join(", ")));
      return;
    }

    if (!form.consent_terms || !form.consent_data_review || !form.consent_contact) {
      setError(t.form.errorConsent);
      return;
    }

    setSending(true);
    try {
      const result = await submitStrategicIntake({
        ...form,
        locale,
        source: "grupo_patroai_public_landing",
      });
      setReceipt(result?.data || result);
    } catch (err) {
      setError(err?.message || t.form.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  const commonFields = (
    <>
      <Field label={t.form.fields.full_name}>
        <TextInput required value={form.full_name} onChange={(v) => set("full_name", v)} />
      </Field>
      <Field label={t.form.fields.email}>
        <TextInput required type="email" value={form.email} onChange={(v) => set("email", v)} />
      </Field>
      <Field label={t.form.fields.whatsapp}>
        <TextInput required value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="+55 51 99999-9999" />
      </Field>
      <Field label={t.form.fields.company}>
        <TextInput value={form.company} onChange={(v) => set("company", v)} />
      </Field>
      <Field label={t.form.fields.role}>
        <TextInput value={form.role} onChange={(v) => set("role", v)} />
      </Field>
      <Field label={t.form.fields.linkedin}>
        <TextInput value={form.linkedin} onChange={(v) => set("linkedin", v)} placeholder="https://linkedin.com/in/..." />
      </Field>
    </>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#060813] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(125,92,255,0.15),transparent_30%),linear-gradient(180deg,#060813,#090d16_45%,#05060b)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060813]/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <a href="#top" className="flex items-center gap-3">
            <img src="/patroai-assets/logo-patroai-novo.png" alt="Grupo Patroai" className="h-9 w-auto" />
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-white">{t.brand}</div>
              <div className="text-[11px] font-semibold text-white/45">{t.pillars}</div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[0.16em] text-white/54 lg:flex">
            <a href="#scope" className="hover:text-white">{t.nav.about}</a>
            <a href="#consultech" className="hover:text-white">{t.nav.consultech}</a>
            <a href="#holding" className="hover:text-white">{t.nav.holding}</a>
            <a href="#factory" className="hover:text-white">{t.nav.factory}</a>
            <a href="#esg" className="hover:text-white">{t.nav.esg}</a>
            <a href="#mission" className="hover:text-white">{t.nav.mission}</a>
            <a href="#insights" className="hover:text-white">{t.nav.insights}</a>
            <a href="#strategic-intake" className="hover:text-white">{t.nav.contact}</a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={PATROAI_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer noopener"
              title={t.auth.whatsappTitle}
              className="hidden rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-200/55 hover:bg-emerald-300/16 md:inline-flex"
            >
              {t.auth.whatsapp}
            </a>
            <Link
              to="/auth?mode=login"
              className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/78 transition hover:border-white/24 hover:text-white"
            >
              {t.auth.login}
            </Link>
            <Link
              to="/auth?mode=register"
              title={t.auth.signupTitle}
              className="hidden rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/55 hover:bg-cyan-200/16 sm:inline-flex"
            >
              {t.auth.signup}
            </Link>
            <button
              type="button"
              onClick={() => setLocale(isEnglish ? "pt" : "en")}
              title={t.langTitle}
              className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-2 text-[11px] font-black tracking-[0.18em] text-white/80 transition hover:border-emerald-300/40 hover:text-white"
            >
              {t.langToggle}
            </button>
          </div>
        </div>
      </header>

      <section id="top" className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-28">
        <div>
          <div className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
            {t.hero.badge}
          </div>
          <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.96] tracking-[-0.06em] text-white md:text-7xl">
            {t.hero.title}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68">
            {t.hero.subtitle}
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => scrollToForm("company")}
              className="rounded-2xl bg-gradient-to-r from-emerald-300 to-cyan-200 px-6 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-emerald-950/40 transition hover:brightness-110"
            >
              {t.hero.primary}
            </button>
            <a href="#scope" className="rounded-2xl border border-white/12 bg-white/[0.055] px-6 py-4 text-center text-sm font-black text-white/85 transition hover:border-white/24 hover:bg-white/[0.08]">
              {t.hero.secondary}
            </a>
          </div>
          <p className="mt-6 max-w-xl text-xs font-semibold uppercase leading-6 tracking-[0.18em] text-white/38">{t.hero.note}</p>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30">
          <div className="rounded-[2rem] border border-white/10 bg-[#0d1320]/90 p-6">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">{t.pillars}</div>
            <div className="mt-8 grid gap-4">
              {[
                t.nav.consultech,
                t.nav.holding,
                t.nav.factory,
                "ESG",
                isEnglish ? "Private access" : "Acesso privado",
              ].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <span className="text-sm font-bold text-white/78">{item}</span>
                  <span className="text-xs font-black text-white/35">0{index + 1}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-50/78">
              {isEnglish
                ? "A discreet public presence. A controlled strategic relationship. A private operating environment."
                : "Presença pública discreta. Relacionamento estratégico controlado. Ambiente operacional privado."}
            </div>
          </div>
        </div>
      </section>

      <section id="scope" className="mx-auto max-w-7xl px-4 py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/70">{t.intro.eyebrow}</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">{t.intro.title}</h2>
          <p className="mt-5 text-lg leading-8 text-white/65">{t.intro.text}</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {t.units.map((unit) => <PillarCard key={unit.id} unit={unit} />)}
        </div>
      </section>

      <section id="esg" className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-[2.5rem] border border-emerald-300/15 bg-gradient-to-br from-emerald-300/[0.11] via-white/[0.045] to-cyan-300/[0.08] p-7 md:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-100/75">{t.esg.eyebrow}</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">{t.esg.title}</h2>
              <p className="mt-5 text-lg leading-8 text-white/70">{t.esg.text}</p>
            </div>
            <div className="grid gap-4">
              {t.esg.items.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/18 p-4 text-sm font-bold text-white/76">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="mission" className="mx-auto max-w-7xl px-4 py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/70">{t.mission.eyebrow}</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">{t.mission.title}</h2>
          <p className="mt-5 text-lg leading-8 text-white/65">{t.mission.intro}</p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {t.mission.cards.map((card) => (
            <div key={card.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
              <h3 className="text-2xl font-black tracking-[-0.03em] text-white">{card.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/62">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="market" className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-[2.5rem] border border-cyan-200/15 bg-gradient-to-br from-cyan-300/[0.09] via-white/[0.04] to-emerald-300/[0.08] p-7 md:p-10">
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/75">{t.market.eyebrow}</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">{t.market.title}</h2>
            <p className="mt-5 text-lg leading-8 text-white/70">{t.market.text}</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {t.market.cards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-black uppercase tracking-[0.16em] text-cyan-100/70">{card.title}</div>
                <p className="mt-3 text-sm leading-7 text-white/66">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="insights" className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/70">{t.insights.eyebrow}</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">{t.insights.title}</h2>
            <p className="mt-5 text-lg leading-8 text-white/65">{t.insights.text}</p>
          </div>
          <Link to="/blog" className="rounded-2xl border border-white/12 bg-white/[0.055] px-5 py-3 text-center text-sm font-black text-white/80 transition hover:border-white/24 hover:text-white">
            {t.insights.cta}
          </Link>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {t.insights.posts.map((post) => (
            <article key={post.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Patroai Insights</div>
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-white">{post.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/62">{post.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          <AudienceCard {...t.audiences.companies} onClick={() => scrollToForm("company")} />
          <AudienceCard {...t.audiences.investors} onClick={() => scrollToForm("investor")} />
          <AudienceCard {...t.audiences.consultants} onClick={() => scrollToForm("consultant")} />
        </div>
      </section>

      <section id="strategic-intake" className="mx-auto max-w-5xl px-4 py-20">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-8 max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/70">{t.form.eyebrow}</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">{t.form.title}</h2>
            <p className="mt-4 text-sm leading-7 text-white/62">{t.form.subtitle}</p>
          </div>

          {receipt ? (
            <div className="rounded-[2rem] border border-emerald-300/25 bg-emerald-300/10 p-6">
              <h3 className="text-2xl font-black text-emerald-50">{t.form.successTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-emerald-50/75">{t.form.successText}</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{t.form.protocol}</div>
                <div className="mt-2 font-mono text-sm text-white">{receipt?.intake_id || receipt?.id || "registered"}</div>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase leading-6 tracking-[0.16em] text-white/45">{t.form.noAccess}</p>
              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  setForm(INITIAL_FORM);
                }}
                className="mt-6 rounded-2xl border border-white/12 bg-white/[0.055] px-5 py-3 text-sm font-black text-white/80"
              >
                {isEnglish ? "Submit another registration" : "Enviar outro cadastro"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="text"
                tabIndex="-1"
                autoComplete="off"
                value={form.website_url}
                onChange={(e) => set("website_url", e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              {error && (
                <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
              )}

              <Field label={t.form.typeLabel}>
                <div className="grid gap-3 md:grid-cols-3">
                  {["company", "investor", "consultant"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set("intake_type", type)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                        form.intake_type === type
                          ? "border-emerald-300/45 bg-emerald-300/15 text-emerald-50"
                          : "border-white/10 bg-white/[0.045] text-white/58 hover:text-white"
                      }`}
                    >
                      {t.form.types[type]}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                {commonFields}
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <Field label={t.form.fields.city}>
                  <TextInput required value={form.city} onChange={(v) => set("city", v)} />
                </Field>
                <Field label={t.form.fields.state}>
                  <TextInput required value={form.state} onChange={(v) => set("state", v)} />
                </Field>
                <Field label={t.form.fields.country}>
                  <TextInput value={form.country} onChange={(v) => set("country", v)} />
                </Field>
              </div>

              {form.intake_type === "company" && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label={t.form.fields.segment}>
                    <TextInput required value={form.segment} onChange={(v) => set("segment", v)} />
                  </Field>
                  <Field label={t.form.fields.company_size}>
                    <TextInput required value={form.company_size} onChange={(v) => set("company_size", v)} />
                  </Field>
                  <Field label={t.form.fields.interest_area}>
                    <Select required value={form.interest_area} onChange={(v) => set("interest_area", v)}>
                      <option value="">{isEnglish ? "Select..." : "Selecione..."}</option>
                      <option value="consultoria">{isEnglish ? "Strategic consulting" : "Consultoria estratégica"}</option>
                      <option value="valuation">Valuation</option>
                      <option value="ia">{isEnglish ? "Artificial intelligence" : "Inteligência artificial"}</option>
                      <option value="esg">ESG</option>
                      <option value="novos_negocios">{isEnglish ? "New ventures" : "Novos negócios"}</option>
                      <option value="gestao">{isEnglish ? "Management and operations" : "Gestão e operações"}</option>
                    </Select>
                  </Field>
                  <Field label={t.form.fields.website}>
                    <TextInput value={form.website} onChange={(v) => set("website", v)} />
                  </Field>
                </div>
              )}

              {form.intake_type === "investor" && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label={t.form.fields.person_type}>
                    <Select required value={form.person_type} onChange={(v) => set("person_type", v)}>
                      <option value="">{isEnglish ? "Select..." : "Selecione..."}</option>
                      <option value="individual">{isEnglish ? "Individual" : "Pessoa física"}</option>
                      <option value="legal_entity">{isEnglish ? "Legal entity" : "Pessoa jurídica"}</option>
                      <option value="family_office">Family office</option>
                      <option value="fund">{isEnglish ? "Fund / investment vehicle" : "Fundo / veículo de investimento"}</option>
                      <option value="other">{isEnglish ? "Other" : "Outro"}</option>
                    </Select>
                  </Field>
                  <Field label={t.form.fields.investor_type}>
                    <TextInput required value={form.investor_type} onChange={(v) => set("investor_type", v)} placeholder={isEnglish ? "Angel, family office, fund, strategic investor..." : "Anjo, family office, fundo, investidor estratégico..."} />
                  </Field>
                  <Field label={t.form.fields.capital_range}>
                    <TextInput required value={form.capital_range} onChange={(v) => set("capital_range", v)} />
                  </Field>
                  <Field label={t.form.fields.sectors}>
                    <TextInput required value={form.sectors} onChange={(v) => set("sectors", v)} />
                  </Field>
                  <Field label={`${t.form.fields.website} / LinkedIn`}>
                    <TextInput value={form.website} onChange={(v) => set("website", v)} placeholder={isEnglish ? "Website or institutional page" : "Site ou página institucional"} />
                  </Field>
                </div>
              )}

              {form.intake_type === "consultant" && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label={t.form.fields.expertise}>
                    <TextInput required value={form.expertise} onChange={(v) => set("expertise", v)} placeholder={isEnglish ? "Strategy, finance, ESG, AI, operations..." : "Estratégia, finanças, ESG, IA, operações..."} />
                  </Field>
                  <Field label={t.form.fields.years_experience}>
                    <TextInput required value={form.years_experience} onChange={(v) => set("years_experience", v)} />
                  </Field>
                  <Field label={t.form.fields.sectors}>
                    <TextInput required value={form.sectors} onChange={(v) => set("sectors", v)} />
                  </Field>
                  <Field label={t.form.fields.engagement_model}>
                    <Select required value={form.engagement_model} onChange={(v) => set("engagement_model", v)}>
                      <option value="">{isEnglish ? "Select..." : "Selecione..."}</option>
                      <option value="project_based">{isEnglish ? "Project-based consulting" : "Consultoria por projeto"}</option>
                      <option value="part_time">{isEnglish ? "Part-time allocation" : "Alocação parcial"}</option>
                      <option value="advisory">{isEnglish ? "Advisory / mentoring" : "Advisory / mentoria"}</option>
                      <option value="implementation">{isEnglish ? "Implementation partner" : "Parceiro de implantação"}</option>
                      <option value="other">{isEnglish ? "Other" : "Outro"}</option>
                    </Select>
                  </Field>
                  <Field label={t.form.fields.availability}>
                    <TextInput required value={form.availability} onChange={(v) => set("availability", v)} />
                  </Field>
                </div>
              )}

              <Field label={t.form.fields.esg_focus}>
                <TextArea value={form.esg_focus} onChange={(v) => set("esg_focus", v)} rows={3} />
              </Field>

              <Field label={form.intake_type === "company" ? t.form.fields.challenge : t.form.fields.message}>
                <TextArea
                  required
                  value={form.intake_type === "company" ? form.challenge : form.message}
                  onChange={(v) => set(form.intake_type === "company" ? "challenge" : "message", v)}
                  placeholder={activePlaceholder}
                  rows={5}
                />
              </Field>

              {form.intake_type === "consultant" && (
                <Field label={t.form.fields.ai_experience}>
                  <TextArea value={form.ai_experience} onChange={(v) => set("ai_experience", v)} rows={4} />
                </Field>
              )}

              <div className="grid gap-3">
                <ConsentBox required checked={form.consent_terms} onChange={(v) => set("consent_terms", v)}>
                  {t.form.consentTerms} <Link to="/legal/terms" className="text-emerald-200 underline">{t.footer.terms}</Link> / <Link to="/legal/privacy" className="text-emerald-200 underline">{t.footer.privacy}</Link>
                </ConsentBox>
                <ConsentBox required checked={form.consent_data_review} onChange={(v) => set("consent_data_review", v)}>
                  {t.form.consentData}
                </ConsentBox>
                <ConsentBox required checked={form.consent_contact} onChange={(v) => set("consent_contact", v)}>
                  {t.form.consentContact}
                </ConsentBox>
                <ConsentBox checked={form.consent_marketing} onChange={(v) => set("consent_marketing", v)}>
                  {t.form.consentMarketing}
                </ConsentBox>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/16 p-4 text-xs leading-6 text-white/48">
                <p>{t.legal.investor}</p>
                <p className="mt-2">{t.legal.consultant}</p>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-cyan-200 px-6 py-4 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
              >
                {sending ? t.form.sending : t.form.submit}
              </button>
            </form>
          )}
        </div>
      </section>

      <a
        href={PATROAI_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer noopener"
        title={t.auth.whatsappTitle}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-emerald-300/35 bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-2xl shadow-emerald-950/40 transition hover:brightness-110"
      >
        {t.auth.whatsapp}
      </a>

      <footer className="border-t border-white/10 px-4 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-white">{t.brand}</div>
            <div className="mt-1 text-sm text-white/46">{t.pillars}</div>
            <blockquote className="mt-5 max-w-2xl text-sm italic leading-7 text-white/62">
              {t.footer.verse}
              <span className="not-italic text-white/42"> — {t.footer.reference}</span>
            </blockquote>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-[0.16em] text-white/42">
            <Link to="/legal/terms" className="hover:text-white">{t.footer.terms}</Link>
            <Link to="/legal/privacy" className="hover:text-white">{t.footer.privacy}</Link>
            <a href="#strategic-intake" className="hover:text-white">{t.footer.contact}</a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl text-xs text-white/32">{t.footer.rights}</div>
      </footer>
    </main>
  );
}
