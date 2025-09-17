"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface CompleteMatchButtonProps {
  matchId: string
  disabled?: boolean
}

export function CompleteMatchButton({ matchId, disabled = false }: CompleteMatchButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCompleteMatch = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", matchId)

      if (error) throw error

      toast({
        title: "Match completed",
        description: "You can now leave a review for your learning partner!",
      })

      router.push(`/review/${matchId}`)
    } catch (error) {
      console.error("Error completing match:", error)
      toast({
        title: "Error",
        description: "Failed to complete match. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleCompleteMatch} disabled={disabled || isLoading} variant="outline" size="sm">
      <CheckCircle className="w-4 h-4 mr-2" />
      {isLoading ? "Completing..." : "Mark as Complete"}
    </Button>
  )
}
