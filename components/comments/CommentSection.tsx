"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useHandbook } from "@/context/HandbookContext";
import { CommentRecord, Role } from "@/types";
import { CommentContentRenderer } from "./CommentContentRenderer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Reply,
  Trash2,
  Clock,
  ShieldCheck,
  Edit3,
  User as UserIcon,
  Loader2,
  CornerDownRight,
  AlertCircle,
  X,
} from "lucide-react";

import { formatRelativeTime } from "@/lib/date";

interface CommentSectionProps {
  articleId: string;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { user, allUsers, showToast } = useHandbook();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rootContent, setRootContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active reply thread tracking
  const [replyTarget, setReplyTarget] = useState<{
    rootId: string;
    targetUserId: string;
    targetUserName: string;
  } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    commentId: string;
    isReply: boolean;
    rootId?: string;
  } | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/comments?articleId=${articleId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.comments)) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Map users for tag parsing: { id, fullName }
  const userListForRenderer = allUsers.map((u) => ({
    id: u.uid || u.ssoId || "",
    fullName: u.fullName,
  }));

  const handlePostRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootContent.trim()) return;

    if (!user) {
      showToast?.("Please sign in to leave a comment.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          userId: user.uid,
          content: rootContent.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [...prev, { ...data.comment, replies: [] }]);
        setRootContent("");
        showToast?.("Comment posted successfully.", "success");
      } else {
        showToast?.(data.error || "Failed to post comment.", "error");
      }
    } catch {
      showToast?.("Connection error while posting comment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReply = (rootId: string, targetUserId: string, targetUserName: string) => {
    if (!user) {
      showToast?.("Please sign in to reply to comments.", "error");
      return;
    }
    setReplyTarget({ rootId, targetUserId, targetUserName });
    // Keep input field clean with graphical mention chip instead of raw string
    setReplyContent("");
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
    setReplyContent("");
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget || !replyContent.trim()) return;

    if (!user) {
      showToast?.("Please sign in to reply.", "error");
      return;
    }

    try {
      setIsReplying(true);

      // Prepend mention token <@userId> cleanly if target is selected and not already in input
      let finalContent = replyContent.trim();
      if (
        replyTarget.targetUserId &&
        !finalContent.includes(`<@${replyTarget.targetUserId}>`)
      ) {
        finalContent = `<@${replyTarget.targetUserId}> ${finalContent}`;
      }

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          userId: user.uid,
          parentId: replyTarget.rootId,
          content: finalContent,
        }),
      });

      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) =>
          prev.map((root) => {
            if (root.id === replyTarget.rootId) {
              return {
                ...root,
                replies: [...(root.replies || []), data.comment],
              };
            }
            return root;
          })
        );
        handleCancelReply();
        showToast?.("Reply posted successfully.", "success");
      } else {
        showToast?.(data.error || "Failed to post reply.", "error");
      }
    } catch {
      showToast?.("Connection error while posting reply.", "error");
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteComment = (commentId: string, isReply = false, rootId?: string) => {
    setDeleteTarget({ commentId, isReply, rootId });
  };

  const executeDeleteComment = async () => {
    if (!deleteTarget) return;
    const { commentId, isReply, rootId } = deleteTarget;

    try {
      const res = await fetch(`/api/comments?id=${commentId}&userId=${user?.uid || ""}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (!isReply) {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        } else if (rootId) {
          setComments((prev) =>
            prev.map((root) => {
              if (root.id === rootId) {
                return {
                  ...root,
                  replies: (root.replies || []).filter((r) => r.id !== commentId),
                };
              }
              return root;
            })
          );
        }
        showToast?.("Comment deleted.", "success");
      } else {
        showToast?.(data.error || "Failed to delete comment.", "error");
      }
    } catch {
      showToast?.("Connection error while deleting comment.", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const canDelete = (authorId: string) => {
    if (!user) return false;
    if (user.uid === authorId) return true;
    if (user.role === "ADMIN") return true;
    if (user.email === "trieukon1011@gmail.com") return true;
    return false;
  };

  const renderRoleBadge = (role: Role) => {
    if (role === "ADMIN") {
      return (
        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <ShieldCheck className="size-2.5" />
          <span>Admin</span>
        </Badge>
      );
    }
    if (role === "EDITOR") {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
          <Edit3 className="size-2.5" />
          <span>Editor</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground border-border/60">
        Member
      </Badge>
    );
  };

  const formatTime = (isoString: string) => {
    return formatRelativeTime(isoString);
  };

  const totalComments = comments.reduce(
    (acc, root) => acc + 1 + (root.replies?.length || 0),
    0
  );

  return (
    <section className="mt-12 pt-8 border-t border-border/60 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Discussion & Comments
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {totalComments}
          </span>
        </div>
      </div>

      {/* Root Comment Input Box */}
      {user ? (
        <form onSubmit={handlePostRoot} className="space-y-3">
          <div className="flex gap-3 items-start">
            <Avatar className="size-9 shrink-0 border border-border/80">
              <AvatarImage src={user.avatarUrl} alt={user.fullName} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
                {user.fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={rootContent}
                onChange={(e) => setRootContent(e.target.value)}
                placeholder="Write a question or share your thoughts on this lesson..."
                rows={3}
                className="resize-none text-sm bg-muted/20 border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
              />
              <div className="flex items-center justify-between">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!rootContent.trim() || isSubmitting}
                  className="gap-1.5 h-8 text-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  <span>Post comment</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Please sign in with your MPC account to join the discussion and ask questions.
          </p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span className="text-xs">Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 space-y-2 rounded-xl bg-muted/10 border border-border/40">
          <MessageSquare className="size-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            No comments yet for this lesson.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Be the first to ask a question or leave feedback!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((root) => {
            const hasReplies = root.replies && root.replies.length > 0;
            const isReplyingToThisRoot = replyTarget?.rootId === root.id;

            return (
              <div
                key={root.id}
                className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3.5 transition-all hover:border-border"
              >
                {/* Root Comment Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8 shrink-0 border border-border/60">
                      <AvatarImage src={root.userAvatarUrl} alt={root.userFullName} referrerPolicy="no-referrer" />
                      <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
                        {root.userFullName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">
                          {root.userFullName}
                        </span>
                        {renderRoleBadge(root.userRole)}
                        {root.userDepartment && (
                          <span className="text-[11px] text-muted-foreground">
                            • {root.userDepartment}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-2.5" />
                        <span>{formatTime(root.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Root */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => handleStartReply(root.id, root.userId, root.userFullName)}
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Reply className="size-3" />
                      <span>Reply</span>
                    </Button>
                    {canDelete(root.userId) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteComment(root.id)}
                        className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete comment"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Root Comment Body */}
                <div className="pl-10.5">
                  <CommentContentRenderer
                    content={root.content}
                    allUsers={userListForRenderer}
                  />
                </div>

                {/* Replies Thread (Level 2) */}
                {hasReplies && (
                  <div className="pl-6 ml-4 border-l-2 border-border/60 space-y-3 pt-2">
                    {root.replies?.map((rep) => (
                      <div
                        key={rep.id}
                        className="rounded-lg bg-muted/20 border border-border/40 p-3 space-y-2 transition-all hover:bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Avatar className="size-6 shrink-0 border border-border/60">
                              <AvatarImage src={rep.userAvatarUrl} alt={rep.userFullName} referrerPolicy="no-referrer" />
                              <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">
                                {rep.userFullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-foreground">
                              {rep.userFullName}
                            </span>
                            {renderRoleBadge(rep.userRole)}
                            <span className="text-[10px] text-muted-foreground">
                              • {formatTime(rep.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleStartReply(root.id, rep.userId, rep.userFullName)}
                              className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-1.5"
                            >
                              <Reply className="size-2.5" />
                              <span>Reply</span>
                            </Button>
                            {canDelete(rep.userId) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => handleDeleteComment(rep.id, true, root.id)}
                                className="h-6 text-[11px] text-destructive hover:bg-destructive/10 cursor-pointer px-1.5"
                                title="Delete reply"
                              >
                                <Trash2 className="size-2.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="pl-8">
                          <CommentContentRenderer
                            content={rep.content}
                            allUsers={userListForRenderer}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form (If active on this root) */}
                {isReplyingToThisRoot && (
                  <div className="pl-6 ml-4 border-l-2 border-primary/40 pt-2 animate-in fade-in duration-150">
                    <form onSubmit={handlePostReply} className="space-y-2.5 rounded-lg bg-muted/30 border border-primary/20 p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CornerDownRight className="size-3.5 text-primary shrink-0" />
                          <span className="text-[11px] font-medium">Replying to:</span>
                          {replyTarget?.targetUserName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
                              <span>@{replyTarget.targetUserName}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyTarget((prev) =>
                                    prev ? { ...prev, targetUserId: "", targetUserName: "" } : null
                                  )
                                }
                                className="hover:opacity-75 cursor-pointer ml-0.5 text-primary"
                                title="Remove tag"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelReply}
                          className="text-[11px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={
                          replyTarget?.targetUserName
                            ? `Write a reply to @${replyTarget.targetUserName}...`
                            : "Write a reply..."
                        }
                        rows={2}
                        autoFocus
                        className="resize-none text-xs bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary leading-relaxed"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={handleCancelReply}
                          className="h-7 text-xs cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="xs"
                          disabled={!replyContent.trim() || isReplying}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          {isReplying ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Send className="size-3" />
                          )}
                          <span>Send reply</span>
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Comment Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? The comment and all replies will be permanently removed."
        confirmLabel="Delete Comment"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={executeDeleteComment}
      />
    </section>
  );
}
