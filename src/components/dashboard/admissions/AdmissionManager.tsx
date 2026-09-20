"use client";

import { useState, useTransition } from "react";
import {
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileText,
  Filter,
  QrCode,
  Upload,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  rejectAdmission,
} from "@/app/actions/admissions";
import ApproveAdmitModal from "./ApproveAdmitModal";
import ManualEntryModal from "./ManualEntryModal";
import BulkImportModal from "./BulkImportModal";
import QrModal from "./QrModal";

interface AdmissionManagerProps {
  schoolId: string;
  initialEnquiries: any[];
  classes: any[];
}

type TabType = "APPLIED" | "ADMITTED" | "REJECTED" | "ALL";

export default function AdmissionManager({
  schoolId,
  initialEnquiries,
  classes,
}: AdmissionManagerProps) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("APPLIED");
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter logic
  const filtered = enquiries.filter((e: any) => {
    const matchesSearch =
      (e.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.parentName || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.parentPhone || "").includes(search);

    const matchesTab = activeTab === "ALL" || e.status === activeTab;

    return matchesSearch && matchesTab;
  });

  // Stats
  const stats = {
    applied: enquiries.filter((e: any) => e.status === "APPLIED").length,
    admitted: enquiries.filter((e: any) => e.status === "ADMITTED").length,
    rejected: enquiries.filter((e: any) => e.status === "REJECTED").length,
    total: enquiries.length,
  };

  function handleReject(enquiryId: string) {
    if (!confirm("Are you sure you want to reject this application?")) return;
    startTransition(async () => {
      const res = await rejectAdmission(enquiryId, "Rejected by admin.");
      if (res.success) {
        setEnquiries((prev: any[]) =>
          prev.map((e: any) => (e.id === enquiryId ? { ...e, status: "REJECTED" } : e))
        );
        toast.add({ title: "Application Rejected", type: "success" });
      } else {
        toast.add({ title: "Error", description: res.error || "Failed to reject.", type: "error" });
      }
    });
  }

  function handleApproveClick(enquiry: any) {
    setSelectedEnquiry(enquiry);
    setShowApproveModal(true);
  }

  function handleAdmitSuccess(enquiryId: string) {
    setEnquiries((prev: any[]) =>
      prev.map((e: any) => (e.id === enquiryId ? { ...e, status: "ADMITTED" } : e))
    );
    setShowApproveModal(false);
    setSelectedEnquiry(null);
  }

  const tabs: { label: string; value: TabType; icon: React.ElementType; count: number; color: string }[] = [
    { label: "Pending", value: "APPLIED", icon: Clock, count: stats.applied, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30" },
    { label: "Admitted", value: "ADMITTED", icon: CheckCircle2, count: stats.admitted, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" },
    { label: "Rejected", value: "REJECTED", icon: XCircle, count: stats.rejected, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30" },
    { label: "All", value: "ALL", icon: Users, count: stats.total, color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/30" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                isActive
                  ? `${tab.color} ring-2 ring-offset-2 ring-current shadow-lg scale-[1.02]`
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${isActive ? "" : "text-slate-400"}`} />
                <span className={`text-2xl font-bold ${isActive ? "" : "text-slate-900 dark:text-white"}`}>
                  {tab.count}
                </span>
              </div>
              <p className={`text-sm font-medium mt-2 ${isActive ? "" : "text-slate-500"}`}>
                {tab.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowBulkModal(true)}>
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowQrModal(true)}>
            <QrCode className="w-4 h-4" />
            Show QR Code
          </Button>
          <Button className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setShowManualModal(true)}>
            <Plus className="w-4 h-4" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Enquiries List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/60 dark:border-slate-800">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Applications Found</h3>
            <p className="text-slate-500 mt-1">
              {activeTab === "APPLIED"
                ? "No pending applications. Share your QR code to receive applications!"
                : "No records match your search."}
            </p>
          </Card>
        ) : (
          filtered.map((enquiry: any) => (
            <EnquiryCard
              key={enquiry.id}
              enquiry={enquiry}
              onApprove={() => handleApproveClick(enquiry)}
              onReject={() => handleReject(enquiry.id)}
              isPending={isPending}
            />
          ))
        )}
      </div>

      {showApproveModal && selectedEnquiry && (
        <ApproveAdmitModal
          enquiry={selectedEnquiry}
          schoolId={schoolId}
          classes={classes}
          onClose={() => setShowApproveModal(false)}
          onSuccess={(id) => {
            setShowApproveModal(false);
            setEnquiries((prev) =>
              prev.map((e) => (e.id === id ? { ...e, status: "ADMITTED" } : e))
            );
          }}
        />
      )}

      {showManualModal && (
        <ManualEntryModal
          schoolId={schoolId}
          onClose={() => setShowManualModal(false)}
          onSuccess={(newEnquiry) => {
            setShowManualModal(false);
            setEnquiries((prev) => [newEnquiry, ...prev]);
            setActiveTab("APPLIED");
          }}
        />
      )}

      {showBulkModal && (
        <BulkImportModal
          schoolId={schoolId}
          classes={classes}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            // In a real scenario, we might want to refetch stats, but for now we can just show success.
            // A full page refresh or revalidation will update the admitted counts.
            window.location.reload();
          }}
        />
      )}

      {showQrModal && (
        <QrModal
          schoolName="RL Academy" // Could pass from DB or session, but using static for demo
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Sub-component: Individual Enquiry Card
// ─────────────────────────────────────────
function EnquiryCard({
  enquiry,
  onApprove,
  onReject,
  isPending,
}: {
  enquiry: any;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    APPLIED: { label: "Pending Review", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock },
    ENQUIRY: { label: "Enquiry", color: "text-blue-700 bg-blue-50 border-blue-200", icon: Eye },
    ADMITTED: { label: "Admitted", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
  };

  const status = statusConfig[enquiry.status] || statusConfig.APPLIED;
  const StatusIcon = status.icon;

  const sourceLabel: Record<string, string> = {
    QR_CODE: "QR Scan",
    MANUAL: "Manual Entry",
    BULK_IMPORT: "Bulk Import",
  };

  return (
    <Card className="p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/60 dark:border-slate-800 hover:shadow-lg transition-all duration-200 group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Student Info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-indigo-600">
              {(enquiry.studentName || "?")[0].toUpperCase()}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {enquiry.studentName}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${status.color}`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
              <span>Class: <span className="font-medium text-slate-700 dark:text-slate-300">{enquiry.appliedForClass}</span></span>
              <span className="text-slate-300">•</span>
              <span>Parent: {enquiry.parentName}</span>
              <span className="text-slate-300">•</span>
              <span>{enquiry.parentPhone}</span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                {sourceLabel[enquiry.source] || enquiry.source}
              </span>
              <span>
                {new Date(enquiry.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {enquiry.documentsPending && (
                <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-xs">
                  📎 Docs Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        {enquiry.status === "APPLIED" && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              disabled={isPending}
              className="gap-1.5 rounded-lg text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isPending}
              className="gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve & Admit
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
