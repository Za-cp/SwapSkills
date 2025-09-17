"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, ArrowLeft, User, Video, Calendar, TrendingUp } from "lucide-react"
import { CompleteMatchButton } from "@/components/complete-match-button"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { toast } from "@/hooks/use-toast"

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
  read_at: string | null
  sender: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface Match {
  id: string
  status: string
  teacher_id: string
  learner_id: string
  skill_requests: {
    id: string
    title: string
    skills: {
      id: string
      name: string
    }
  }
}

interface OtherUser {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface ChatInterfaceProps {
  match: Match
  messages: Message[]
  currentUserId: string
  otherUser: OtherUser
}

export function ChatInterface({ match, messages: initialMessages, currentUserId, otherUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [currentLesson, setCurrentLesson] = useState(1)
  const [totalLessons, setTotalLessons] = useState(5)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${match.id}`,
        },
        async (payload) => {
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single()

          const newMessage = {
            ...payload.new,
            sender,
          } as Message

          setMessages((prev) => [...prev, newMessage])

          // Show browser notification if not sender
          if (payload.new.sender_id !== currentUserId && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(`New message from ${sender?.full_name || "Someone"}`, {
                body: payload.new.content,
                icon: sender?.avatar_url || "/default-avatar.png",
              })
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          setMessages((prev) => prev.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          if (payload.new.user_id !== currentUserId) {
            setOtherUserTyping(payload.new.is_typing)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${otherUser.id}`,
        },
        (payload) => {
          setIsOnline(payload.new.is_online)
        },
      )
      .subscribe()

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match.id, currentUserId, otherUser.id, supabase])

  useEffect(() => {
    const markMessagesAsRead = async () => {
      await supabase
        .from("messages")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("match_id", match.id)
        .eq("is_read", false)
        .neq("sender_id", currentUserId)
    }

    markMessagesAsRead()
  }, [match.id, currentUserId, supabase])

  const handleTyping = async () => {
    if (!isTyping) {
      setIsTyping(true)
      await supabase.from("typing_indicators").upsert({
        match_id: match.id,
        user_id: currentUserId,
        is_typing: true,
        updated_at: new Date().toISOString(),
      })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false)
      await supabase.from("typing_indicators").upsert({
        match_id: match.id,
        user_id: currentUserId,
        is_typing: false,
        updated_at: new Date().toISOString(),
      })
    }, 2000)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isLoading) return

    setIsLoading(true)

    try {
      const { error } = await supabase.from("messages").insert({
        match_id: match.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
      })

      if (error) throw error

      // Stop typing indicator
      await supabase.from("typing_indicators").upsert({
        match_id: match.id,
        user_id: currentUserId,
        is_typing: false,
        updated_at: new Date().toISOString(),
      })

      setNewMessage("")
      setIsTyping(false)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProgressUpdate = async () => {
    try {
      await supabase.from("skill_progress").insert({
        match_id: match.id,
        user_id: currentUserId,
        lesson_number: currentLesson,
        total_lessons: totalLessons,
        notes: `Completed lesson ${currentLesson}`,
      })

      toast({
        title: "Progress Updated!",
        description: `Lesson ${currentLesson} marked as complete`,
      })

      setShowProgressModal(false)
      setCurrentLesson((prev) => prev + 1)
    } catch (error) {
      console.error("Error updating progress:", error)
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      })
    }
  }

  const isTeacher = match.teacher_id === currentUserId

  return (
    <div className="flex flex-col h-full">
      <Card className="rounded-none border-b">
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/matches">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="relative">
              <Avatar>
                <AvatarImage src={otherUser.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{otherUser.full_name || "Anonymous User"}</CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">
                  {isTeacher ? "Learning" : "Teaching"} {match.skill_requests.skills.name}
                </p>
                <Badge variant="outline" className={isOnline ? "text-green-600" : "text-gray-500"}>
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Video className="w-4 h-4 mr-2" />
                Video Call
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowProgressModal(true)}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Progress
              </Button>
              {match.status === "accepted" && <CompleteMatchButton matchId={match.id} />}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No messages yet. Start the conversation!</p>
            <p className="text-sm text-gray-500">
              You're connected to discuss {match.skill_requests.skills.name} learning.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId
            return (
              <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? "order-2" : "order-1"}`}>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isOwnMessage ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <div
                    className={`text-xs text-gray-500 mt-1 flex items-center gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
                    {isOwnMessage && message.read_at && <span className="text-blue-500">✓✓</span>}
                  </div>
                </div>
                {!isOwnMessage && (
                  <Avatar className="w-8 h-8 order-1 mr-2">
                    <AvatarImage src={message.sender.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )
          })
        )}

        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <Card className="rounded-none border-t">
        <CardContent className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Update Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Current Lesson</label>
                <Input
                  type="number"
                  value={currentLesson}
                  onChange={(e) => setCurrentLesson(Number.parseInt(e.target.value))}
                  min="1"
                  max={totalLessons}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total Lessons</label>
                <Input
                  type="number"
                  value={totalLessons}
                  onChange={(e) => setTotalLessons(Number.parseInt(e.target.value))}
                  min="1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleProgressUpdate} className="flex-1">
                  Update Progress
                </Button>
                <Button variant="outline" onClick={() => setShowProgressModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
