import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default function MasterDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Master Dashboard</h1>
      <p className="mt-4 text-slate-500">Welcome to the Master panel.</p>
      
      <form action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }} className="mt-8">
        <Button variant="destructive">Logout</Button>
      </form>
    </div>
  );
}