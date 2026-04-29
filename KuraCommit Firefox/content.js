// Extract the title of a lesson tile safely.
// Native DOM uses screen-reader elements that prefix 'View' or 'Start' to the title.
function getLessonTitle(tileLi) {
  const titleSpan = tileLi.querySelector(".LessonTile-title .historyLink");
  if (!titleSpan) return null;

  // Clone the node to avoid modifying the actual page
  const clone = titleSpan.cloneNode(true);

  // Remove visually hidden text ('Start', 'View', etc.)
  const hiddenElements = clone.querySelectorAll(".visually-hidden");
  hiddenElements.forEach((el) => el.remove());

  return clone.textContent.trim();
}

// Function to update the tile visually based on status
function updateTileUI(tileLi, title, isCompleted) {
  // Check if we need to update
  const existingBtn = tileLi.querySelector(".kura-custom-commit-btn");
  const existingOverlay = tileLi.querySelector(".kura-custom-overlay");

  // If native commit status already exists, skip entirely
  if (
    tileLi.querySelector(".RecentTile-committedStatus:not(.kura-custom-badge)")
  )
    return;

  // Cleanup old state
  if (existingBtn) existingBtn.remove();
  if (existingOverlay) existingOverlay.remove();

  const button = document.createElement("button");
  button.className = "kura-custom-commit-btn";

  // We attach the click handler to our button
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle the state in browser storage
    browser.storage.local.get(["kuraCompletedActivities"]).then((result) => {
      let completed = result.kuraCompletedActivities || {};
      if (completed[title]) {
        delete completed[title];
      } else {
        completed[title] = true;
      }
      browser.storage.local
        .set({ kuraCompletedActivities: completed })
        .then(() => {
          // Re-run the update for just this tile
          updateTileUI(tileLi, title, !isCompleted);
        });
    });
  });

  if (isCompleted) {
    // Add custom "Committed" badge at the bottom
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
  } else {
    // Configure button as a manual commit action
    button.textContent = "Mark as Done";
  }

  // Add the floating action button to the li container directly
  tileLi.appendChild(button);
}

// Function to scan and process all current lesson tiles on the page
function processLessonTiles() {
  const tiles = document.querySelectorAll(".LessonTile-li");
  if (!tiles.length) return;

  browser.storage.local.get(["kuraCompletedActivities"]).then((result) => {
    const completed = result.kuraCompletedActivities || {};

    tiles.forEach((tile) => {
      // Check if it already has the native commit indicator
      const hasNativeCommit = !!tile.querySelector(
        ".RecentTile-committedStatus:not(.kura-custom-badge)",
      );

      // We don't want to interfere with native commits
      if (hasNativeCommit) {
        // Remove our custom ones if any accidentally hung around
        const existingBtn = tile.querySelector(".kura-custom-commit-btn");
        if (existingBtn) existingBtn.remove();

        const existingOverlay = tile.querySelector(".kura-custom-overlay");
        if (existingOverlay) existingOverlay.remove();

        return;
      }

      // Identify the tile uniquely
      const title = getLessonTitle(tile);
      if (!title) return; // Can't identify

      // Avoid reprocessing if it's already got our custom button (unless state changed)
      const isCompleted = !!completed[title];

      const currentBtn = tile.querySelector(".kura-custom-commit-btn");
      if (currentBtn) {
        const currentlyCompleted =
          currentBtn.classList.contains("kura-custom-undo");
        if (currentlyCompleted === isCompleted) {
          return; // State matches, no UI update needed
        }
      }

      updateTileUI(tile, title, isCompleted);
    });
  });
}

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
