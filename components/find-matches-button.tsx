"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface FindMatchesButtonProps {
  requestId: string
  onMatchesFound?: (matches: any[]) => void
}

export function FindMatchesButton({ requestId, onMatchesFound }: FindMatchesButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleFindMatches = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      })

      if (!response.ok) {
        throw new Error("Failed to find matches")
      }

      const data = await response.json()

      toast({
        title: "Matches found!",
        description: `Found ${data.matches.length} potential matches for your request.`,
      })

      if (onMatchesFound) {
        onMatchesFound(data.matches)
      }
    } catch (error) {
      console.error("Error finding matches:", error)
      toast({
        title: "Error",
        description: "Failed to find matches. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleFindMatches} disabled={isLoading}>
      <Search className="w-4 h-4 mr-2" />
      {isLoading ? "Finding Matches..." : "Find Matches"}
    </Button>
  )
}
