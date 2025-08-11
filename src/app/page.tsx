import TabsWithData from "@/components/tabs/TabsWithData";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        <TabsWithData/>
      </div>
    </div>
  );
}
