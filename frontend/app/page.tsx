"use client";

import { Navbar } from "@/components/Navbar";
import { AgreementsTable } from "@/components/AgreementsTable";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main Content - Padding to account for fixed navbar */}
      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              On-Chain Dispute Arbitration
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Record an agreement in plain English. If either side disputes it, validators read the evidence and reach a binding, consensus verdict.
            </p>
          </div>

          {/* Agreements Table */}
          <div className="animate-slide-up">
            <AgreementsTable />
          </div>

          {/* Info Section */}
          <div className="mt-8 glass-card p-6 md:p-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <h2 className="text-2xl font-bold mb-4">How it Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">1. Create an Agreement</div>
                <p className="text-sm text-muted-foreground">
                  Connect your wallet and record the terms of an agreement with the other party&apos;s address and the amount at stake.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">2. Raise a Dispute</div>
                <p className="text-sm text-muted-foreground">
                  Either party can dispute the agreement and submit evidence — free text, or a URL validators will fetch and read.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">3. Get a Verdict</div>
                <p className="text-sm text-muted-foreground">
                  Validators judge the evidence against the terms and reach a binding verdict through GenLayer&apos;s consensus, not one node&apos;s opinion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-2">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Powered by GenLayer
              </a>
              <a
                href="https://studio.genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Studio
              </a>
              <a
                href="https://docs.genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Docs
              </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
