// Extract the unique ID of a lesson tile safely.
// Uses the UUID from the Thumbnail background image if available,
// falling back to the title if not.
function getLessonId(tileLi) {
  let idPart = "";
  const thumb = tileLi.querySelector(".Thumbnail");
  if (thumb && thumb.style.backgroundImage) {
    // Extract UUID format from background image URL
    const match = thumb.style.backgroundImage.match(
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
    );
    if (match) {
      idPart = match[1];
    }
  }

  let titleSpan = tileLi.querySelector(".LessonTile-title .historyLink");
  if (!titleSpan) {
    // Fallback for list view
    titleSpan = tileLi.querySelector(".StudentListModuleLesson-title");
  }
  if (!titleSpan) return idPart || null;

  // Clone the node to avoid modifying the actual page
  const clone = titleSpan.cloneNode(true);

  // Remove visually hidden text, tooltips, or screen reader elements ('Start', 'View', 'group lesson', etc.)
  const hiddenElements = clone.querySelectorAll(
    ".visually-hidden, .ScreenReaderOnly, .TooltipDiv",
  );
  hiddenElements.forEach((el) => el.remove());

  // Normalize spaces to avoid mismatch between grid and list view texts
  const titlePart = clone.textContent.replace(/\s+/g, " ").trim();

  if (idPart) {
    return idPart + "_" + titlePart;
  }
  return titlePart;
}

// Function to update the tile visually based on status
function updateTileUI(tileLi, lessonId, isCompleted) {
  const isListView = tileLi.classList.contains("StudentListModuleLesson");

  // Check if we need to update
  const existingBtn = tileLi.querySelector(".kura-custom-commit-btn");
  const existingOverlay = tileLi.querySelector(".kura-custom-overlay");
  const existingListBadge = tileLi.querySelector(".kura-custom-list-badge");

  // If native commit status already exists, skip entirely
  if (
    tileLi.querySelector(".RecentTile-committedStatus:not(.kura-custom-badge)")
  )
    return;

  // Cleanup old state
  if (existingBtn) existingBtn.remove();
  if (existingOverlay) existingOverlay.remove();
  if (existingListBadge) existingListBadge.remove();

  const button = document.createElement("button");
  button.className = "kura-custom-commit-btn";
  if (isListView) button.classList.add("list-view-btn");

  // We attach the click handler to our button
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle the state in chrome storage
    chrome.storage.local.get(["kuraCompletedActivities"], (result) => {
      let completed = result.kuraCompletedActivities || {};
      if (completed[lessonId]) {
        delete completed[lessonId];
      } else {
        completed[lessonId] = true;
      }
      chrome.storage.local.set({ kuraCompletedActivities: completed });
    });
  });

  if (isCompleted) {
    if (!isListView) {
      // Add custom "Committed" badge at the bottom for grid view
      const overlay = document.createElement("span");
      overlay.className = "LessonTile-overlay kura-custom-overlay";
      overlay.setAttribute("style", "width: 209px; height: 157px; order: 2;");

      // Simple custom badge (similar to original SVG layout)
      overlay.innerHTML = `
        <span class="RecentTile-committedStatus kura-custom-badge" style="position: absolute; bottom: 6px; left: 6px;">
          <svg version="1.1" x="0px" y="0px" width="16" height="16" viewBox="0 0 22 22" aria-hidden="true"><g><path fill="currentColor" d="M16.2,8.5l-1.6-1.6L9.6,12L7.3,9.7l-1.6,1.6l3.9,3.9l0,0l0,0L16.2,8.5z"></path><circle fill="none" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" cx="11" cy="11" r="10"></circle></g></svg>
          <span>Done</span>
        </span>
      `;

      // We append overlay to the LessonTile button
      const tileBtn = tileLi.querySelector(".LessonTile");
      if (tileBtn) {
        // Try to insert it before the lesson button (so it matches the original DOM order)
        const lessonActionBtn = tileBtn.querySelector(".LessonTile-button");
        if (lessonActionBtn) {
          tileBtn.insertBefore(overlay, lessonActionBtn);
        } else {
          tileBtn.appendChild(overlay);
        }
      }

      // Configure the button as an Undo (Uncommit) action
      button.textContent = "Undo";
      button.classList.add("kura-custom-undo");
      tileLi.appendChild(button);
    } else {
      // List view - button becomes the Done indicator
      button.innerHTML = `
        <span class="RecentTile-committedStatus kura-custom-badge">
          <svg version="1.1" x="0px" y="0px" width="16" height="16" viewBox="0 0 22 22" aria-hidden="true"><g><path fill="currentColor" d="M16.2,8.5l-1.6-1.6L9.6,12L7.3,9.7l-1.6,1.6l3.9,3.9l0,0l0,0L16.2,8.5z"></path><circle fill="none" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" cx="11" cy="11" r="10"></circle></g></svg>
          <span>Done</span>
        </span>
      `;
      button.classList.add("kura-custom-undo", "list-view-done-btn");

      const titleGroup = tileLi.querySelector(".ListView-mobileTitleGroup");
      if (titleGroup) {
        // Find the native sub-container for the badge
        const startSpan = titleGroup.querySelector(
          "span[style*='justify-self: start']",
        );
        if (startSpan) {
          startSpan.appendChild(button);
        } else {
          const wrapper = document.createElement("span");
          wrapper.style.justifySelf = "start";
          wrapper.className = "kura-custom-list-badge";
          wrapper.appendChild(button);
          titleGroup.appendChild(wrapper);
        }
      } else {
        tileLi.appendChild(button);
      }
    }
  } else {
    // Configure button as a manual commit action
    button.textContent = "Mark as Done";
    if (isListView) {
      const titleGroup = tileLi.querySelector(".ListView-mobileTitleGroup");
      if (titleGroup) {
        const startSpan = titleGroup.querySelector(
          "span[style*='justify-self: start']",
        );
        if (startSpan) {
          startSpan.appendChild(button);
        } else {
          const wrapper = document.createElement("span");
          wrapper.style.justifySelf = "start";
          wrapper.className = "kura-custom-list-badge";
          wrapper.appendChild(button);
          titleGroup.appendChild(wrapper);
        }
      } else {
        tileLi.appendChild(button);
      }
    } else {
      tileLi.appendChild(button);
    }
  }
}

// Function to scan and process all current lesson tiles on the page
function processLessonTiles() {
  const tiles = document.querySelectorAll(
    ".LessonTile-li, .StudentListModuleLesson",
  );
  if (!tiles.length) return;

  chrome.storage.local.get(["kuraCompletedActivities"], (result) => {
    const completed = result.kuraCompletedActivities || {};

    tiles.forEach((tile) => {
      // Check if it already has the native commit indicator or a due date
      const hasNativeCommit = !!tile.querySelector(
        ".RecentTile-committedStatus:not(.kura-custom-badge)",
      );
      const hasDueDate = !!tile.querySelector(".RecentTile-DueDate");

      // We don't want to interfere with native commits or assignments with due dates
      if (hasNativeCommit || hasDueDate) {
        // Remove our custom ones if any accidentally hung around
        const existingBtn = tile.querySelector(".kura-custom-commit-btn");
        if (existingBtn) existingBtn.remove();

        const existingOverlay = tile.querySelector(".kura-custom-overlay");
        if (existingOverlay) existingOverlay.remove();

        const existingListBadge = tile.querySelector(".kura-custom-list-badge");
        if (existingListBadge) existingListBadge.remove();

        return;
      }

      // Identify the tile uniquely
      const lessonId = getLessonId(tile);
      if (!lessonId) return; // Can't identify

      // Avoid reprocessing if it's already got our custom button (unless state changed)
      const isCompleted = !!completed[lessonId];

      const currentBtn = tile.querySelector(".kura-custom-commit-btn");
      if (currentBtn) {
        const currentlyCompleted =
          currentBtn.classList.contains("kura-custom-undo");
        if (currentlyCompleted === isCompleted) {
          return; // State matches, no UI update needed
        }
      }

      updateTileUI(tile, lessonId, isCompleted);
    });
  });
}

// Listen for storage changes across tabs/views
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.kuraCompletedActivities) {
    processLessonTiles();
  }
});

// SPA support: Observe DOM mutations and re-process tiles when they are added
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;
  for (const m of mutations) {
    if (m.addedNodes.length > 0) {
      shouldProcess = true;
      break;
    }
  }

  if (shouldProcess) {
    processLessonTiles();
  }
});

// Initial run
processLessonTiles();
observer.observe(document.body, { childList: true, subtree: true });
