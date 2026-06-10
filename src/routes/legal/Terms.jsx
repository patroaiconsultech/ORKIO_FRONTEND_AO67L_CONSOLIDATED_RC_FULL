import React from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Sobre a plataforma",
    body:
      "Orkio é uma plataforma de agentes de inteligência artificial, automação assistida, organização de informações e apoio operacional. Durante a fase de testes, funcionalidades podem ser ajustadas, limitadas, expandidas ou temporariamente suspensas para garantir segurança, estabilidade e evolução controlada.",
  },
  {
    title: "2. Aceitação dos termos",
    body:
      "Ao utilizar a plataforma, o usuário declara estar ciente destes Termos de Uso e concorda em utilizar os recursos de forma responsável, ética e compatível com as regras de segurança, privacidade e governança da plataforma.",
  },
  {
    title: "3. Uso responsável",
    body:
      "O usuário se compromete a não utilizar a plataforma para atividades ilegais, abusivas, fraudulentas, discriminatórias, invasivas ou que violem direitos de terceiros. Também não deve tentar contornar limites técnicos, regras de aprovação, controles de segurança ou mecanismos de governança.",
  },
  {
    title: "4. Agentes de inteligência artificial",
    body:
      "As respostas geradas por agentes de IA podem conter imprecisões, limitações ou interpretações incompletas. Informações importantes devem ser revisadas pelo usuário antes de qualquer decisão operacional, jurídica, financeira, médica, técnica ou estratégica.",
  },
  {
    title: "5. Execuções, patches e governança",
    body:
      "A plataforma pode apresentar recursos de auditoria, planejamento, proposta de patch e simulação operacional. Qualquer execução real, escrita em repositório, criação de branch, abertura de PR, deploy ou alteração de ambiente depende de aprovação explícita e fluxo governado. Mensagens simples no chat não autorizam execução real.",
  },
  {
    title: "6. Dados, arquivos e privacidade",
    body:
      "O usuário deve enviar apenas informações e documentos que tenha direito de compartilhar. A plataforma poderá processar conteúdos enviados para permitir análise, organização, respostas contextuais e funcionamento dos agentes. Dados sensíveis devem ser tratados com cautela.",
  },
  {
    title: "7. Ambiente de testes",
    body:
      "Durante a fase de testes, podem ocorrer instabilidades, indisponibilidades, ajustes de interface, alterações de comportamento dos agentes e mudanças em funcionalidades. O objetivo é melhorar continuamente a experiência, a segurança e a confiabilidade da plataforma.",
  },
  {
    title: "8. Limitação de responsabilidade",
    body:
      "Orkio é uma ferramenta de apoio e não substitui análise profissional especializada. O usuário é responsável por revisar informações, validar resultados e decidir como utilizar as respostas e recursos oferecidos pela plataforma.",
  },
  {
    title: "9. Atualizações dos termos",
    body:
      "Estes Termos de Uso são provisórios e poderão ser substituídos por uma versão jurídica oficial. A continuidade de uso da plataforma após atualizações poderá representar concordância com a nova versão.",
  },
  {
    title: "10. Contato",
    body:
      "Dúvidas, solicitações ou apontamentos sobre estes Termos de Uso podem ser encaminhados aos administradores da plataforma.",
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#070910] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-[-12%] top-[8%] h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-white/55 transition hover:text-white"
        >
          &larr; Voltar
        </Link>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
          <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            Versão provisória para testes — Maio/2026
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-6xl">
            Termos de Uso
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-white/72 sm:text-lg">
            Condições gerais para uso responsável da plataformOrkio em ambiente de testes controlados.
          </p>

          <p className="mt-5 text-sm leading-6 text-white/45">
            Este documento é uma versão operacional provisória e poderá ser substituído por versão jurídica oficial.
          </p>
        </section>

        <section className="mt-5 grid gap-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <h2 className="text-lg font-bold tracking-tight text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/72">
                {section.body}
              </p>
            </article>
          ))}
        </section>

        <footer className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/55">
          <strong className="text-white/85">Orkio</strong> — Plataforma em evolução controlada e auditável.
          Uso permitido apenas mediante responsabilidade, segurança e respeito à governança.
        </footer>
      </main>
    </div>
  );
}
