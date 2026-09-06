import React, { useState } from 'react';
import { Mail, ShieldAlert, Users, RotateCcw, FileText, CheckCircle2, Clock, Send, X, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminAutomationsPage: React.FC = () => {
  const { showToast } = useToast();

  const [policyDrafts, setPolicyDrafts] = useState<any[]>([
    {
      id: 'draft-1',
      bookingReference: 'SK-7819B',
      passenger: 'Farhan Ali (farhan@example.com)',
      fareType: 'BASIC FARE (Non-refundable)',
      question: 'My meeting got rescheduled, can I get a full cash refund on my ticket?',
      retrievedContext: 'Rule #4.1: Basic Fares are non-refundable. Voluntary cancellation yields 0% cash refund and no travel credits unless flight is cancelled by airline.',
      generatedDraft: 'Dear Farhan, Thank you for reaching out to SkyFlow Support. Under our published Fare Rules, tickets purchased under the Basic Fare category are strictly non-refundable for voluntary passenger changes. We regret that we are unable to process a cash refund for your flight.',
      status: 'Awaiting Human Approval',
    },
  ]);

  const [draftEdits, setDraftEdits] = useState<{ [key: string]: string }>({});

  const automations = [
    {
      name: 'Check-in Reminders',
      purpose: 'Automatically dispatches boarding passes and web check-in links 24 hours before flight departure.',
      status: 'Configured & Active',
      frequency: 'Hourly Cron Trigger',
      icon: Mail,
      color: 'text-primary',
    },
    {
      name: 'Daily Flight Operations Summary',
      purpose: 'Compiles scheduled flights, total revenue, and occupancy percentages into morning executive briefings.',
      status: 'Configured & Active',
      frequency: 'Daily at 06:00 UTC',
      icon: FileText,
      color: 'text-success',
    },
    {
      name: 'Automated Refund Escalation',
      purpose: 'Calculates escalation risk score for cancellations and alerts Operations for refund approvals over $500.',
      status: 'Configured & Active',
      frequency: 'Event-driven Webhook',
      icon: RotateCcw,
      color: 'text-warning',
    },
    {
      name: 'Waitlist Promotion Engine',
      purpose: 'Monitors cancellations in real-time, finds highest priority waitlist passenger, and issues 2-hour claim hold.',
      status: 'Configured & Active',
      frequency: 'Event-driven on Seat Release',
      icon: Users,
      color: 'text-info',
    },
    {
      name: 'Customer Policy RAG Assistant',
      purpose: 'Retrieves fare rules from pgvector knowledge base and prepares human-in-the-loop response drafts.',
      status: 'Configured & Active',
      frequency: 'Incoming Support Email Trigger',
      icon: Sparkles,
      color: 'text-purple-600',
    },
    {
      name: 'Fraud & Velocity Review',
      purpose: 'Flags anomalous multiple-hold bookings or rapid card retries for security inspection.',
      status: 'Configured & Active',
      frequency: 'Transaction Interceptor',
      icon: ShieldAlert,
      color: 'text-danger',
    },
  ];

  const handleApproveDraft = (draftId: string) => {
    setPolicyDrafts((prev) => prev.filter((d) => d.id !== draftId));
    showToast('success', 'Policy response approved and dispatched to passenger via Gmail integration.');
  };

  const handleRejectDraft = (draftId: string) => {
    setPolicyDrafts((prev) => prev.filter((d) => d.id !== draftId));
    showToast('info', 'Draft rejected. Manual operator intervention logged.');
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-navy tracking-tight">Automation Engine & Workflows</h1>
        <p className="text-xs text-muted">
          n8n automation pipelines, background workers, and Human-In-The-Loop policy approval gateways
        </p>
      </div>

      {/* Grid of Automation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {automations.map((auto) => {
          const Icon = auto.icon;
          return (
            <div
              key={auto.name}
              className="bg-surface rounded-card border border-brandBorder shadow-card p-5 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg bg-surface-soft flex items-center justify-center ${auto.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-success border border-success/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  <span>{auto.status}</span>
                </span>
              </div>

              <div>
                <h3 className="font-bold text-navy text-sm">{auto.name}</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">{auto.purpose}</p>
              </div>

              <div className="pt-2 border-t border-brandBorder/60 flex items-center gap-1.5 text-[11px] text-muted font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{auto.frequency}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Human-in-the-Loop Policy Draft Approvals */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brandBorder/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
                RAG Customer Policy Approval Queue
              </h2>
              <p className="text-xs text-muted">
                AI retrieves exact fare contracts from pgvector; requires human approval before sending via Gmail.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-surface-soft text-navy text-xs font-bold rounded-lg border border-brandBorder">
            {policyDrafts.length} Draft(s) Pending
          </span>
        </div>

        {policyDrafts.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted space-y-1">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
            <p className="font-medium text-navy">All policy drafts have been processed.</p>
            <p className="text-[11px]">Policy drafts are processed through the n8n approval email workflow.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {policyDrafts.map((draft) => (
              <div
                key={draft.id}
                className="p-5 bg-surface-soft rounded-card border border-brandBorder/80 space-y-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-navy bg-surface px-2.5 py-1 rounded border border-brandBorder">
                      {draft.bookingReference}
                    </span>
                    <span className="font-semibold text-navy">{draft.passenger}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-warning">
                    {draft.fareType}
                  </span>
                </div>

                <div className="p-3 bg-surface rounded-lg border border-brandBorder/60 space-y-1">
                  <span className="font-bold text-navy block text-[11px]">Customer Inquiry:</span>
                  <p className="text-brandText italic">"{draft.question}"</p>
                </div>

                <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 space-y-1 text-sky-900">
                  <span className="font-bold block text-[11px]">Retrieved Policy Context (pgvector):</span>
                  <p className="text-[11px] font-mono">{draft.retrievedContext}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-navy block text-[11px]">Generated Response Draft (Editable):</span>
                  <textarea
                    rows={4}
                    defaultValue={draft.generatedDraft}
                    onChange={(e) =>
                      setDraftEdits({ ...draftEdits, [draft.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-brandBorder/60">
                  <button
                    type="button"
                    onClick={() => handleRejectDraft(draft.id)}
                    className="px-4 py-2 bg-surface hover:bg-danger/10 text-danger text-xs font-semibold rounded-lg border border-brandBorder transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject & Dismiss</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApproveDraft(draft.id)}
                    className="px-5 py-2 bg-success hover:bg-success/90 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Approve & Send via Gmail</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
