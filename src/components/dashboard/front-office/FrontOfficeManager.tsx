"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MessageSquare, Plus, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { createVisitor, markVisitorOut, createCallLog, createComplaint, resolveComplaint } from "@/app/actions/frontOffice";

export default function FrontOfficeManager({ schoolId, visitors, calls, complaints }: any) {
  const [activeTab, setActiveTab] = useState("visitors");
  const [isVisitorModalOpen, setVisitorModalOpen] = useState(false);
  const [isCallModalOpen, setCallModalOpen] = useState(false);
  const [isComplaintModalOpen, setComplaintModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forms State
  const [visitorForm, setVisitorForm] = useState({ name: "", phone: "", purpose: "", whomToMeet: "" });
  const [callForm, setCallForm] = useState({ caller: "", phone: "", purpose: "", followUp: false });
  const [complaintForm, setComplaintForm] = useState({ complainant: "", phone: "", description: "" });

  const handleVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createVisitor(schoolId, visitorForm);
    setLoading(false);
    setVisitorModalOpen(false);
    setVisitorForm({ name: "", phone: "", purpose: "", whomToMeet: "" });
  };

  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createCallLog(schoolId, { ...callForm, date: new Date() });
    setLoading(false);
    setCallModalOpen(false);
    setCallForm({ caller: "", phone: "", purpose: "", followUp: false });
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createComplaint(schoolId, { ...complaintForm, date: new Date() });
    setLoading(false);
    setComplaintModalOpen(false);
    setComplaintForm({ complainant: "", phone: "", description: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Front Office CRM</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage visitors, incoming calls, and complaints.</p>
        </div>
        
        {/* Dynamic Action Button based on Active Tab */}
        <div>
          {activeTab === "visitors" && (
            <Dialog open={isVisitorModalOpen} onOpenChange={setVisitorModalOpen}>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow">
                <Plus className="w-4 h-4 mr-2" /> New Visitor
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Visitor Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleVisitorSubmit} className="space-y-4">
                  <div className="grid gap-2"><Label>Visitor Name</Label><Input required value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Phone Number</Label><Input required pattern="[0-9]{10}" title="10 digit phone number" value={visitorForm.phone} onChange={e => setVisitorForm({...visitorForm, phone: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Purpose</Label><Input required value={visitorForm.purpose} onChange={e => setVisitorForm({...visitorForm, purpose: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Whom to Meet (Optional)</Label><Input value={visitorForm.whomToMeet} onChange={e => setVisitorForm({...visitorForm, whomToMeet: e.target.value})} /></div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>{loading ? "Saving..." : "Add Visitor"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {activeTab === "calls" && (
            <Dialog open={isCallModalOpen} onOpenChange={setCallModalOpen}>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white shadow">
                <Plus className="w-4 h-4 mr-2" /> Log Call
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Phone Call</DialogTitle></DialogHeader>
                <form onSubmit={handleCallSubmit} className="space-y-4">
                  <div className="grid gap-2"><Label>Caller Name</Label><Input required value={callForm.caller} onChange={e => setCallForm({...callForm, caller: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Phone Number</Label><Input required pattern="[0-9]{10}" title="10 digit phone number" value={callForm.phone} onChange={e => setCallForm({...callForm, phone: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Purpose / Notes</Label><Textarea required value={callForm.purpose} onChange={e => setCallForm({...callForm, purpose: e.target.value})} /></div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="followUp" checked={callForm.followUp} onChange={(e: any) => setCallForm({...callForm, followUp: e.target.checked})} className="rounded border-slate-300" />
                    <Label htmlFor="followUp">Requires Follow Up</Label>
                  </div>
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}>{loading ? "Saving..." : "Log Call"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {activeTab === "complaints" && (
            <Dialog open={isComplaintModalOpen} onOpenChange={setComplaintModalOpen}>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-red-600 hover:bg-red-700 text-white shadow">
                <Plus className="w-4 h-4 mr-2" /> Register Complaint
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Register Complaint</DialogTitle></DialogHeader>
                <form onSubmit={handleComplaintSubmit} className="space-y-4">
                  <div className="grid gap-2"><Label>Complainant Name</Label><Input required value={complaintForm.complainant} onChange={e => setComplaintForm({...complaintForm, complainant: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Phone Number</Label><Input pattern="[0-9]{10}" value={complaintForm.phone} onChange={e => setComplaintForm({...complaintForm, phone: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Description</Label><Textarea required rows={4} value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})} /></div>
                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>{loading ? "Registering..." : "Submit Complaint"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="visitors"><User className="w-4 h-4 mr-2" /> Visitors</TabsTrigger>
          <TabsTrigger value="calls"><Phone className="w-4 h-4 mr-2" /> Calls</TabsTrigger>
          <TabsTrigger value="complaints"><MessageSquare className="w-4 h-4 mr-2" /> Complaints</TabsTrigger>
        </TabsList>

        {/* VISITORS TAB */}
        <TabsContent value="visitors" className="mt-6">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>In Time</TableHead>
                    <TableHead>Out Time</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center h-24 text-slate-500">No visitors logged today.</TableCell></TableRow>
                  ) : (
                    visitors?.map((v: any) => {
                      const isInForTooLong = !v.outTime && (new Date().getTime() - new Date(v.inTime).getTime() > 12 * 60 * 60 * 1000);
                      return (
                      <TableRow key={v.id} className={isInForTooLong ? "bg-red-50/50 dark:bg-red-900/10" : ""}>
                        <TableCell className="font-medium">
                          {v.name}
                          {isInForTooLong && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
                        </TableCell>
                        <TableCell>{v.phone}</TableCell>
                        <TableCell>
                          <div>{v.purpose}</div>
                          {v.whomToMeet && <div className="text-xs text-slate-500">To meet: {v.whomToMeet}</div>}
                        </TableCell>
                        <TableCell>{new Date(v.inTime).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>
                          {v.outTime ? (
                            <span className="text-slate-600 dark:text-slate-400">{new Date(v.outTime).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full"><Clock className="w-3 h-3 mr-1" /> Checked In</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!v.outTime && (
                            <Button variant="outline" size="sm" onClick={() => markVisitorOut(schoolId, v.id)}>Mark Out</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )})
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* CALLS TAB */}
        <TabsContent value="calls" className="mt-6">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caller</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">No calls logged.</TableCell></TableRow>
                  ) : (
                    calls?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.caller}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell>{new Date(c.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</TableCell>
                        <TableCell className="max-w-xs truncate">{c.purpose}</TableCell>
                        <TableCell>
                          {c.followUp ? (
                            <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
                              <AlertCircle className="w-3 h-3 mr-1" /> Follow Up
                            </Badge>
                          ) : (
                            <span className="text-sm text-slate-500">Standard</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* COMPLAINTS TAB */}
        <TabsContent value="complaints" className="mt-6">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">No complaints registered.</TableCell></TableRow>
                  ) : (
                    complaints?.map((cmp: any) => (
                      <TableRow key={cmp.id} className={cmp.status === 'RESOLVED' ? "opacity-60 bg-slate-50 dark:bg-slate-900/50" : ""}>
                        <TableCell className="whitespace-nowrap">{new Date(cmp.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</TableCell>
                        <TableCell>
                          <div className="font-medium">{cmp.complainant}</div>
                          {cmp.phone && <div className="text-xs text-slate-500">{cmp.phone}</div>}
                        </TableCell>
                        <TableCell className="max-w-md text-sm">{cmp.description}</TableCell>
                        <TableCell>
                          {cmp.status === 'OPEN' ? (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Open</Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 dark:border-green-900/50 dark:text-green-400 dark:bg-green-900/20">
                              <CheckCircle className="w-3 h-3 mr-1" /> Resolved
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {cmp.status === 'OPEN' && (
                            <Button variant="outline" size="sm" onClick={() => resolveComplaint(schoolId, cmp.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200">
                              Mark Resolved
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
