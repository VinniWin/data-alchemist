import TabsWithData from "@/components/tabs/TabsWithData";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-slate-700 to-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        <TabsWithData/>
      </div>
    </div>
  );
}
