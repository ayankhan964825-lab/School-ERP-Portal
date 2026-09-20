"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  User,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  suggestSectionAndRoll,
  approveAndAdmit,
  updateAdmissionEnquiry,
} from "@/app/actions/admissions";

interface ApproveAdmitModalProps {
  enquiry: any;
  schoolId: string;
  classes: any[];
  onClose: () => void;
  onSuccess: (enquiryId: string) => void;
}

// Document checklist items
const DOCUMENT_CHECKLIST = [
  { key: "tc", label: "Transfer Certificate (TC)" },
  { key: "marksheet", label: "Previous Marksheet" },
  { key: "photo", label: "Passport Photo" },
  { key: "aadhar", label: "Aadhar Card" },
  { key: "birth_cert", label: "Birth Certificate" },
];

export default function ApproveAdmitModal({
  enquiry,
  schoolId,
  classes,
  onClose,
  onSuccess,
}: ApproveAdmitModalProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1); // 1 = Details, 2 = Assignment, 3 = Confirm

  // Step 1: Editable student details
  const [studentName, setStudentName] = useState(enquiry.studentName || "");
  const [parentName, setParentName] = useState(enquiry.parentName || "");
  const [parentPhone, setParentPhone] = useState(enquiry.parentPhone || "");
  const [parentEmail, setParentEmail] = useState(enquiry.parentEmail || "");
  const [previousSchool, setPreviousSchool] = useState(enquiry.previousSchool || "");
  const [notes, setNotes] = useState(enquiry.notes || "");

  // Document tracker
  const [docChecklist, setDocChecklist] = useState<Record<string, boolean>>({
    tc: false,
    marksheet: false,
    photo: false,
    aadhar: false,
    birth_cert: false,
  });

  // Step 2: Section & Roll (Smart Suggest)
  const [suggestion, setSuggestion] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [rollNumber, setRollNumber] = useState(1);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Fetch Smart Suggestion when entering step 2
  useEffect(() => {
    if (step === 2) {
      setSuggestLoading(true);
      suggestSectionAndRoll(schoolId, enquiry.appliedForClass).then((res) => {
        if (res.success) {
          setSuggestion(res.data);
          if (res.data.classId) {
            setSelectedClassId(res.data.classId);
          }
          setRollNumber(res.data.suggestedRollNo);
        }
        setSuggestLoading(false);
      });
    }
  }, [step, schoolId, enquiry.appliedForClass]);

  const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const getBase = (str: string) => str.split(/[\s-(]+/)[0].toLowerCase();

  let matchingClasses = classes.filter(
    (cls: any) => normalize(cls.name) === normalize(enquiry.appliedForClass)
  );

  if (matchingClasses.length === 0) {
    matchingClasses = classes.filter(
      (cls: any) => getBase(cls.name) === getBase(enquiry.appliedForClass)
    );
  }

  function handleDocToggle(key: string) {
    setDocChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleNextStep() {
    if (step === 1) {
      // Save interview details before moving to step 2
      startTransition(async () => {
        const pendingDocs = Object.values(docChecklist).some((v) => !v);
        await updateAdmissionEnquiry(enquiry.id, {
          studentName,
          parentName,
          parentPhone,
          parentEmail: parentEmail || undefined,
          previousSchool: previousSchool || undefined,
          notes: notes || undefined,
          documentsPending: pendingDocs,
        });
        setStep(2);
      });
    } else if (step === 2) {
      if (!selectedClassId) {
        toast.add({ title: "Error", description: "Please select a section.", type: "error" });
        return;
      }
      setStep(3);
    }
  }

  function handleFinalAdmit() {
    startTransition(async () => {
      const res = await approveAndAdmit(enquiry.id, {
        classId: selectedClassId,
        rollNumber,
        schoolId,
      });

      if (res.success) {
        toast.add({ title: "Success", description: res.message || "Student admitted successfully!", type: "success" });
        onSuccess(enquiry.id);
      } else {
        toast.add({ title: "Error", description: res.error || "Failed to admit student.", type: "error" });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {step === 1 && "Student Details & Documents"}
              {step === 2 && "Assign Section & Roll No"}
              {step === 3 && "Confirm Admission"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress */}
        <div className="flex gap-1 px-6 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {/* ──────── STEP 1: Details & Documents ──────── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Student Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Student Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Student Name
                    </label>
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      Applied For
                    </label>
                    <Input
                      value={enquiry.appliedForClass}
                      disabled
                      className="h-10 rounded-lg bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Previous School
                  </label>
                  <Input
                    value={previousSchool}
                    onChange={(e) => setPreviousSchool(e.target.value)}
                    placeholder="Enter previous school name (if any)"
                    className="h-10 rounded-lg"
                  />
                </div>
              </div>

              {/* Parent Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Parent / Guardian
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Parent Name
                    </label>
                    <Input
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Phone
                    </label>
                    <Input
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email <span className="text-xs text-slate-400">(Optional)</span>
                  </label>
                  <Input
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="h-10 rounded-lg"
                  />
                </div>
              </div>

              {/* Document Checklist */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Document Checklist
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOCUMENT_CHECKLIST.map((doc) => (
                    <button
                      key={doc.key}
                      type="button"
                      onClick={() => handleDocToggle(doc.key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        docChecklist[doc.key]
                          ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          docChecklist[doc.key]
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-slate-300"
                        }`}
                      >
                        {docChecklist[doc.key] && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          docChecklist[doc.key] ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {doc.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  ℹ️ Unchecked documents will be marked as &quot;Pending&quot;. Student can submit them later.
                </p>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Admin Notes <span className="text-xs text-slate-400">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any remarks about this admission..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ──────── STEP 2: Smart Section & Roll Assignment ──────── */}
          {step === 2 && (
            <div className="space-y-6">
              {suggestLoading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                  <p className="text-slate-500">Analyzing class capacity...</p>
                </div>
              ) : (
                <>
                  {/* Smart Suggestion Banner */}
                  {suggestion && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border-2 border-indigo-200 dark:border-indigo-500/30 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-indigo-900 dark:text-indigo-300">
                            Smart Suggestion
                          </h4>
                          <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
                            {suggestion.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Available Sections */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                      Select Section
                    </h3>

                    {suggestion?.availableSections?.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {suggestion.availableSections.map((sec: any) => (
                          <button
                            key={sec.classId}
                            type="button"
                            onClick={() => {
                              setSelectedClassId(sec.classId);
                              setRollNumber(sec.studentCount + 1);
                            }}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              selectedClassId === sec.classId
                                ? "bg-indigo-50 border-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500 ring-2 ring-indigo-200 shadow-lg"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                              {enquiry.appliedForClass} - {sec.section}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                              {sec.studentCount} / 40 students
                            </div>
                            {sec.studentCount >= 40 && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-2">
                                <AlertTriangle className="w-3 h-3" />
                                Full (Override possible)
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                        No sections found for {enquiry.appliedForClass}. Please create a class section first.
                      </div>
                    )}
                  </div>

                  {/* Roll Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Roll Number
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        value={rollNumber}
                        onChange={(e) => setRollNumber(parseInt(e.target.value) || 1)}
                        className="h-12 w-32 rounded-xl text-center text-lg font-bold"
                      />
                      <p className="text-sm text-slate-500">
                        Auto-suggested based on class strength.
                        You can change it manually.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────── STEP 3: Confirmation ──────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">
                    Ready to Admit
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-emerald-200/50">
                    <span className="text-emerald-700/70">Student Name</span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">{studentName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-200/50">
                    <span className="text-emerald-700/70">Parent</span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">{parentName} ({parentPhone})</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-200/50">
                    <span className="text-emerald-700/70">Class & Section</span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                      {enquiry.appliedForClass} -{" "}
                      {classes.find((c: any) => c.id === selectedClassId)?.section || "?"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-emerald-700/70">Roll Number</span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">#{rollNumber}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30 text-sm text-blue-700 dark:text-blue-400">
                <strong>What happens next:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>A Student login account will be created automatically.</li>
                  <li>A Parent login account will be created (or linked if already exists).</li>
                  <li>Student will appear in the class register immediately.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-900 rounded-b-2xl">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="rounded-xl"
              disabled={isPending}
            >
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={handleNextStep}
              disabled={isPending}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next Step →"}
            </Button>
          ) : (
            <Button
              onClick={handleFinalAdmit}
              disabled={isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Admit Student
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
