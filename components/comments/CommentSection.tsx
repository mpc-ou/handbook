"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";
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
  Loader2,
  CornerDownRight,
  X,
} from "lucide-react";

interface CommentSectionProps {
  itemId: string;
}

export function CommentSection({ itemId }: CommentSectionProps) {
  const t = useTranslations("reader.comments");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { user, allUsers, showToast } = useHandbook();

  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rootContent, setRootContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const res = await fetch(
        `/api/comments?itemId=${encodeURIComponent(itemId)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.comments)) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const userListForRenderer = allUsers.map((u) => ({
    id: u.uid || u.ssoId || "",
    fullName: u.fullName,
  }));

  const handlePostRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootContent.trim()) return;

    if (!user) {
      showToast?.(t("signInRequired"), "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          content: rootContent.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [...prev, { ...data.comment, replies: [] }]);
        setRootContent("");
        showToast?.(t("postedSuccess"), "success");
      } else {
        showToast?.(data.error || t("postError"), "error");
      }
    } catch {
      showToast?.(t("postError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReply = (
    rootId: string,
    targetUserId: string,
    targetUserName: string
  ) => {
    if (!user) {
      showToast?.(t("signInRequired"), "error");
      return;
    }
    setReplyTarget({ rootId, targetUserId, targetUserName });
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
      showToast?.(t("signInRequired"), "error");
      return;
    }

    try {
      setIsReplying(true);

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
          itemId,
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
        showToast?.(t("replySuccess"), "success");
      } else {
        showToast?.(data.error || t("postError"), "error");
      }
    } catch {
      showToast?.(t("postError"), "error");
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteComment = (
    commentId: string,
    isReply = false,
    rootId?: string
  ) => {
    setDeleteTarget({ commentId, isReply, rootId });
  };

  const executeDeleteComment = async () => {
    if (!deleteTarget) return;
    const { commentId, isReply, rootId } = deleteTarget;

    try {
      const res = await fetch(
        `/api/comments?id=${encodeURIComponent(commentId)}`,
        {
          method: "DELETE",
        }
      );
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
                  replies: (root.replies || []).filter(
                    (r) => r.id !== commentId
                  ),
                };
              }
              return root;
            })
          );
        }
        showToast?.(t("deletedSuccess"), "success");
      } else {
        showToast?.(data.error || t("deleteError"), "error");
      }
    } catch {
      showToast?.(t("deleteError"), "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const canDelete = (authorId: string) => {
    if (!user) return false;
    if (user.uid === authorId) return true;
    if (user.role === "ADMIN") return true;
    return false;
  };

  const renderRoleBadge = (role: Role) => {
    if (role === "ADMIN") {
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary"
        >
          {t("roleAdmin")}
        </Badge>
      );
    }
    if (role === "EDITOR") {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {t("roleEditor")}
        </Badge>
      );
    }
    return null;
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    return format.relativeTime(d, new Date());
  };

  const totalComments = comments.reduce(
    (acc, root) => acc + 1 + (root.replies?.length || 0),
    0
  );

  return (
    <section className="mt-10 pt-8 border-t border-border/60 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {t("title")}
        </h3>
        {totalComments > 0 && (
          <span className="text-xs font-mono text-muted-foreground">
            ({totalComments})
          </span>
        )}
      </div>

      {/* Root Comment Input Box */}
      {user ? (
        <form onSubmit={handlePostRoot} className="space-y-2.5">
          <div className="flex gap-3 items-start">
            <Avatar className="size-8 shrink-0 border border-border/60">
              <AvatarImage
                src={user.avatarUrl}
                alt={user.fullName}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                {user.fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={rootContent}
                onChange={(e) => setRootContent(e.target.value)}
                placeholder={t("placeholder")}
                rows={2}
                className="resize-none text-sm bg-muted/20 border-border/70"
              />
              <div className="flex justify-end">
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
                  <span>{t("submit")}</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">{t("signInPrompt")}</p>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-xs">{tCommon("actions.loading")}</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("empty")}</p>
      ) : (
        <div className="space-y-4">
          {comments.map((root) => {
            const hasReplies = root.replies && root.replies.length > 0;
            const isReplyingToThisRoot = replyTarget?.rootId === root.id;

            return (
              <div
                key={root.id}
                className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-7 shrink-0 border border-border/60">
                      <AvatarImage
                        src={root.userAvatarUrl}
                        alt={root.userFullName}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                        {root.userFullName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-foreground">
                        {root.userFullName}
                      </span>
                      {renderRoleBadge(root.userRole)}
                      <span className="text-muted-foreground">
                        · {formatTime(root.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {user && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          handleStartReply(
                            root.id,
                            root.userId,
                            root.userFullName
                          )
                        }
                        className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Reply className="size-3" />
                        <span>{t("reply")}</span>
                      </Button>
                    )}
                    {canDelete(root.userId) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteComment(root.id)}
                        className="h-6 px-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
                        title={t("deleteTooltip")}
                        aria-label={t("deleteTooltip")}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pl-9">
                  <CommentContentRenderer
                    content={root.content}
                    allUsers={userListForRenderer}
                  />
                </div>

                {/* Replies Thread */}
                {hasReplies && (
                  <div className="pl-5 ml-4 border-l border-border/60 space-y-2.5 pt-1">
                    {root.replies?.map((rep) => (
                      <div key={rep.id} className="space-y-1.5 py-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <Avatar className="size-5 shrink-0 border border-border/60">
                              <AvatarImage
                                src={rep.userAvatarUrl}
                                alt={rep.userFullName}
                                referrerPolicy="no-referrer"
                              />
                              <AvatarFallback className="text-[10px] font-semibold bg-muted text-foreground">
                                {rep.userFullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground">
                              {rep.userFullName}
                            </span>
                            {renderRoleBadge(rep.userRole)}
                            <span className="text-muted-foreground">
                              · {formatTime(rep.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {user && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() =>
                                  handleStartReply(
                                    root.id,
                                    rep.userId,
                                    rep.userFullName
                                  )
                                }
                                className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Reply className="size-2.5" />
                                <span>{t("reply")}</span>
                              </Button>
                            )}
                            {canDelete(rep.userId) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() =>
                                  handleDeleteComment(rep.id, true, root.id)
                                }
                                className="h-6 px-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
                                title={t("deleteTooltip")}
                                aria-label={t("deleteTooltip")}
                              >
                                <Trash2 className="size-2.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="pl-7">
                          <CommentContentRenderer
                            content={rep.content}
                            allUsers={userListForRenderer}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {isReplyingToThisRoot && (
                  <div className="pl-5 ml-4 border-l border-primary/40 pt-1">
                    <form onSubmit={handlePostReply} className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CornerDownRight className="size-3.5 text-primary shrink-0" />
                          <span>{t("replyingTo")}:</span>
                          {replyTarget?.targetUserName && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                              <span>@{replyTarget.targetUserName}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyTarget((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          targetUserId: "",
                                          targetUserName: "",
                                        }
                                      : null
                                  )
                                }
                                className="hover:opacity-75 cursor-pointer"
                                title={t("removeTag")}
                                aria-label={t("removeTag")}
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={
                          replyTarget?.targetUserName
                            ? t("replyPlaceholderUser", {
                                name: replyTarget.targetUserName,
                              })
                            : t("replyPlaceholder")
                        }
                        rows={2}
                        autoFocus
                        className="resize-none text-xs bg-background border-border/70"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={handleCancelReply}
                          className="h-7 text-xs cursor-pointer"
                        >
                          {tCommon("actions.cancel")}
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
                          <span>{t("submitReply")}</span>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteDialogTitle")}
        description={t("deleteDialogDesc")}
        confirmLabel={tCommon("actions.delete")}
        cancelLabel={tCommon("actions.cancel")}
        variant="destructive"
        onConfirm={executeDeleteComment}
      />
    </section>
  );
}
