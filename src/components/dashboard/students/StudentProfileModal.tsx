"use client";

import { useState, useTransition } from "react";
import { X, User, Phone, MapPin, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { updateStudentDetails, updateStudentStatus } from "@/app/actions/students";

interface StudentProfileModalProps {
  enrollment: any;
  mode: "view" | "edit";
  onClose: () => void;
  onUpdate: (updatedEnrollment: any) => void;
}

export default function StudentProfileModal({
  enrollment,
  mode,
  onClose,
  onUpdate,
}: StudentProfileModalProps) {
  const [isPending, startTransition] = useTransition();

  // State for editable fields
  const [studentName, setStudentName] = useState(enrollment.student.user.name || "");
  const [studentPhone, setStudentPhone] = useState(enrollment.student.user.phone || "");
  const [status, setStatus] = useState(enrollment.status);
  const [statusReason, setStatusReason] = useState(enrollment.statusReason || "");

  const handleSave = () => {
    startTransition(async () => {
      // 1. Update Core details
      const detailsRes = await updateStudentDetails(
        enrollment.student.id,
        enrollment.student.user.id,
        {
          name: studentName,
          phone: studentPhone,
        }
      );

      if (!detailsRes.success) {
        toast.add({ title: "Error", description: detailsRes.error, type: "error" });
        return;
      }

      // 2. Update Status if changed
      if (status !== enrollment.status) {
        const statusRes = await updateStudentStatus(enrollment.id, status, statusReason);
        if (!statusRes.success) {
          toast.add({ title: "Error", description: statusRes.error, type: "error" });
          return;
        }
      }

      toast.add({ title: "Success", description: "Student updated successfully", type: "success" });
      onUpdate({
        ...enrollment,
        status,
        statusReason,
        student: {
          ...enrollment.student,
          user: {
            ...enrollment.student.user,
            name: studentName,
            phone: studentPhone,
          },
        },
      });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {mode === "edit" ? "Edit Student Profile" : "Student Profile"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Roll No. {enrollment.rollNumber} | {enrollment.class.name} - {enrollment.class.section}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Student Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  disabled={mode === "view"}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <Input
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  disabled={mode === "view"}
                  placeholder="Optional"
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email (Login ID)</label>
                <Input
                  value={enrollment.student.user.email}
                  disabled
                  className="bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                {mode === "edit" ? (
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="CURRENT">Current</option>
                    <option value="ALUMNI">Alumni</option>
                    <option value="DROPOUT">Dropout</option>
                    <option value="EXPELLED">Expelled</option>
                  </select>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-800 dark:bg-slate-800">
                    {status}
                  </div>
                )}
              </div>
            </div>
            {mode === "edit" && status !== "CURRENT" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status Reason</label>
                <Input
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Reason for changing status"
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}
          </div>

          {/* Section 2: Parent Info */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Parent Information
              {mode === "edit" && (
                <span className="text-xs font-normal text-slate-400 lowercase">(Read-only here)</span>
              )}
            </h3>
            {enrollment.student.parent ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Parent Name</label>
                  <Input
                    value={enrollment.student.parent.user.name}
                    disabled
                    className="bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Parent Phone</label>
                  <Input
                    value={enrollment.student.parent.user.phone || ""}
                    disabled
                    className="bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm text-slate-500 border border-slate-200 dark:border-slate-800">
                No parent profile linked to this student.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {mode === "edit" && (
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
