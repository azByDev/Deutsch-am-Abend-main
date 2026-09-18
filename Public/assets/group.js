document.addEventListener("DOMContentLoaded", async function () {
  var config = window.DAA_SUPABASE_CONFIG;
  var client = createGroupClient(config);
  var params = new URLSearchParams(window.location.search);
  var requestedLevel = (params.get("level") || "").toUpperCase();
  var validLevels = ["A1", "A2", "B1", "B2"];
  var postForm = document.getElementById("post-form");
  var postList = document.getElementById("post-list");
  var postStatus = document.getElementById("post-status");
  var sampleEngagement = {};
  var sampleReplies = {};
  var openPostButton = document.getElementById("open-post-form");
  var postFormShell = document.getElementById("post-form-shell");

  openPostButton.addEventListener("click", function () {
    var isOpen = !postFormShell.hidden;
    postFormShell.hidden = isOpen;
    openPostButton.setAttribute("aria-expanded", String(!isOpen));
    if (!isOpen) document.getElementById("post-title").focus();
  });

  if (!validLevels.includes(requestedLevel)) {
    return showGroupMessage(
      "Choose a valid level group from the community page.",
      "error",
    );
  }
  updateLevelCopy(requestedLevel);
  renderPosts([], []);

  if (!client) {
    return showGroupMessage(
      "Community access is being configured. Add the Supabase URL and anon key in assets/supabase-config.js.",
      "error",
    );
  }

  try {
    var sessionResult = await client.auth.getSession();
    var session = sessionResult.data.session;
    if (sessionResult.error || !session)
      return redirectToCommunity(
        "Please sign in before entering a level group.",
      );
    if (!session.user.email_confirmed_at)
      return redirectToCommunity(
        "Please verify your email address before entering a level group.",
      );

    var membershipResult = await client
      .from("level_memberships")
      .select("level")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (membershipResult.error) throw membershipResult.error;
    if (
      !membershipResult.data ||
      membershipResult.data.level !== requestedLevel
    ) {
      return showGroupMessage(
        "This account is registered for " +
          (membershipResult.data ? membershipResult.data.level : "no level") +
          ". Return to the community page to use your own group.",
        "error",
      );
    }

    await loadPosts(requestedLevel);
    postForm.addEventListener("submit", function (event) {
      createPost(event, session.user, requestedLevel);
    });
  } catch (error) {
    showGroupMessage(friendlyGroupError(error), "error");
  }

  async function loadPosts(level) {
    postList.textContent = "Loading discussions...";
    postList.className = "post-list is-loading";
    var postsResult = await client
      .from("posts")
      .select(
        "id, level, title, body, created_at, author_id, profiles(display_name)",
      )
      .eq("level", level)
      .order("created_at", { ascending: false });
    if (postsResult.error) throw postsResult.error;
    var posts = postsResult.data || [];
    var repliesResult = posts.length
      ? await client
          .from("replies")
          .select(
            "id, post_id, body, created_at, author_id, profiles(display_name)",
          )
          .in(
            "post_id",
            posts.map(function (post) {
              return post.id;
            }),
          )
          .order("created_at", { ascending: true })
      : { data: [], error: null };
    if (repliesResult.error) throw repliesResult.error;
    var engagement = await loadEngagement(
      posts.map(function (post) {
        return post.id;
      }),
    );
    renderPosts(posts, repliesResult.data || [], engagement);
  }

  async function loadEngagement(postIds) {
    var reactionsResult = await client
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", postIds);
    if (reactionsResult.error) throw reactionsResult.error;
    var bookmarksResult = await client
      .from("post_bookmarks")
      .select("post_id, user_id")
      .eq("user_id", session.user.id)
      .in("post_id", postIds);
    if (bookmarksResult.error) throw bookmarksResult.error;
    return {
      reactions: reactionsResult.data || [],
      bookmarks: bookmarksResult.data || [],
    };
  }

  function renderPosts(posts, replies, engagement) {
    postList.textContent = "";
    postList.className = "post-list";
    if (!posts.length) {
      var sampleDiscussion = getSampleDiscussion(requestedLevel);
      posts = sampleDiscussion.posts;
      replies = sampleDiscussion.replies;
      engagement = { reactions: [], bookmarks: [] };
    }
    posts.forEach(function (post) {
      var card = document.createElement("article");
      card.className = "post-card";
      var header = document.createElement("div");
      header.className = "post-header";
      var title = document.createElement("h3");
      title.textContent = post.title;
      if (post.isSample) {
        var sampleNote = document.createElement("span");
        sampleNote.className = "sample-note";
        sampleNote.textContent = "Sample discussion";
        title.appendChild(sampleNote);
      }
      var author = document.createElement("span");
      author.className = "post-author";
      author.textContent =
        displayName(post.profiles, post.author_id) +
        " · " +
        formatDate(post.created_at);
      header.append(title, author);
      var body = document.createElement("p");
      body.className = "post-body";
      body.textContent = post.body;
      var matchingReplies = replies.filter(function (reply) {
        return reply.post_id === post.id;
      });
      if (post.isSample && sampleReplies[post.id]) {
        matchingReplies = matchingReplies.concat(sampleReplies[post.id]);
      }
      var replyForm = createReplyForm(post);
      var actions = createPostActions(
        post,
        engagement,
        matchingReplies.length,
        replyForm,
      );
      var replyList = document.createElement("div");
      replyList.className = "reply-list";
      matchingReplies.forEach(function (reply) {
        replyList.appendChild(renderReply(reply));
      });
      card.append(header, body, actions, replyList);
      if (replyForm) {
        card.appendChild(replyForm);
      }
      postList.appendChild(card);
    });
  }

  function createReplyForm(post) {
    var postId = post.id;
    var replyForm = document.createElement("form");
    replyForm.className = "reply-form";
    replyForm.innerHTML =
      '<div class="reply-fields" hidden><label for="reply-' +
      postId +
      '">Reply to this discussion</label><div class="reply-row"><textarea id="reply-' +
      postId +
      '" name="reply" maxlength="1000" required placeholder="Add a helpful reply..."></textarea><button class="btn btn-secondary" type="submit">Reply</button></div></div>';
    replyForm.addEventListener("submit", function (event) {
      createReply(event, postId, post);
    });
    return replyForm;
  }

  function createPostActions(post, engagement, replyCount, replyForm) {
    var actions = document.createElement("div");
    actions.className = "post-actions";
    var sampleState = post.isSample
      ? sampleEngagement[post.id] ||
        (sampleEngagement[post.id] = {
          up: 0,
          down: 0,
          reaction: null,
          saved: false,
        })
      : null;
    var reactions = engagement.reactions.filter(function (item) {
      return item.post_id === post.id;
    });
    var upCount = reactions.filter(function (item) {
      return item.reaction === "up";
    }).length;
    var downCount = reactions.filter(function (item) {
      return item.reaction === "down";
    }).length;
    if (sampleState) {
      upCount = sampleState.up;
      downCount = sampleState.down;
    }
    var currentReaction =
      session &&
      reactions.find(function (item) {
        return item.user_id === session.user.id;
      });
    var isSaved = sampleState
      ? sampleState.saved
      : engagement.bookmarks.some(function (item) {
          return item.post_id === post.id;
        });
    var upButton = createActionButton(
      "up",
      upCount,
      "Like this post",
      '<path d="m6 10 6-6 6 6"/><path d="M12 4v16"/>',
    );
    var downButton = createActionButton(
      "down",
      downCount,
      "Dislike this post",
      '<path d="m6 14 6 6 6-6"/><path d="M12 20V4"/>',
    );
    var commentButton = createActionButton(
      "comment",
      replyCount,
      "Open comments",
      '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.6-.8L4 20l1.2-3.7A7.3 7.3 0 0 1 4 12.2 7.5 7.5 0 0 1 12 5a7.5 7.5 0 0 1 8 6.5Z"/>',
    );
    var saveButton = createActionButton(
      "save",
      "",
      isSaved ? "Remove saved post" : "Save post",
      '<path d="m6 4 6 4 6-4v16l-6-4-6 4Z"/>',
    );
    if (currentReaction && currentReaction.reaction === "up")
      upButton.classList.add("is-active");
    if (currentReaction && currentReaction.reaction === "down")
      downButton.classList.add("is-active");
    if (isSaved) saveButton.classList.add("is-active");
    upButton.addEventListener("click", function () {
      if (sampleState) return toggleSampleReaction(post, "up", actions);
      toggleReaction(post, "up");
    });
    downButton.addEventListener("click", function () {
      if (sampleState) return toggleSampleReaction(post, "down", actions);
      toggleReaction(post, "down");
    });
    commentButton.addEventListener("click", function () {
      if (!replyForm) return;
      var fields = replyForm.querySelector(".reply-fields");
      var isOpen = !fields.hidden;
      fields.hidden = isOpen;
      commentButton.setAttribute("aria-expanded", String(!isOpen));
      if (!isOpen) fields.querySelector("textarea").focus();
    });
    saveButton.addEventListener("click", function () {
      if (sampleState) return toggleSampleBookmark(post, actions);
      toggleBookmark(post);
    });
    actions.append(upButton, downButton, commentButton, saveButton);
    return actions;
  }

  function toggleSampleReaction(post, reaction, actions) {
    var state = sampleEngagement[post.id];
    if (state.reaction === reaction) {
      state[reaction] -= 1;
      state.reaction = null;
    } else {
      if (state.reaction) state[state.reaction] -= 1;
      state[reaction] += 1;
      state.reaction = reaction;
    }
    updateSampleActions(actions, state);
  }

  function toggleSampleBookmark(post, actions) {
    var state = sampleEngagement[post.id];
    state.saved = !state.saved;
    updateSampleActions(actions, state);
  }

  function updateSampleActions(actions, state) {
    var upButton = actions.querySelector('[data-action="up"]');
    var downButton = actions.querySelector('[data-action="down"]');
    var saveButton = actions.querySelector('[data-action="save"]');
    upButton.querySelector(".post-action-count").textContent = state.up;
    downButton.querySelector(".post-action-count").textContent = state.down;
    upButton.classList.toggle("is-active", state.reaction === "up");
    downButton.classList.toggle("is-active", state.reaction === "down");
    saveButton.classList.toggle("is-active", state.saved);
    saveButton.title = state.saved ? "Remove saved post" : "Save post";
    saveButton.setAttribute("aria-label", saveButton.title);
  }

  function createActionButton(action, count, label, icon) {
    var button = document.createElement("button");
    button.className = "post-action";
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.dataset.action = action;
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      icon +
      "</svg>" +
      (count === ""
        ? ""
        : '<span class="post-action-count">' + count + "</span>");
    return button;
  }

  async function toggleReaction(post, reaction) {
    if (post.isSample || !session) return;
    var existing = await client
      .from("post_reactions")
      .select("reaction")
      .eq("post_id", post.id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (existing.error)
      return setStatus(postStatus, "error", friendlyGroupError(existing.error));
    var result;
    if (existing.data && existing.data.reaction === reaction) {
      result = await client
        .from("post_reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", session.user.id);
    } else {
      if (existing.data)
        await client
          .from("post_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id);
      result = await client
        .from("post_reactions")
        .insert({
          post_id: post.id,
          user_id: session.user.id,
          reaction: reaction,
        });
    }
    if (result.error)
      return setStatus(postStatus, "error", friendlyGroupError(result.error));
    await loadPosts(requestedLevel);
  }

  async function toggleBookmark(post) {
    if (post.isSample || !session) return;
    var existing = await client
      .from("post_bookmarks")
      .select("post_id")
      .eq("post_id", post.id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (existing.error)
      return setStatus(postStatus, "error", friendlyGroupError(existing.error));
    var result = existing.data
      ? await client
          .from("post_bookmarks")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id)
      : await client
          .from("post_bookmarks")
          .insert({ post_id: post.id, user_id: session.user.id });
    if (result.error)
      return setStatus(postStatus, "error", friendlyGroupError(result.error));
    await loadPosts(requestedLevel);
  }

  function renderReply(reply) {
    var wrapper = document.createElement("div");
    wrapper.className = "reply-item";
    var meta = document.createElement("div");
    meta.className = "reply-meta";
    meta.textContent =
      displayName(reply.profiles, reply.author_id) +
      " · " +
      formatDate(reply.created_at);
    var body = document.createElement("p");
    body.textContent = reply.body;
    wrapper.append(meta, body);
    return wrapper;
  }

  async function createPost(event, user, level) {
    event.preventDefault();
    if (!postForm.checkValidity()) return postForm.reportValidity();
    var formData = new FormData(postForm);
    setStatus(postStatus, "", "Publishing...");
    var result = await client.from("posts").insert({
      level: level,
      title: formData.get("title"),
      body: formData.get("message"),
      author_id: user.id,
    });
    if (result.error)
      return setStatus(postStatus, "error", friendlyGroupError(result.error));
    postForm.reset();
    setStatus(postStatus, "success", "Your question is now in the discussion.");
    await loadPosts(level);
  }

  async function createReply(event, postId, post) {
    event.preventDefault();
    var form = event.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    var body = new FormData(form).get("reply");
    if (post && post.isSample) {
      if (!sampleReplies[postId]) sampleReplies[postId] = [];
      sampleReplies[postId].push({
        post_id: postId,
        body: body,
        created_at: new Date().toISOString(),
        author_id: "sample-member",
        profiles: { display_name: "Learner-YOURTURN" },
      });
      var replyList = form.parentElement.querySelector(".reply-list");
      if (replyList)
        replyList.appendChild(
          renderReply(sampleReplies[postId][sampleReplies[postId].length - 1]),
        );
      form.reset();
      setStatus(
        postStatus,
        "success",
        "Your sample reply was added to this preview thread.",
      );
      return;
    }
    var result = await client
      .from("replies")
      .insert({ post_id: postId, body: body, author_id: session.user.id });
    if (result.error)
      return setStatus(postStatus, "error", friendlyGroupError(result.error));
    await loadPosts(requestedLevel);
  }

  function updateLevelCopy(level) {
    document.getElementById("group-eyebrow").textContent =
      level + " discussion group";
    document.getElementById("group-title").textContent =
      level + " learners, learning together";
    document.getElementById("group-description").textContent =
      "Ask questions, share what you are learning, and help other " +
      level +
      " students move forward.";
    document.getElementById("sidebar-title").textContent =
      level + " group space";
    document.title = level + " Group - Deutsch am Abend";
  }

  function redirectToCommunity(message) {
    showGroupMessage(
      message + " Redirecting you to community access...",
      "error",
    );
    window.setTimeout(function () {
      window.location.href = "community.html#account";
    }, 1800);
  }

  function showGroupMessage(message, type) {
    setStatus(postStatus, type, message);
  }

  function getSampleDiscussion(level) {
    var samples = {
      A1: {
        posts: [
          {
            id: "sample-a1-1",
            title: "When do I use der, die, or das?",
            body: "I am learning new nouns and I am not sure how to remember the article. Do you have a simple method?",
            created_at: "2026-09-12T09:00:00Z",
            author_id: "samplea1000001",
            profiles: { display_name: "Learner-A1HELP" },
            isSample: true,
          },
          {
            id: "sample-a1-2",
            title: "How can I introduce myself?",
            body: "I want to practise a short introduction for our next class. Which sentences should I include?",
            created_at: "2026-09-10T15:30:00Z",
            author_id: "samplea1000002",
            profiles: { display_name: "Learner-A1START" },
            isSample: true,
          },
          {
            post_id: "sample-a1-1",
            body: "I also made a small picture board with objects in my room and their articles.",
            created_at: "2026-09-12T11:00:00Z",
            author_id: "samplea1000005",
            profiles: { display_name: "Learner-A1PRACTICE" },
          },
          {
            post_id: "sample-a1-1",
            body: "The three-colour method helps me: blue for der, red for die, and green for das.",
            created_at: "2026-09-12T12:00:00Z",
            author_id: "samplea1000006",
            profiles: { display_name: "Learner-A1COLOUR" },
          },
        ],
        replies: [
          {
            post_id: "sample-a1-1",
            body: "I write the article together with every new noun and practise three nouns each day.",
            created_at: "2026-09-12T10:00:00Z",
            author_id: "samplea1000003",
            profiles: { display_name: "Learner-A1STUDY" },
          },
          {
            post_id: "sample-a1-2",
            body: "Try: Ich heiße ..., Ich komme aus ..., und Ich lerne Deutsch.",
            created_at: "2026-09-10T16:10:00Z",
            author_id: "samplea1000004",
            profiles: { display_name: "Learner-A1HELLO" },
          },
        ],
      },
      A2: {
        posts: [
          {
            id: "sample-a2-1",
            title: "Perfekt with haben or sein?",
            body: "How do I know whether to say Ich habe gegangen or Ich bin gegangen?",
            created_at: "2026-09-11T11:00:00Z",
            author_id: "samplea2000001",
            profiles: { display_name: "Learner-A2PAST" },
            isSample: true,
          },
        ],
        replies: [
          {
            post_id: "sample-a2-1",
            body: "Use sein with movement or a change of state: Ich bin gegangen, but Ich habe gelernt.",
            created_at: "2026-09-11T12:00:00Z",
            author_id: "samplea2000002",
            profiles: { display_name: "Learner-A2GRAM" },
          },
          {
            post_id: "sample-a2-1",
            body: "A useful shortcut is: movement usually takes sein, while most regular actions take haben.",
            created_at: "2026-09-11T13:00:00Z",
            author_id: "samplea2000003",
            profiles: { display_name: "Learner-A2RULE" },
          },
          {
            post_id: "sample-a2-1",
            body: "Thank you! I will practise with gefahren, geblieben, and gemacht.",
            created_at: "2026-09-11T14:00:00Z",
            author_id: "samplea2000004",
            profiles: { display_name: "Learner-A2PRACTICE" },
          },
        ],
      },
      B1: {
        posts: [
          {
            id: "sample-b1-1",
            title: "Tips for speaking more fluently",
            body: "I understand German well, but I pause when I speak. What helps you build longer answers?",
            created_at: "2026-09-09T08:30:00Z",
            author_id: "sampleb1000001",
            profiles: { display_name: "Learner-B1SPEAK" },
            isSample: true,
          },
        ],
        replies: [
          {
            post_id: "sample-b1-1",
            body: "I prepare useful sentence starters such as Meiner Meinung nach ... and Trotzdem denke ich, dass ...",
            created_at: "2026-09-09T09:20:00Z",
            author_id: "sampleb1000002",
            profiles: { display_name: "Learner-B1VOICE" },
          },
          {
            post_id: "sample-b1-1",
            body: "Recording yourself for one minute is useful because you can notice where you pause.",
            created_at: "2026-09-09T10:20:00Z",
            author_id: "sampleb1000003",
            profiles: { display_name: "Learner-B1RECORD" },
          },
          {
            post_id: "sample-b1-1",
            body: "I practise one answer three times: slowly, naturally, and then with one extra detail.",
            created_at: "2026-09-09T11:15:00Z",
            author_id: "sampleb1000004",
            profiles: { display_name: "Learner-B1DETAIL" },
          },
        ],
      },
      B2: {
        posts: [
          {
            id: "sample-b2-1",
            title: "Making my writing sound more natural",
            body: "Which connectors can I use instead of deshalb and außerdem in a formal text?",
            created_at: "2026-09-08T17:00:00Z",
            author_id: "sampleb2000001",
            profiles: { display_name: "Learner-B2WRITE" },
            isSample: true,
          },
        ],
        replies: [
          {
            post_id: "sample-b2-1",
            body: "Try daher, folglich, darüber hinaus, zudem, and nicht zuletzt. Choose based on the relationship between your ideas.",
            created_at: "2026-09-08T18:15:00Z",
            author_id: "sampleb2000002",
            profiles: { display_name: "Learner-B2STYLE" },
          },
          {
            post_id: "sample-b2-1",
            body: "In formal writing, I often use einerseits ... andererseits to compare two positions.",
            created_at: "2026-09-08T19:00:00Z",
            author_id: "sampleb2000003",
            profiles: { display_name: "Learner-B2FORMAL" },
          },
          {
            post_id: "sample-b2-1",
            body: "A short outline is helpful for organising an argument before writing.",
            created_at: "2026-09-08T20:00:00Z",
            author_id: "sampleb2000004",
            profiles: { display_name: "Learner-B2ARGUE" },
          },
        ],
      },
    };
    return samples[level];
  }
});

function createGroupClient(config) {
  if (
    !config ||
    !window.supabase ||
    !config.url ||
    !config.anonKey ||
    config.url.indexOf("YOUR_") !== -1 ||
    config.anonKey.indexOf("YOUR_") !== -1
  )
    return null;
  return window.supabase.createClient(config.url, config.anonKey);
}

function setStatus(element, type, message) {
  element.className = "form-status" + (type ? " " + type : "");
  element.textContent = message;
}

function displayName(profile, authorId) {
  var storedName = profile && profile.display_name;
  if (storedName && /^Learner-[A-Z0-9]{6}$/.test(storedName)) return storedName;
  if (authorId)
    return "Learner-" + authorId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return "Community member";
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function friendlyGroupError(error) {
  return error && error.message
    ? error.message
    : "We could not load the discussion right now. Please try again.";
}
