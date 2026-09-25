"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { X, Calendar as CalendarIcon, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";

import { createSchedule, updateSchedule, deleteSchedule, createMultiDaySchedule } from "@/app/actions/calendar";
import { ScheduleType } from "@prisma/client";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.nativeEnum(ScheduleType),
  date: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormModalProps {
  schoolId: string;
  initialData?: any;
  prefillDate?: Date | null;
  onClose: () => void;
  onSaved: (data: any) => void;
  onMultiSaved: (count: number) => void;
  onDeleted: (id: string) => void;
}

export default function EventFormModal({
  schoolId,
  initialData,
  prefillDate,
  onClose,
  onSaved,
  onMultiSaved,
  onDeleted,
}: EventFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isMultiDay, setIsMultiDay] = useState(false);
  const isEditing = !!initialData;

  const defaultDate = initialData 
    ? new Date(initialData.date).toISOString().split('T')[0]
    : prefillDate 
      ? format(prefillDate, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData?.title || "",
      type: initialData?.type || "EVENT",
      date: defaultDate,
      description: initialData?.description || "",
    },
  });

  const typeValue = watch("type");

  const onSubmit = (data: EventFormValues) => {
    startTransition(async () => {
      if (isMultiDay && data.endDate && !isEditing) {
        // Multi-day bulk create
        const res = await createMultiDaySchedule(schoolId, data, data.endDate);
        if (res.success) {
          toast.add({ title: "Success", description: `Created ${res.count} events`, type: "success" });
          onMultiSaved(res.count || 0);
          onClose();
        } else {
          toast.add({ title: "Error", description: res.error, type: "error" });
        }
        return;
      }

      if (isEditing) {
        const res = await updateSchedule(initialData.id, schoolId, data);
        if (res.success) {
          toast.add({ title: "Success", description: "Event updated", type: "success" });
          onSaved(res.data);
          onClose();
        } else {
          toast.add({ title: "Error", description: res.error, type: "error" });
        }
      } else {
        const res = await createSchedule(schoolId, data);
        if (res.success) {
          toast.add({ title: "Success", description: "Event created", type: "success" });
          onSaved(res.data);
          onClose();
        } else {
          toast.add({ title: "Error", description: res.error, type: "error" });
        }
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    startTransition(async () => {
      const res = await deleteSchedule(initialData.id, schoolId);
      if (res.success) {
        toast.add({ title: "Success", description: "Event deleted", type: "success" });
        onDeleted(initialData.id);
        onClose();
      } else {
        toast.add({ title: "Error", description: res.error, type: "error" });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            {isEditing ? "Edit Event" : "Add Event"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <Input 
              {...register("title")} 
              placeholder="e.g. Annual Sports Day" 
              className="mt-1"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Event Type</label>
              <Select value={typeValue} onValueChange={(v) => setValue("type", v as ScheduleType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="HOLIDAY">Holiday</SelectItem>
                  <SelectItem value="EXAM">Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
              <Input 
                type="date"
                {...register("date")}
                className="mt-1"
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <Checkbox 
                id="multiday" 
                checked={isMultiDay}
                onCheckedChange={(c) => setIsMultiDay(c as boolean)}
              />
              <label
                htmlFor="multiday"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700 dark:text-slate-300"
              >
                This is a multi-day event
              </label>
            </div>
          )}

          {isMultiDay && !isEditing && (
            <div className="animate-in slide-in-from-top-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
              <Input 
                type="date"
                {...register("endDate")}
                className="mt-1"
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
              <p className="text-xs text-slate-500 mt-1">Events will be created for every day between start and end date.</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description (Optional)</label>
            <Textarea 
              {...register("description")} 
              placeholder="Add any extra details, time, or location..."
              className="mt-1 resize-none h-20"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
            {isEditing ? (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </Button>
            ) : (
              <div></div> // Spacer
            )}
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isEditing ? "Save Changes" : "Save Event"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
