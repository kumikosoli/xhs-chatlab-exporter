export function listConversationsPage() {
  const items = Array.from(document.querySelectorAll(".xhs-im-conv-item")).map((element) => ({
    id: element.dataset.convId || "",
    kind: element.dataset.convKind || "",
    name:
      element.querySelector(".xhs-im-conv-item__name")?.textContent?.trim() ||
      element.querySelector(".xhs-im-conv-item__avatar")?.alt ||
      "",
    avatar: element.querySelector(".xhs-im-conv-item__avatar")?.src || "",
    active: element.classList.contains("xhs-im-conv-item--active")
  }));
  const scroller = document.querySelector(".xhs-im-conv-list__scroll");
  return {
    items,
    scroll: scroller
      ? {
          top: scroller.scrollTop,
          height: scroller.scrollHeight,
          clientHeight: scroller.clientHeight
        }
      : null
  };
}

export function scrollConversationListPage({ position = "next" } = {}) {
  const scroller = document.querySelector(".xhs-im-conv-list__scroll");
  if (!scroller) {
    return { changed: false, top: 0, height: 0, clientHeight: 0 };
  }
  const before = scroller.scrollTop;
  if (position === "top") {
    scroller.scrollTop = 0;
  } else {
    scroller.scrollTop = Math.min(
      scroller.scrollHeight,
      scroller.scrollTop + Math.max(200, scroller.clientHeight * 0.85)
    );
  }
  scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
  return {
    changed: scroller.scrollTop !== before,
    top: scroller.scrollTop,
    height: scroller.scrollHeight,
    clientHeight: scroller.clientHeight
  };
}

export function selectConversationPage({ id }) {
  const element = Array.from(document.querySelectorAll(".xhs-im-conv-item")).find(
    (item) => item.dataset.convId === String(id)
  );
  if (!element) {
    return { selected: false };
  }
  element.click();
  return { selected: true };
}

export function navigateConversationPage({ id }) {
  const target = new URL(`/chat/${encodeURIComponent(String(id))}`, location.origin);
  location.href = target.href;
  return { navigating: true, href: target.href };
}

export function conversationStatePage() {
  const active = document.querySelector(".xhs-im-conv-item--active");
  const firstMessage = document.querySelector(".chat-item[data-message-id]");
  const pathId = decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) || "");
  const id = active?.dataset.convId || pathId;
  let kind = active?.dataset.convKind || "";
  if (!kind && firstMessage?.dataset.messageId) {
    kind = firstMessage.dataset.messageId.split(".").length === 2 ? "group" : "c2c";
  }
  return {
    href: location.href,
    id,
    kind,
    name:
      document.querySelector(".xhs-im-chat-window__header-name")?.textContent?.trim() ||
      active?.querySelector(".xhs-im-conv-item__name")?.textContent?.trim() ||
      id,
    avatar: active?.querySelector(".xhs-im-conv-item__avatar")?.src || "",
    messageListReady: Boolean(document.querySelector(".xhs-im-msg-list")),
    messageCount: document.querySelectorAll(".chat-item[data-message-id]").length
  };
}

export function historyStatePage() {
  const messages = Array.from(document.querySelectorAll(".chat-item[data-message-id]"));
  const list = document.querySelector(".xhs-im-msg-list");
  return {
    count: messages.length,
    firstMessageId: messages[0]?.dataset.messageId || null,
    lastMessageId: messages.at(-1)?.dataset.messageId || null,
    scrollTop: list?.scrollTop ?? null,
    scrollHeight: list?.scrollHeight ?? null,
    clientHeight: list?.clientHeight ?? null
  };
}

export function scrollHistoryToTopPage() {
  const list = document.querySelector(".xhs-im-msg-list");
  if (!list) {
    return { scrolled: false };
  }
  list.scrollTop = Math.min(1, list.scrollHeight);
  list.dispatchEvent(new Event("scroll", { bubbles: true }));
  list.scrollTop = 0;
  list.dispatchEvent(new Event("scroll", { bubbles: true }));
  return { scrolled: true, scrollTop: list.scrollTop };
}

export function extractMessagesPage() {
  function clean(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function textWithInlineAssets(element) {
    if (!element) {
      return "";
    }
    const copy = element.cloneNode(true);
    for (const image of copy.querySelectorAll("img")) {
      image.replaceWith(document.createTextNode(image.alt || "[图片]"));
    }
    for (const br of copy.querySelectorAll("br")) {
      br.replaceWith(document.createTextNode("\n"));
    }
    return clean(copy.textContent);
  }

  return Array.from(document.querySelectorAll(".chat-item[data-message-id]")).map(
    (element, sequence) => {
      const right = Boolean(element.querySelector(".chat-item__content--right"));
      const left = Boolean(element.querySelector(".chat-item__content--left"));
      const avatarElement = element.querySelector(".chat-item__avatar-img");
      const textElement = element.querySelector(".xhs-im-bubble__text");
      const hintElement = element.querySelector(".xhs-im-hint__text");
      const referenceElement = element.querySelector(".chat-item__ref");
      const referenceSender = element.querySelector(".chat-item__ref-sender");
      const referenceContent = element.querySelector(".chat-item__ref-content");
      const cardTitle = element.querySelector(".xhs-im-bubble-card-note-title");
      const cardAuthor = element.querySelector(".xhs-im-bubble-card-note-author-name");
      const media = Array.from(
        element.querySelectorAll(
          ".xhs-im-bubble__image, .xhs-im-bubble__emoji, .xhs-im-bubble-card-note-cover, video, audio"
        )
      ).map((asset) => ({
        kind:
          asset.tagName === "VIDEO"
            ? "video"
            : asset.tagName === "AUDIO"
              ? "audio"
              : asset.classList.contains("xhs-im-bubble__emoji")
                ? "emoji"
                : asset.classList.contains("xhs-im-bubble-card-note-cover")
                  ? "card-cover"
                  : "image",
        src: asset.currentSrc || asset.src || "",
        alt: asset.alt || ""
      }));
      const links = Array.from(element.querySelectorAll(".chat-item__bubble a[href]"))
        .map((link) => link.href)
        .filter(Boolean);

      return {
        sequence,
        messageId: element.dataset.messageId || "",
        contentType: element.dataset.contentType || "",
        direction: right ? "right" : left ? "left" : "system",
        senderName:
          element.querySelector(".chat-item__nickname")?.textContent?.trim() ||
          (avatarElement?.alt === "我的头像" ? "" : avatarElement?.alt || ""),
        avatar: avatarElement?.src || "",
        text: textWithInlineAssets(textElement),
        hint: textWithInlineAssets(hintElement),
        fallbackText: clean(element.innerText),
        quote: referenceElement
          ? {
              sender: clean(referenceSender?.textContent).replace(/[:：]\s*$/, ""),
              content:
                textWithInlineAssets(referenceContent) || textWithInlineAssets(referenceElement)
            }
          : null,
        card: cardTitle
          ? {
              title: clean(cardTitle.textContent),
              author: clean(cardAuthor?.textContent)
            }
          : null,
        media,
        links
      };
    }
  );
}
