import React from 'react';
import { Link } from 'react-router-dom';
import HeroEntrance from '../components/motion/HeroEntrance';
import RedactionReveal from '../components/motion/RedactionReveal';
import Button from '../components/ui/Button';
import ContentCard from '../components/ui/ContentCard';
import PullQuote from '../components/ui/PullQuote';
import TextLinkButton from '../components/ui/TextLinkButton';
import capabilitiesData from '../content/capabilities.json';
import insightsData from '../content/insights.json';

export function Landing() {
  return (
    <div className="w-full">
      {/* SECTION 1: Full-Bleed Hero (Ink Section) */}
      <section
        className="section-ink relative flex items-center min-h-[90vh] py-24 sm:py-32"
        style={{
          backgroundColor: '#0A0A0A',
          color: '#FAF9F6'
        }}
      >
        <div className="container-wide w-full">
          <HeroEntrance
            headline="Judgment, applied with precision."
            subheadline="DocuGuard AI evaluates the contracts that define an enterprise's future — diligence, risk mitigation, autonomous negotiation, and governance."
          >
            <Button href="/contact" variant="primary">
              Speak with us
            </Button>
            <Button href="/capabilities" variant="ghost-light">
              View capabilities
            </Button>
          </HeroEntrance>
        </div>
      </section>

      {/* SECTION 2: Capabilities Overview (Paper) */}
      <section className="bg-paper py-24 sm:py-32 border-b border-rule">
        <div className="container-wide">
          <div className="max-w-2xl mb-16">
            <span className="font-body text-label text-ink-soft mb-2 block">
              Core Intelligence Engines
            </span>
            <h2 className="display-03 text-ink tracking-tight">
              Six capabilities. One enterprise standard.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
            {capabilitiesData.map((cap) => (
              <ContentCard
                key={cap.slug}
                href={`/capabilities/${cap.slug}`}
                title={cap.name}
                subtitle={cap.indexLine}
              />
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-rule">
            <TextLinkButton href="/capabilities">
              View all capabilities
            </TextLinkButton>
          </div>
        </div>
      </section>

      {/* SECTION 3: Statement with Signature Redaction-Reveal (Ink Section) */}
      <section
        className="section-ink py-28 sm:py-40 border-b border-neutral-800"
        style={{
          backgroundColor: '#0A0A0A',
          color: '#FAF9F6'
        }}
      >
        <div className="container-wide">
          <div className="max-w-4xl">
            <span className="font-body text-label text-neutral-400 mb-4 block">
              Statutory Surveillance
            </span>
            <div className="mb-6">
              <RedactionReveal barColor="#0A0A0A">
                <span className="display-01 text-paper font-medium block">
                  40+
                </span>
              </RedactionReveal>
            </div>
            <h3 className="font-display text-3xl sm:text-4xl text-paper font-medium leading-snug">
              compliance frameworks and statutory regimes monitored continuously across your portfolio.
            </h3>
            <p className="font-body text-body text-neutral-400 mt-6 max-w-2xl">
              From Delaware corporate precedent and UCC obligations to European Union GDPR Article 28 mandates, DocuGuard continuously validates contract terms against changing statutory baselines.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: Featured Diligence Matter (Paper) */}
      <section className="bg-paper py-24 sm:py-32 border-b border-rule">
        <div className="container-wide">
          <div className="max-w-4xl">
            <span className="font-body text-label text-ink-soft mb-4 block">
              Representative Matter
            </span>
            <PullQuote
              quote="Advised an enterprise manufacturer through an unannounced multi-jurisdiction contract audit, identifying 14 uncapped liability clauses before counterparty discovery."
              attribution="Cross-Border Commercial Diligence"
              subattribution="Mergers & Acquisitions • 2025"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: Recent Intelligence & Research (Paper-Dim) */}
      <section className="bg-paper-dim py-24 sm:py-32 border-b border-rule">
        <div className="container-wide">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-6">
            <div>
              <span className="font-body text-label text-ink-soft mb-2 block">
                Legal Engineering
              </span>
              <h2 className="display-03 text-ink tracking-tight">
                Recent thinking
              </h2>
            </div>
            <TextLinkButton href="/intelligence">
              All publications
            </TextLinkButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {insightsData.slice(0, 3).map((item) => (
              <ContentCard
                key={item.slug}
                href={`/intelligence/${item.slug}`}
                badge={item.category}
                title={item.title}
                subtitle={item.dek}
                meta={`${item.author} • ${item.date}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Closing Executive CTA (Ink Section) */}
      <section
        className="section-ink py-28 sm:py-36 text-center flex flex-col items-center justify-center"
        style={{
          backgroundColor: '#0A0A0A',
          color: '#FAF9F6'
        }}
      >
        <div className="container-text">
          <h2 className="display-02 text-paper tracking-tight mb-6">
            Let’s talk about what’s next.
          </h2>
          <p className="font-body text-body-lg text-neutral-400 mb-10 max-w-xl mx-auto">
            Schedule an executive briefing with our legal engineering group to examine how DocuGuard audits and governs complex contract portfolios.
          </p>
          <Button href="/contact" variant="primary">
            Speak with us
          </Button>
        </div>
      </section>
    </div>
  );
}

export default Landing;
