'use client'

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

export default function SeedPage() {
  const [status, setStatus] = useState<string[]>([]);
  const supabase = createClient();

  const seed = async () => {
    const users = [
      { email: "nurse@demo.com", first: "Jane", last: "Smith", role: "NURSE" },
      { email: "pharmacy@demo.com", first: "Sarah", last: "Pharmacist", role: "PHARMACIST" },
      { email: "billing@demo.com", first: "Mike", last: "Billing", role: "ACCOUNTANT" }
    ];

    for (const u of users) {
      setStatus(prev => [...prev, `Seeding ${u.email}...`]);
      const { data, error } = await supabase.auth.signUp({
        email: u.email,
        password: "password123",
        options: {
          data: {
            first_name: u.first,
            last_name: u.last,
            role: u.role
          }
        }
      });

      if (error) {
        setStatus(prev => [...prev, `❌ Error ${u.email}: ${error.message}`]);
      } else {
        setStatus(prev => [...prev, `✅ Success ${u.email}`]);
      }
      // Wait 10 seconds between requests to be safe
      await new Promise(r => setTimeout(r, 10000));
    }
    setStatus(prev => [...prev, "Done!"]);
  };

  return (
    <div className="p-20 space-y-4">
      <h1 className="text-2xl font-bold">User Seeder (Part 2)</h1>
      <button 
        onClick={seed}
        className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold"
      >
        Start Seeding Remaining Users
      </button>
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-sm space-y-1">
        {status.map((s, i) => <div key={i}>{s}</div>)}
      </div>
    </div>
  );
}
