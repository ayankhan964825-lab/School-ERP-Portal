"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSession, editSessionName } from "@/app/actions/sessions";

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess: (data: any) => void;
  sessionToEdit?: any;
}

export default function SessionFormModal({ isOpen, onClose, schoolId, onSuccess, sessionToEdit }: SessionFormModalProps) {
  const [formData, setFormData] = useState({ name: "", startDate: "", endDate: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToEdit) {
      setFormData({
        name: sessionToEdit.name,
        startDate: new Date(sessionToEdit.startDate).toISOString().split('T')[0],
        endDate: new Date(sessionToEdit.endDate).toISOString().split('T')[0],
      });
    } else {
      setFormData({ name: "", startDate: "", endDate: "" });
    }
    setError(null);
  }, [sessionToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.name || !formData.startDate || !formData.endDate) {
      setError("All fields are required.");
      setIsLoading(false);
      return;
    }

    try {
      if (sessionToEdit) {
        const res = await editSessionName(schoolId, sessionToEdit.id, formData.name);
        if (res.error) {
          setError(res.error);
        } else if (res.success) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        const res = await createSession(schoolId, {
          name: formData.name,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
        });

        if (res.error) {
          setError(res.error);
        } else if (res.success) {
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{sessionToEdit ? "Edit Session Name" : "Create Academic Session"}</DialogTitle>
          <DialogDescription>
            {sessionToEdit ? "Update the name of the academic session." : "Add a new academic year or term."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Session Name (e.g. 2026-2027)</Label>
            <Input
              id="name"
              placeholder="2026-2027"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
              disabled={!!sessionToEdit} // Do not allow editing dates
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
              disabled={!!sessionToEdit} // Do not allow editing dates
            />
          </div>
          
          {sessionToEdit && (
            <p className="text-xs text-muted-foreground">
              * Dates cannot be modified for existing sessions to preserve data integrity.
            </p>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? "Saving..." : (sessionToEdit ? "Save Changes" : "Create Session")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
