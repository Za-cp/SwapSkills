"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function ProfileForm({ profile }: { profile: any }) {
  const supabase = createClientComponentClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [skills, setSkills] = useState(profile?.skills?.join(", ") || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [timezone, setTimezone] = useState(profile?.timezone || "");

  // Fetch the current user ID to use in RLS
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error.message);
      } else {
        setUserId(data?.session?.user?.id || null);
      }
      setLoading(false);
    };
    fetchUser();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("❌ No user logged in");
      return;
    }

    setLoading(true);

    // Ensure a profile row exists first
    await supabase.from("profiles").insert({ id: userId }).onConflict("id");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        skills: skills
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        bio,
        location,
        timezone,
      })
      .eq("id", userId);

    setLoading(false);

    if (error) {
      alert("❌ Error updating profile: " + error.message);
    } else {
      alert("✅ Profile updated successfully!");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name"
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
        placeholder="Skills (comma separated)"
        className="w-full border p-2 rounded"
      />

      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio"
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        placeholder="Timezone"
        className="w-full border p-2 rounded"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Saving..." : "Update Profile"}
      </button>
    </form>
  );
}
