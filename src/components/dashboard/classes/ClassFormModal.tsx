"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClass, updateClass } from "@/app/actions/classes";

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: any | null;
  schoolId: string;
  sessions: any[];
  onSuccess: (data: any) => void;
}

export default function ClassFormModal({ isOpen, onClose, initialData, schoolId, sessions, onSuccess }: ClassFormModalProps) {
  const [formData, setFormData] = useState({ name: "", section: "", sessionId: sessions?.[0]?.id || "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData;

  const activeSession = sessions?.find(s => s.isActive);
  const defaultSessionId = activeSession ? activeSession.id : (sessions?.[0]?.id || "");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          section: initialData.section,
          sessionId: initialData.sessionId,
        });
      } else {
        setFormData({ name: "", section: "", sessionId: defaultSessionId });
      }
      setError(null);
    }
  }, [isOpen, initialData, defaultSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!formData.name.trim() || !formData.section.trim()) {
      setError("Name and Section are required.");
      setIsLoading(false);
      return;
    }

    try {
      let res;
      if (isEditing) {
        res = await updateClass(schoolId, initialData.id, formData);
      } else {
        res = await createClass(schoolId, formData);
      }

      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        onSuccess(res.data);
        onClose();
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
          <DialogTitle>{isEditing ? "Edit Class" : "Add New Class"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify class details below." : "Enter the details for the new class."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Select value={formData.name} onValueChange={(val) => setFormData({ ...formData, name: val || "" })} required>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nursery">Nursery</SelectItem>
                <SelectItem value="LKG">LKG</SelectItem>
                <SelectItem value="UKG">UKG</SelectItem>
                <SelectItem value="1st">1st</SelectItem>
                <SelectItem value="2nd">2nd</SelectItem>
                <SelectItem value="3rd">3rd</SelectItem>
                <SelectItem value="4th">4th</SelectItem>
                <SelectItem value="5th">5th</SelectItem>
                <SelectItem value="6th">6th</SelectItem>
                <SelectItem value="7th">7th</SelectItem>
                <SelectItem value="8th">8th</SelectItem>
                <SelectItem value="9th">9th</SelectItem>
                <SelectItem value="10th">10th</SelectItem>
                <SelectItem value="11th - Science">11th - Science</SelectItem>
                <SelectItem value="11th - Commerce">11th - Commerce</SelectItem>
                <SelectItem value="11th - Arts">11th - Arts</SelectItem>
                <SelectItem value="12th - Science">12th - Science</SelectItem>
                <SelectItem value="12th - Commerce">12th - Commerce</SelectItem>
                <SelectItem value="12th - Arts">12th - Arts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Select value={formData.section} onValueChange={(val) => setFormData({ ...formData, section: val || "" })} required>
              <SelectTrigger>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem>
                <SelectItem value="Rose">Rose</SelectItem>
                <SelectItem value="Tulip">Tulip</SelectItem>
                <SelectItem value="Lotus">Lotus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Academic Session</Label>
            <Input 
              value={
                sessions?.find(s => s.id === formData.sessionId)
                  ? `${sessions.find(s => s.id === formData.sessionId)?.name} ${sessions.find(s => s.id === formData.sessionId)?.isActive ? "(Active)" : ""}`
                  : "Loading..."
              }
              disabled
              className="bg-slate-50 opacity-100 text-slate-600 cursor-not-allowed font-medium"
            />
            <p className="text-xs text-muted-foreground mt-1 text-blue-600">
              * {isEditing ? "Session cannot be changed after a class is created." : "Classes are automatically assigned to the currently active session."}
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Add Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
