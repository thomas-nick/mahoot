"use client";

import { useEffect, useRef, useState } from "react";
import { readAuthToken, subscribeToAuthChanges } from "@/lib/auth";
import { emitNotificationsChanged } from "@/lib/notifications";
import { Avatar as UiAvatar, Button, Field, Input, Notice, Textarea } from "@/app/components/ui";

type Message = {
  id?: number;
  documentId?: string;
  body?: string;
  createdAt?: string;
  readAt?: string | null;
  sender?: { id?: number; username?: string | null } | null;
  recipient?: { id?: number; username?: string | null } | null;
};

type Props = {
  listingDocumentId: string;
  sellerId: number;
  sellerUsername: string;
  negotiable: boolean;
  askingPriceUsd: number;
};

const formatTime = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
};

const Avatar = ({
  username,
  mine,
}: {
  username?: string | null;
  mine: boolean;
}) => (
  <UiAvatar
    label={username ?? "?"}
    size="sm"
    className={mine ? "ring-1 ring-slate-700" : "ring-1 ring-slate-300"}
  />
);

export function ContactSeller({
  listingDocumentId,
  sellerId,
  sellerUsername,
  negotiable,
  askingPriceUsd,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: number } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState(String(Math.max(1, Math.round(askingPriceUsd * 0.9))));
  const [offerNote, setOfferNote] = useState("");
  const [offerSending, setOfferSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const refreshMe = async (jwt: string) => {
    try {
      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { user?: { id?: number } };
      if (payload.user?.id) setMe({ id: payload.user.id });
    } catch {
      /* ignore */
    }
  };

  const markThreadRead = async (jwt: string, buyerMode: boolean) => {
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(
          buyerMode
            ? { listingDocumentId, fromUserId: sellerId }
            : { listingDocumentId },
        ),
      });
      emitNotificationsChanged();
    } catch {
      /* non-fatal */
    }
  };

  /** Re-fetch after marking read so bubbles lose "New" styling once readAt is set server-side. */
  const refreshThreadSilent = async (jwt: string, isSeller: boolean) => {
    const url = isSeller
      ? `/api/messages?listing=${encodeURIComponent(listingDocumentId)}`
      : `/api/messages?listing=${encodeURIComponent(listingDocumentId)}&with=${sellerId}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` }, cache: "no-store" });
    if (response.ok) {
      const json = (await response.json()) as { messages?: Message[] };
      setMessages(json.messages ?? []);
    }
  };

  const refreshThread = async (jwt: string, myId: number) => {
    const isSeller = myId === sellerId;
    const url = isSeller
      ? `/api/messages?listing=${encodeURIComponent(listingDocumentId)}`
      : `/api/messages?listing=${encodeURIComponent(listingDocumentId)}&with=${sellerId}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` }, cache: "no-store" });
    if (response.ok) {
      const json = (await response.json()) as { messages?: Message[] };
      const next = json.messages ?? [];
      setMessages(next);
      if (next.length > 0) {
        await markThreadRead(jwt, !isSeller);
        await refreshThreadSilent(jwt, isSeller);
      }
    }
  };

  useEffect(() => {
    const sync = () => {
      const jwt = readAuthToken();
      setToken(jwt);
      if (!jwt) {
        setMe(null);
        setMessages([]);
        return;
      }
      void refreshMe(jwt);
    };
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  useEffect(() => {
    if (token && me) void refreshThread(token, me.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, me?.id, listingDocumentId, sellerId]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (!token) {
    return (
      <Notice variant="info">
        <a
          href={`/account?next=${encodeURIComponent(`/marketplace/${listingDocumentId}`)}`}
          className="font-semibold text-slate-900 underline"
        >
          Sign in
        </a>{" "}
        to message {sellerUsername ? `@${sellerUsername}` : "the seller"} or send an offer.
      </Notice>
    );
  }

  const isSeller = me?.id === sellerId;

  const sendMessage = async () => {
    if (!token || !me) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      const recipientId = isSeller
        ? messages.find((m) => m.sender?.id !== me.id)?.sender?.id ?? null
        : sellerId;
      if (!recipientId) {
        throw new Error("No buyer to reply to yet — wait for someone to message you first.");
      }
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          listingDocumentId,
          recipientId,
          body: text,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Send failed.");
      setBody("");
      setInfo("Message sent.");
      emitNotificationsChanged();
      await refreshThread(token, me.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const sendOffer = async () => {
    if (!token) return;
    const price = Number(offerPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a positive offer amount.");
      return;
    }
    setOfferSending(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          listingDocumentId,
          priceUsd: price,
          note: offerNote.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Offer failed.");
      setOfferNote("");
      setShowOffer(false);
      setInfo(`Offer sent to ${sellerUsername ? `@${sellerUsername}` : "the seller"}.`);
      emitNotificationsChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Offer failed.");
    } finally {
      setOfferSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {error ? <Notice variant="error">{error}</Notice> : null}
      {info ? <Notice variant="success">{info}</Notice> : null}

      {messages.length > 0 ? (
        <div
          ref={threadRef}
          className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3"
        >
          <ul className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender?.id === me?.id;
              const showUnread = !isMe && msg.recipient?.id === me?.id && !msg.readAt;
              return (
                <li
                  key={msg.documentId ?? msg.id}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar username={msg.sender?.username} mine={Boolean(isMe)} />
                  <div className={`max-w-[min(80%,20rem)] ${isMe ? "text-right" : ""}`}>
                    <div
                      className={`inline-block rounded-2xl px-3 py-2 text-left text-sm ${
                        isMe
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-800 shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                    </div>
                    <p className={`mt-1 text-[10px] text-slate-500 ${isMe ? "pr-1" : "pl-1"}`}>
                      {isMe ? "You" : `@${msg.sender?.username ?? "user"}`} · {formatTime(msg.createdAt)}
                      {showUnread ? (
                        <span className="ml-1 font-semibold text-sky-600">· New</span>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : isSeller ? (
        <p className="text-sm text-slate-500">
          When buyers message you about this listing, their threads appear here.
        </p>
      ) : null}

      {!isSeller ? (
        <>
          <Field label={`Message ${sellerUsername ? `@${sellerUsername}` : "seller"}`}>
            <Textarea
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Hi! Is this still available?"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendMessage} disabled={sending || !body.trim()}>
              {sending ? "Sending…" : "Send message"}
            </Button>
            {negotiable ? (
              <Button variant="secondary" onClick={() => setShowOffer((value) => !value)}>
                {showOffer ? "Cancel offer" : "Make offer"}
              </Button>
            ) : null}
          </div>

          {showOffer && negotiable ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              <Field label="Your offer (USD)">
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={offerPrice}
                  onChange={(event) => setOfferPrice(event.target.value)}
                />
              </Field>
              <Field label="Note (optional)">
                <Textarea
                  rows={2}
                  value={offerNote}
                  onChange={(event) => setOfferNote(event.target.value)}
                  placeholder="Cash today, local pickup OK, etc."
                />
              </Field>
              <Button onClick={sendOffer} disabled={offerSending}>
                {offerSending ? "Sending…" : "Send offer"}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Field label="Reply">
          <Textarea
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Reply to buyers who messaged you about this disc."
          />
          <div className="mt-2">
            <Button onClick={sendMessage} disabled={sending || !body.trim()}>
              {sending ? "Sending…" : "Reply"}
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}
