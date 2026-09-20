"use client";

import { useState, useTransition } from "react";
import {
  X,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import Papa from "papaparse";
import { bulkAdmitStudents } from "@/app/actions/admissions";

interface BulkImportModalProps {
  schoolId: string;
  classes: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({
  schoolId,
  classes,
  onClose,
  onSuccess,
}: BulkImportModalProps) {
  const [isPending, startTransition] = useTransition();
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template Download
  const downloadTemplate = () => {
    const headers = [
      "studentName",
      "dob (YYYY-MM-DD)",
      "gender (MALE/FEMALE)",
      "parentName",
      "parentPhone",
      "parentEmail",
      "classId",
      "rollNumber"
    ];
    
    // Sample row
    const sample = [
      "John Doe",
      "2010-05-15",
      "MALE",
      "Robert Doe",
      "9876543210",
      "robert@example.com",
      classes[0]?.id || "class-id-here",
      "1"
    ];

    const csvContent = "data:text/csv;charset=utf-8," + 
      headers.join(",") + "\n" + sample.join(",");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_admission_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        // Map back headers to keys we expect
        const mappedData = results.data.map((row: any) => ({
          studentName: row["studentName"] || "",
          dob: row["dob (YYYY-MM-DD)"] || "",
          gender: row["gender (MALE/FEMALE)"] || "MALE",
          parentName: row["parentName"] || "",
          parentPhone: row["parentPhone"] || "",
          parentEmail: row["parentEmail"] || "",
          classId: row["classId"] || "",
          rollNumber: parseInt(row["rollNumber"]) || 0,
        }));

        // Basic validation
        const invalidRow = mappedData.find(
          (r) => !r.studentName || !r.parentName || !r.parentPhone || !r.classId || !r.rollNumber || !r.dob
        );

        if (invalidRow) {
          setError("Some rows are missing required fields (Name, DOB, Parent Name, Phone, Class ID, Roll No). Please check your CSV.");
          return;
        }

        setParsedData(mappedData);
      },
      error: function (error) {
        setError(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  // Submit to backend
  const handleBulkAdmit = () => {
    if (!isConfirmed || parsedData.length === 0) return;

    startTransition(async () => {
      const res = await bulkAdmitStudents(schoolId, parsedData);
      
      if (res.error) {
        toast.add({ title: "Import Error", description: res.error, type: "error" });
      } else {
        toast.add({ 
          title: "Import Successful", 
          description: res.message || `${res.data?.admitted} students admitted.`, 
          type: "success" 
        });
        if (res.data?.errors && res.data.errors.length > 0) {
          console.warn("Bulk import errors:", res.data.errors);
          toast.add({ 
            title: "Partial Success", 
            description: `${res.data.errors.length} rows failed. Check console.`, 
            type: "error" 
          });
        }
        onSuccess();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Bulk Import Students
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Directly admit multiple students via CSV upload</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Step 1: Download & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">1. Download Template</h3>
                <p className="text-xs text-slate-500 mt-1">Get the required CSV format</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-2 rounded-lg">
                Download CSV
              </Button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800/50 relative">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">2. Upload Filled CSV</h3>
                <p className="text-xs text-slate-500 mt-1">Select your completed file</p>
              </div>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button size="sm" className="mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700">
                Browse File
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 2: Preview Table */}
          {parsedData.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Preview: {parsedData.length} Students found
                </h3>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-500">Student Name</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Parent Phone</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Class ID</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Roll No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {parsedData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.studentName}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.parentPhone}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{row.classId}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.rollNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 50 && (
                <div className="text-center p-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  Showing first 50 rows only. All {parsedData.length} will be imported.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          {parsedData.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
              />
              I confirm the preview data is correct
            </label>
          ) : (
            <div />
          )}

          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="rounded-lg flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAdmit}
              disabled={!isConfirmed || parsedData.length === 0 || isPending}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-2 flex-1 sm:flex-none"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Bulk Admit"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
