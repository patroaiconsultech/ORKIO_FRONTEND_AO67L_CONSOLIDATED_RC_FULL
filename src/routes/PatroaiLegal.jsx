import React from "react";
import { Link, useLocation } from "react-router-dom";
import usePatroaiSeo from "../lib/usePatroaiSeo.js";
import { PATROAI_LEGAL_IDENTITY as LEGAL } from "../lib/patroaiLegalIdentity.js";

const VERSION = "RTB-10 v1.0 — 20/06/2026";
const COMPANY = LEGAL.legalName;
const CNPJ = LEGAL.cnpj;
const ADDRESS = LEGAL.address.full;
const CONTACT_EMAIL = LEGAL.emails.contact;
const PRIVACY_EMAIL = LEGAL.emails.privacy;

const CONTENT = {
  pt: {
    back: "Voltar",
    brand: "GRUPO PATROAI",
    pillars: "Consultech • Holding • AI Factory",
    pages: {
      terms: {
        eyebrow: "Termos de Uso",
        title: "Termos de Uso — página pública, blog, formulários e acesso controlado",
        intro:
          "Estes Termos regulam o uso da página pública, blog, formulários de pré-onboarding, canais de contato e ambientes privados de acesso controlado do Grupo Patroai.",
        sections: [
          {
            title: "1. Identificação e natureza do site",
            body:
              `${COMPANY}, inscrita no CNPJ ${CNPJ}, com sede em ${ADDRESS}, opera a presença pública do Grupo Patroai como canal institucional, informativo e de relacionamento. O contato institucional é ${CONTACT_EMAIL}. O site não libera acesso automático à plataforma interna e não constitui ambiente público de contratação, investimento ou prestação individualizada de consultoria.`,
          },
          {
            title: "2. Cadastro não é acesso",
            body:
              "O envio de formulário público representa apenas solicitação de análise, triagem e eventual contato institucional. O cadastro não cria usuário, sessão, token, convite, código especial, proposta, diagnóstico, contratação, investimento, sociedade, associação ou obrigação de resposta. Todo cadastro nasce em análise interna.",
          },
          {
            title: "3. Empresas, investidores e consultores",
            body:
              "Os fluxos de empresas, investidores e consultores associados são independentes e têm finalidade de qualificação. O cadastro de investidor não constitui oferta pública, recomendação, promessa de rentabilidade, garantia de participação, captação pública ou distribuição de valores mobiliários. O cadastro de consultor não cria vínculo empregatício, societário, associativo, comercial, parceria automática, exclusividade ou obrigação de contratação.",
          },
          {
            title: "4. Conteúdo informativo",
            body:
              "Conteúdos da landing, blog e materiais institucionais têm finalidade informativa, estratégica e editorial. Eles não constituem consultoria jurídica, financeira, contábil, fiscal, regulatória, societária, tecnológica ou recomendação de investimento. Decisões relevantes devem ser avaliadas por profissionais qualificados e conforme o caso concreto.",
          },
          {
            title: "5. Inteligência artificial e supervisão humana",
            body:
              "As soluções de inteligência artificial do Grupo Patroai são ferramentas de apoio à análise, organização, automação assistida e tomada de decisão supervisionada. Elas não substituem avaliação humana qualificada, parecer profissional ou decisão estratégica final. Resultados gerados por IA podem conter limitações e devem ser revisados antes de uso relevante.",
          },
          {
            title: "6. Acesso privado, código especial e confidencialidade",
            body:
              "Ambientes privados, beta, administrativos ou com código especial são pessoais, controlados, revogáveis e sujeitos a auditoria. É proibido compartilhar códigos, credenciais, telas, fluxos, dados, documentos, estratégias ou informações internas sem autorização expressa da PATROAI.",
          },
          {
            title: "7. Propriedade intelectual",
            body:
              "Textos, interfaces, marcas, conteúdos, métodos, fluxos, materiais, bases, documentos e soluções do Grupo Patroai são protegidos por direitos de propriedade intelectual. É proibida cópia, reprodução, engenharia reversa, exploração comercial não autorizada ou uso indevido de qualquer elemento da presença pública ou de ambientes privados.",
          },
          {
            title: "8. Limitação de responsabilidade",
            body:
              "A PATROAI poderá alterar, suspender ou descontinuar conteúdos, formulários, fluxos, convites ou ambientes privados a qualquer momento. O uso da página e o envio de formulários não geram garantia de disponibilidade, resposta, contratação, acesso, resultado, retorno financeiro ou participação em oportunidades.",
          },
          {
            title: "9. Lei aplicável e foro",
            body:
              "Estes Termos são regidos pelas leis da República Federativa do Brasil. Eventuais controvérsias serão tratadas preferencialmente por diálogo e, quando necessário, pelo foro competente indicado nos documentos contratuais específicos.",
          },
        ],
      },
      privacy: {
        eyebrow: "Política de Privacidade",
        title: "Política de Privacidade — site, formulários, WhatsApp, blog e acesso privado",
        intro:
          "Esta Política explica como a PATROAI trata dados pessoais em sua presença pública, formulários, canais de contato, blog e ambientes privados controlados.",
        sections: [
          {
            title: "1. Controlador e canal de privacidade",
            body:
              `${COMPANY}, CNPJ ${CNPJ}, com sede em ${ADDRESS}, atua como controladora dos dados pessoais coletados em seus canais públicos e privados. Solicitações sobre privacidade e proteção de dados pessoais podem ser encaminhadas para ${PRIVACY_EMAIL}. Contatos institucionais podem ser enviados para ${CONTACT_EMAIL}.`,
          },
          {
            title: "2. Dados coletados",
            body:
              "Podemos coletar nome, e-mail, telefone/WhatsApp, empresa, cargo, cidade, estado, país, LinkedIn, site, segmento, porte aproximado, área de interesse, perfil de investidor, modelo de atuação, experiência, disponibilidade, mensagens enviadas, dados técnicos de navegação, logs de segurança, data/hora, IP, user-agent, rota, idioma e versão dos termos aceitos.",
          },
          {
            title: "3. Finalidades",
            body:
              "Os dados são tratados para triagem, análise de aderência, contato institucional, gestão de relacionamento, segurança, prevenção de abuso, atendimento de solicitações, envio de comunicações autorizadas, cumprimento de obrigações legais/regulatórias e administração de acessos privados quando houver aprovação.",
          },
          {
            title: "4. Bases legais",
            body:
              "As bases legais podem incluir execução de procedimentos preliminares, consentimento, legítimo interesse, cumprimento de obrigação legal/regulatória e exercício regular de direitos, conforme a finalidade específica do tratamento.",
          },
          {
            title: "5. Compartilhamento, operadores e transferência internacional",
            body:
              "Dados poderão ser tratados por fornecedores de hospedagem, segurança, analytics, comunicação, automação, infraestrutura, e-mail, WhatsApp, armazenamento e ferramentas de IA, sempre de acordo com finalidade legítima, medidas de segurança e contratos aplicáveis. Alguns fornecedores podem operar fora do Brasil, hipótese em que adotaremos salvaguardas compatíveis com a LGPD.",
          },
          {
            title: "6. Retenção e descarte",
            body:
              "Os dados serão mantidos pelo tempo necessário para as finalidades informadas, cumprimento de obrigações legais, preservação de direitos, auditoria e segurança. Cadastros sem aderência poderão ser arquivados ou eliminados conforme política interna.",
          },
          {
            title: "7. Direitos dos titulares",
            body:
              "O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade quando aplicável, informação sobre compartilhamento, revisão de decisões automatizadas quando cabível e revogação de consentimentos.",
          },
          {
            title: "8. Segurança e incidentes",
            body:
              "Adotamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais, incluindo controle de acesso, logs, segregação de ambientes, revisão manual e monitoramento. Incidentes relevantes serão avaliados conforme a legislação aplicável.",
          },
          {
            title: "9. WhatsApp e dados sensíveis",
            body:
              "Ao iniciar contato pelo WhatsApp, você autoriza a PATROAI a responder sua solicitação e tratar seus dados de contato e mensagem para atendimento institucional. Evite enviar dados sensíveis, documentos confidenciais ou informações de terceiros sem autorização.",
          },
        ],
      },
      cookies: {
        eyebrow: "Política de Cookies",
        title: "Política de Cookies",
        intro:
          "Esta Política explica o uso de cookies e tecnologias semelhantes na página pública do Grupo Patroai.",
        sections: [
          {
            title: "1. O que são cookies",
            body:
              "Cookies são pequenos arquivos ou identificadores armazenados no dispositivo do usuário para viabilizar funcionamento técnico, segurança, preferências, estatísticas, melhoria de experiência e, quando aplicável, comunicação institucional.",
          },
          {
            title: "2. Categorias",
            body:
              "Podemos usar cookies necessários para funcionamento e segurança, cookies de preferências, cookies analíticos e, se futuramente habilitados, cookies de marketing. Cookies não necessários devem respeitar preferências e consentimentos aplicáveis.",
          },
          {
            title: "3. Gestão de preferências",
            body:
              "O usuário pode controlar cookies pelo navegador e, quando disponível, pelo painel de preferências do site. A desativação de cookies necessários pode prejudicar funcionalidades essenciais.",
          },
          {
            title: "4. Atualizações",
            body:
              "Esta Política poderá ser atualizada conforme evolução da página, ferramentas, analytics, pixels, fornecedores e requisitos legais.",
          },
        ],
      },
    },
  },
  en: {
    back: "Back",
    brand: "GRUPO PATROAI",
    pillars: "Consultech • Holding • AI Factory",
    pages: {
      terms: {
        eyebrow: "Terms of Use",
        title: "Terms of Use — public page, blog, forms and controlled access",
        intro:
          "These Terms govern the use of Grupo Patroai’s public page, blog, pre-onboarding forms, contact channels and controlled private environments.",
        sections: [
          {
            title: "1. Identification and website nature",
            body:
              `${COMPANY}, registered under Brazilian CNPJ ${CNPJ}, with registered office at ${ADDRESS}, operates Grupo Patroai’s public presence as an institutional, informational and relationship channel. Institutional contact: ${CONTACT_EMAIL}. The website does not grant automatic access to the internal platform and does not constitute a public environment for contracting, investing or individualized consulting.`,
          },
          {
            title: "2. Registration is not access",
            body:
              "Submitting a public form is only a request for screening, review and possible institutional contact. It does not create a user, session, token, invitation, special code, proposal, diagnosis, contract, investment, company relationship, association or obligation to respond.",
          },
          {
            title: "3. Companies, investors and consultants",
            body:
              "Company, investor and associated consultant flows are independent qualification processes. Investor registration is not a public offering, investment recommendation, promise of returns, guarantee of participation, public fundraising or securities distribution. Consultant registration does not create employment, corporate, associative or commercial relationship, automatic partnership, exclusivity or obligation to engage.",
          },
          {
            title: "4. Informational content",
            body:
              "Landing, blog and institutional content are informational, strategic and editorial. They do not constitute legal, financial, accounting, tax, regulatory, corporate or technology consulting, nor investment advice.",
          },
          {
            title: "5. Artificial intelligence and human oversight",
            body:
              "Grupo Patroai’s AI solutions support analysis, organization, assisted automation and supervised decision-making. They do not replace qualified human assessment, professional opinions or final strategic decisions.",
          },
          {
            title: "6. Private access and confidentiality",
            body:
              "Private, beta, administrative or code-protected environments are personal, controlled, revocable and auditable. Sharing codes, credentials, screens, flows, data, documents, strategies or internal information without express authorization is prohibited.",
          },
          {
            title: "7. Intellectual property and liability",
            body:
              "Texts, interfaces, brands, contents, methods, flows, materials and solutions are protected. The website and forms do not guarantee access, response, engagement, results, financial returns or participation in opportunities.",
          },
        ],
      },
      privacy: {
        eyebrow: "Privacy Policy",
        title: "Privacy Policy — website, forms, WhatsApp, blog and private access",
        intro:
          "This Policy explains how PATROAI processes personal data through its public presence, forms, contact channels, blog and controlled private environments.",
        sections: [
          {
            title: "1. Controller and privacy channel",
            body:
              `${COMPANY}, Brazilian CNPJ ${CNPJ}, with registered office at ${ADDRESS}, acts as controller for personal data collected through its public and private channels. Privacy and personal data requests may be submitted to ${PRIVACY_EMAIL}. Institutional contact may be submitted to ${CONTACT_EMAIL}.`,
          },
          {
            title: "2. Data collected and purposes",
            body:
              "We may collect identification, contact, professional, business, qualification, message, technical and consent data to perform screening, fit analysis, institutional contact, relationship management, security, abuse prevention, authorized communications, legal compliance and administration of private access when approved.",
          },
          {
            title: "3. Legal bases, sharing and international transfers",
            body:
              "Legal bases may include consent, legitimate interest, preliminary procedures, legal/regulatory obligations and exercise of rights. Data may be processed by infrastructure, security, analytics, communication, storage and AI providers, including providers located outside Brazil, with appropriate safeguards under applicable law.",
          },
          {
            title: "4. Retention, rights and security",
            body:
              "Data is retained for the period necessary for the informed purposes, legal obligations, rights preservation, audit and security. Data subjects may request access, correction, deletion where applicable, information about sharing and withdrawal of consent. We adopt reasonable technical and organizational security measures.",
          },
          {
            title: "5. WhatsApp and sensitive data",
            body:
              "By contacting us through WhatsApp, you authorize PATROAI to respond to your request and process your contact data and message for institutional service. Avoid sending sensitive data, confidential documents or third-party information without authorization.",
          },
        ],
      },
      cookies: {
        eyebrow: "Cookie Policy",
        title: "Cookie Policy",
        intro:
          "This Policy explains the use of cookies and similar technologies on Grupo Patroai’s public page.",
        sections: [
          {
            title: "1. What cookies are",
            body:
              "Cookies are small files or identifiers stored on a user’s device to enable technical operation, security, preferences, statistics, experience improvement and, where applicable, institutional communications.",
          },
          {
            title: "2. Categories and preferences",
            body:
              "We may use necessary, preference, analytics and, if enabled in the future, marketing cookies. Non-essential cookies should respect applicable preferences and consents. You may control cookies through your browser and available site controls.",
          },
        ],
      },
    },
  },
};

function detectPage(pathname) {
  if (pathname.includes("privacy") || pathname.includes("privacidade")) return "privacy";
  if (pathname.includes("cookies")) return "cookies";
  return "terms";
}

export default function PatroaiLegal() {
  usePatroaiSeo();
  const location = useLocation();
  const isEnglish = location.pathname.startsWith("/en/");
  const locale = isEnglish ? "en" : "pt";
  const copy = CONTENT[locale];
  const pageKey = detectPage(location.pathname);
  const page = copy.pages[pageKey];

  return (
    <main className="min-h-screen bg-[#060813] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to={isEnglish ? "/en" : "/"} className="rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/72 hover:text-white">
            ← {copy.back}
          </Link>
          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.26em] text-white">{copy.brand}</div>
            <div className="mt-1 text-xs text-white/45">{copy.pillars}</div>
          </div>
        </div>

        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 md:p-10">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/70">{page.eyebrow}</div>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-6xl">{page.title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-white/66">{page.intro}</p>
          <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-semibold leading-7 text-emerald-50/82">
            {isEnglish ? "Operational rule: registration is not access. Registration is qualification." : "Regra operacional: cadastro não é acesso. Cadastro é qualificação."}
          </div>

          <div className="mt-10 space-y-5">
            {page.sections.map((section) => (
              <article key={section.title} className="rounded-3xl border border-white/10 bg-black/18 p-5">
                <h2 className="text-xl font-black text-white">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/66">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-white/45">
            {isEnglish
              ? `Version: ${VERSION}. This English text is provided for convenience and should be interpreted consistently with Brazilian law and the Portuguese operational documents. Contact: ${CONTACT_EMAIL}. Privacy: ${PRIVACY_EMAIL}.`
              : `Versão: ${VERSION}. Esta página resume a camada jurídica operacional da PATROAI para publicação controlada. Contato: ${CONTACT_EMAIL}. Privacidade: ${PRIVACY_EMAIL}.`}
          </div>
        </section>
      </div>
    </main>
  );
}
