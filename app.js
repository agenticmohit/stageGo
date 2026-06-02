// --- XSS Mitigation & Input Sanitization Utility ---
function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- Custom Centered Micro-Modal Alert & Inline Form Alerts ---
let alertDismissTimeout = null;

function showCustomAlert(title, message, type = 'info', onConfirm = null) {
    const alertModal = document.getElementById("custom-alert-modal");
    if (!alertModal) return;
    
    const alertContainer = alertModal.querySelector(".alert-container");
    const alertIcon = document.getElementById("custom-alert-icon");
    const alertTitle = document.getElementById("custom-alert-title");
    const alertMessage = document.getElementById("custom-alert-message");
    const okBtn = document.getElementById("custom-alert-ok-btn");
    
    // Clear any active timeout
    if (alertDismissTimeout) {
        clearTimeout(alertDismissTimeout);
        alertDismissTimeout = null;
    }
    
    // Reset and apply type class
    alertContainer.className = "alert-container alert-" + type;
    
    // Select matching icons for success/error/info
    let iconClass = "fa-solid fa-circle-info";
    if (type === 'success') iconClass = "fa-solid fa-circle-check";
    if (type === 'error') iconClass = "fa-solid fa-triangle-exclamation";
    
    alertIcon.innerHTML = `<i class="${iconClass}"></i>`;
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    
    // Create clean single-use event handler for Got it / Dismiss button
    const dismissAlert = () => {
        alertModal.classList.remove("active");
        setTimeout(() => {
            alertModal.classList.add("hidden");
            if (onConfirm) onConfirm();
        }, 300);
        okBtn.removeEventListener("click", dismissAlert);
    };
    
    okBtn.addEventListener("click", dismissAlert);
    
    // Show micro alert popup modal
    alertModal.classList.remove("hidden");
    setTimeout(() => {
        alertModal.classList.add("active");
    }, 10);
    
    // Auto-dismiss after 2.5 seconds for non-error notifications
    if (type !== 'error') {
        alertDismissTimeout = setTimeout(dismissAlert, 2500);
    }
}

// Override default browser alert function to render beautiful centered micro-modals
window.alert = function(message) {
    let type = 'info';
    let title = 'StageGo';
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('welcome back') || msgLower.includes('signed in') || msgLower.includes('logged in')) {
        type = 'success';
        title = 'Welcome';
    } else if (msgLower.includes('profile is ready') || msgLower.includes('account created') || msgLower.includes('ready')) {
        type = 'success';
        title = 'Profile Ready';
    } else if (msgLower.includes('saved') || msgLower.includes('updated') || msgLower.includes('changes saved')) {
        type = 'success';
        title = 'Changes Saved';
    } else if (msgLower.includes('reminder') || msgLower.includes('notify') || msgLower.includes('set for')) {
        type = 'success';
        title = 'Reminder Set';
    } else if (msgLower.includes('sign in') || msgLower.includes('unauthorized') || msgLower.includes('permission') || msgLower.includes('denied') || msgLower.includes('required')) {
        type = 'error';
        title = 'Sign In Alert';
    } else if (msgLower.includes('sign up error') || msgLower.includes('create profile') || msgLower.includes('register')) {
        type = 'error';
        title = 'Sign Up Issue';
    } else if (msgLower.includes('log in error') || msgLower.includes('sign in issue') || msgLower.includes('could not sign in')) {
        type = 'error';
        title = 'Sign In Issue';
    } else if (msgLower.includes('error') || msgLower.includes('failed') || msgLower.includes('connection lost')) {
        type = 'error';
        title = 'Alert';
    } else if (msgLower.includes('logged out') || msgLower.includes('signed out')) {
        type = 'info';
        title = 'Signed Out';
    }
    
    showCustomAlert(title, message, type);
};

// Inline Form Alerts Engine
function showFormAlert(formId, message, type = 'error') {
    const banner = document.getElementById(`${formId}-alert-banner`);
    if (!banner) return;
    
    const iconClass = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation';
    banner.className = `modal-alert-banner banner-${type}`;
    banner.innerHTML = `<i class="${iconClass}"></i> <span>${message}</span>`;
    banner.classList.remove("hidden");
}

function clearFormAlerts() {
    const banners = document.querySelectorAll(".modal-alert-banner");
    banners.forEach(b => {
        b.classList.add("hidden");
        b.innerHTML = "";
    });
}

// --- Live Music Events Data Cache ---
let eventsData = [];

// --- API Sync Helpers ---
async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error("Failed to load events from SQLite");
        eventsData = await response.json();
        if (currentUser) {
            await loadUserInterests();
            renderProfileSection();
        }
    } catch (error) {
        console.error("Database connection failure:", error);
    }
}

// --- User Interests & Profile Helper Routines ---
async function loadUserInterests() {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/users/${currentUser.id}/interests`);
        if (response.ok) {
            userInterests = await response.json();
        } else {
            console.error("Failed to load user interests");
        }
    } catch (err) {
        console.error("Error loading user interests:", err);
    }
}

async function toggleInterest(eventId) {
    if (!currentUser) {
        openSigninModal();
        showFormAlert('signin', "Please sign in to save concerts to your music space!", 'error');
        return;
    }
    
    const isInterested = userInterests.some(e => e.id === eventId);
    
    try {
        if (isInterested) {
            // DELETE Interest
            const response = await fetch(`/api/users/${currentUser.id}/interests/${eventId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await loadUserInterests();
                renderProfileSection();
                closeEventDetails();
                showCustomAlert("Removed", "Concert removed from your saved list.", "info");
            } else {
                showCustomAlert("Error", "Could not remove interest. Please try again.", "error");
            }
        } else {
            // POST Interest
            const response = await fetch(`/api/users/${currentUser.id}/interests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ event_id: eventId })
            });
            if (response.ok) {
                await loadUserInterests();
                renderProfileSection();
                closeEventDetails();
                showCustomAlert("Saved", "Saved! This concert has been added to your profile.", "success");
            } else {
                const err = await response.json();
                showCustomAlert("Error", `Could not save show: ${err.error || 'Please try again'}`, "error");
            }
        }
    } catch (err) {
        console.error("Interest toggle error:", err);
        showCustomAlert("Connection Error", "Connection lost: Failed to reach the server.", "error");
    }
}

function switchProfileTab(tabName) {
    activeProfileTab = tabName;
    if (tabName === 'saved') {
        tabSavedBtn.classList.add("active");
        tabCreatedBtn.classList.remove("active");
        
        profileSavedGrid.classList.remove("hidden");
        profileCreatedGrid.classList.add("hidden");
    } else {
        tabSavedBtn.classList.remove("active");
        tabCreatedBtn.classList.add("active");
        
        profileSavedGrid.classList.add("hidden");
        profileCreatedGrid.classList.remove("hidden");
    }
    renderProfileSection();
}

function showView(viewName) {
    if (viewName === 'profile') {
        if (!currentUser) return;
        homeView.classList.add("hidden");
        profileView.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        // Sync active state in navigation links
        document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(link => {
            if (link.getAttribute("href") === "#profile-section" || link.id === "nav-profile-link" || link.id === "mobile-profile-link") {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    } else {
        homeView.classList.remove("hidden");
        profileView.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        // Reset active state to Discover / Home
        document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(link => {
            if (link.getAttribute("href") === "#events-section") {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }
}
window.showView = showView;

function renderProfileSection() {
    if (!currentUser) {
        profileSection.classList.add("hidden");
        return;
    }
    
    // Make section visible and bind details
    profileSection.classList.remove("hidden");
    profileUsernameTag.textContent = currentUser.username;
    profileEmailSub.textContent = currentUser.email || `${currentUser.username}@stagego.com`;
    
    // Clear and build grids
    profileSavedGrid.innerHTML = "";
    profileCreatedGrid.innerHTML = "";
    
    // 1. Render Saved/Interested events
    if (userInterests.length === 0) {
        profileSavedGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-compact-disc fa-spin" style="font-size: 2rem; margin-bottom: 12px; color: rgba(255,62,85,0.2); animation-duration: 6s;"></i>
                <p>No saved shows yet. Click "Interested" on any event details page to add it here!</p>
            </div>
        `;
    } else {
        userInterests.forEach((event, index) => {
            const card = document.createElement("div");
            card.className = "event-card fading-in";
            card.setAttribute("data-id", event.id);
            card.innerHTML = `
                <div class="event-image-wrapper">
                    <img src="${escapeHTML(event.image)}" alt="${escapeHTML(event.name)}" class="event-image">
                    <div class="event-image-overlay"></div>
                    <div class="event-category-badge">${escapeHTML(event.category)}</div>
                </div>
                <div class="event-details">
                    <div class="event-info-left">
                        <h3 class="event-name">${escapeHTML(event.name)}</h3>
                    </div>
                    <div class="event-info-right">
                        <div class="tech-info-group">
                            <div class="tech-info-icon"><i class="fa-regular fa-calendar"></i></div>
                            <div class="tech-info-text">
                                <span class="info-label">DATE</span>
                                <span class="info-value">${escapeHTML(event.date)}</span>
                            </div>
                        </div>
                        <div class="tech-info-group">
                            <div class="tech-info-icon"><i class="fa-solid fa-map-pin"></i></div>
                            <div class="tech-info-text">
                                <span class="info-label">LOCATION</span>
                                <span class="info-value">${escapeHTML(event.venue)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="event-actions">
                        <button class="btn btn-primary" onclick="openEventDetails('${escapeHTML(event.id)}')" style="width: 100%;">
                            <span>Event Details</span>
                            <i class="fa-solid fa-circle-info"></i>
                        </button>
                    </div>
                </div>
            `;
            profileSavedGrid.appendChild(card);
        });
    }
    
    // 2. Render Created events
    const myCreatedEvents = eventsData.filter(e => e.user_id === currentUser.id);
    if (myCreatedEvents.length === 0) {
        profileCreatedGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-guitar" style="font-size: 2rem; margin-bottom: 12px; color: rgba(255,62,85,0.2);"></i>
                <p>No listed events yet. Click "Create Event" in the navigation bar to list your first show!</p>
            </div>
        `;
    } else {
        myCreatedEvents.forEach((event, index) => {
            const card = document.createElement("div");
            card.className = "event-card fading-in";
            card.setAttribute("data-id", event.id);
            card.innerHTML = `
                <div class="event-image-wrapper">
                    <img src="${escapeHTML(event.image)}" alt="${escapeHTML(event.name)}" class="event-image">
                    <div class="event-image-overlay"></div>
                    <div class="event-category-badge">${escapeHTML(event.category)}</div>
                </div>
                <div class="event-details">
                    <div class="event-info-left">
                        <h3 class="event-name">${escapeHTML(event.name)}</h3>
                    </div>
                    <div class="event-info-right">
                        <div class="tech-info-group">
                            <div class="tech-info-icon"><i class="fa-regular fa-calendar"></i></div>
                            <div class="tech-info-text">
                                <span class="info-label">DATE</span>
                                <span class="info-value">${escapeHTML(event.date)}</span>
                            </div>
                        </div>
                        <div class="tech-info-group">
                            <div class="tech-info-icon"><i class="fa-solid fa-map-pin"></i></div>
                            <div class="tech-info-text">
                                <span class="info-label">LOCATION</span>
                                <span class="info-value">${escapeHTML(event.venue)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="event-actions">
                        <button class="btn btn-primary" onclick="openEventDetails('${escapeHTML(event.id)}')" style="width: 100%;">
                            <span>Event Details</span>
                            <i class="fa-solid fa-circle-info"></i>
                        </button>
                    </div>
                </div>
            `;
            profileCreatedGrid.appendChild(card);
        });
    }
}

// --- App State Management ---
let currentCategory = "all";
let searchQuery = "";
let editingEventId = null;
let currentUser = JSON.parse(sessionStorage.getItem("currentUser")) || null;

// --- DOM Elements ---
const eventsList = document.getElementById("events-list");
const filterContainer = document.getElementById("filter-container");
const resultsCountElement = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const resetFiltersBtn = document.getElementById("reset-filters-btn");

// Navigation & Drawer
const navbar = document.getElementById("navbar");
const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileDrawer = document.getElementById("mobile-drawer");

// Hero Soundwaves Interaction
const joinBtn = document.getElementById("join-movement-btn");
const soundwave = document.getElementById("soundwave");

// Background Parallax Orbs
const orb1 = document.getElementById("orb-1");
const orb2 = document.getElementById("orb-2");

// Create Event Modal DOM Elements
const createEventModal = document.getElementById("create-event-modal");
const createModalCloseBtn = document.getElementById("create-modal-close-btn");
const createEventForm = document.getElementById("create-event-form");
const navCreateEventLink = document.getElementById("nav-create-event-link");
const mobileCreateEventLink = document.getElementById("mobile-create-event-link");
const eventImageFileInput = document.getElementById("event-image-file");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const uploadPreview = document.getElementById("upload-preview");
const imageUploadZone = document.getElementById("image-upload-zone");
let uploadedImageBase64 = "";

// Auth Modals DOM Elements
const signupModal = document.getElementById("signup-modal");
const signupModalCloseBtn = document.getElementById("signup-modal-close-btn");
const signupForm = document.getElementById("signup-form");

const signinModal = document.getElementById("signin-modal");
const signinModalCloseBtn = document.getElementById("signin-modal-close-btn");
const signinForm = document.getElementById("signin-form");

const navLoginBtn = document.getElementById("nav-login-btn");
const navSignupBtn = document.getElementById("nav-signup-btn");
const mobileLoginBtn = document.getElementById("mobile-login-btn");
const mobileSignupBtn = document.getElementById("mobile-signup-btn");

const toSigninLink = document.getElementById("to-signin-link");
const toSignupLink = document.getElementById("to-signup-link");

// Guest vs User Header Panel DOM Selectors
const authGuestLinks = document.getElementById("auth-guest-links");
const authUserPanel = document.getElementById("auth-user-panel");
const userGreetingText = document.getElementById("user-greeting-text");
const navLogoutBtn = document.getElementById("nav-logout-btn");

// Guest vs User Mobile Panel DOM Selectors
const mobileAuthGuestLinks = document.getElementById("mobile-auth-guest-links");
const mobileAuthUserPanel = document.getElementById("mobile-auth-user-panel");
const mobileUserGreetingText = document.getElementById("mobile-user-greeting-text");
const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

// Profile Section DOM Selectors
const navProfileLink = document.getElementById("nav-profile-link");
const mobileProfileLink = document.getElementById("mobile-profile-link");
const profileSection = document.getElementById("profile-section");
const profileUsernameTag = document.getElementById("profile-username-tag");
const profileEmailSub = document.getElementById("profile-email-sub");
const profileSavedGrid = document.getElementById("profile-saved-grid");
const profileCreatedGrid = document.getElementById("profile-created-grid");
const tabSavedBtn = document.getElementById("tab-saved-btn");
const tabCreatedBtn = document.getElementById("tab-created-btn");

const homeView = document.getElementById("home-view");
const profileView = document.getElementById("profile-view");

// Profile & Interests State
let userInterests = [];
let activeProfileTab = "saved";

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents();
    syncAuthUI();
    renderEvents();
    setupEventListeners();
});

// --- Dynamic Event Card Renderer ---
function renderEvents() {
    // 1. Filter the datasets
    const filteredEvents = eventsData.filter(event => {
        const matchesCategory = currentCategory === "all" || event.category === currentCategory;
        const searchString = `${event.name} ${event.description} ${event.venue} ${event.location} ${event.category}`.toLowerCase();
        const matchesSearch = searchString.includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // 2. Clear listing
    eventsList.innerHTML = "";

    // 3. Update result counter badge
    const countValueElement = resultsCountElement.querySelector(".count-value");
    countValueElement.textContent = filteredEvents.length;
    
    // Toggle Empty State if none match
    if (filteredEvents.length === 0) {
        emptyState.classList.remove("hidden");
        eventsList.appendChild(emptyState);
    } else {
        emptyState.classList.add("hidden");
    }

    // 4. Stagger-render cards with scale/opacity fade animations
    filteredEvents.forEach((event, index) => {
        const card = document.createElement("div");
        card.className = "event-card fading-out";
        card.setAttribute("data-id", event.id);

        card.innerHTML = `
            <div class="event-image-wrapper">
                <img src="${escapeHTML(event.image)}" alt="${escapeHTML(event.name)}" class="event-image">
                <div class="event-image-overlay"></div>
                <div class="event-category-badge">${escapeHTML(event.category)}</div>
            </div>
            
            <div class="event-details">
                <div class="event-info-left">
                    <h3 class="event-name">${escapeHTML(event.name)}</h3>
                </div>
                
                <div class="event-info-right">
                    <div class="tech-info-group">
                        <div class="tech-info-icon"><i class="fa-regular fa-calendar"></i></div>
                        <div class="tech-info-text">
                            <span class="info-label">DATE</span>
                            <span class="info-value">${escapeHTML(event.date)}</span>
                        </div>
                    </div>
                    
                    <div class="tech-info-group">
                        <div class="tech-info-icon"><i class="fa-solid fa-map-pin"></i></div>
                        <div class="tech-info-text">
                            <span class="info-label">LOCATION</span>
                            <span class="info-value">${escapeHTML(event.venue)}</span>
                            <span class="value-sub">${escapeHTML(event.location)}</span>
                        </div>
                    </div>
                </div>

                <div class="event-actions">
                    <button class="btn btn-primary" onclick="openEventDetails('${escapeHTML(event.id)}')">
                        <span>Event Details</span>
                        <i class="fa-solid fa-circle-info"></i>
                    </button>
                </div>
            </div>
        `;

        eventsList.appendChild(card);

        // Micro-stagger timeout for smooth entrance
        setTimeout(() => {
            card.classList.remove("fading-out");
            card.classList.add("fading-in");
        }, index * 80);
    });
}

// --- Smooth Filter Transition Trigger ---
function triggerFilterTransitions() {
    const cards = eventsList.querySelectorAll(".event-card");
    
    // Add fading-out class to current elements
    cards.forEach(card => {
        card.classList.remove("fading-in");
        card.classList.add("fading-out");
    });

    // Wait for the exit animation, then re-render
    setTimeout(() => {
        renderEvents();
    }, 250);
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    
    // Category Pills selection
    filterContainer.addEventListener("click", (e) => {
        const button = e.target.closest(".filter-pill");
        if (!button) return;

        // Reset active state for all pills
        filterContainer.querySelectorAll(".filter-pill").forEach(pill => {
            pill.classList.remove("active");
        });

        // Activate selected pill
        button.classList.add("active");
        currentCategory = button.getAttribute("data-category");
        triggerFilterTransitions();
    });

    // Shortcut ESC key closes modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (detailsModal.classList.contains("active")) closeEventDetails();
            if (createEventModal.classList.contains("active")) closeCreateEventModal();
            if (signupModal.classList.contains("active")) closeSignupModal();
            if (signinModal.classList.contains("active")) closeSigninModal();
        }
    });

    // Reset Filter Button on Empty State
    resetFiltersBtn.addEventListener("click", () => {
        currentCategory = "all";
        
        filterContainer.querySelectorAll(".filter-pill").forEach(pill => {
            pill.classList.remove("active");
            if (pill.getAttribute("data-category") === "all") {
                pill.classList.add("active");
            }
        });
        
        triggerFilterTransitions();
    });

    // Mobile Hamburger Toggle
    mobileMenuToggle.addEventListener("click", () => {
        mobileMenuToggle.classList.toggle("active");
        mobileDrawer.classList.toggle("open");
    });

    // Close Mobile Drawer when clicking links inside it
    mobileDrawer.addEventListener("click", (e) => {
        if (e.target.closest(".mobile-nav-link") || e.target.closest(".mobile-drawer-btn")) {
            mobileMenuToggle.classList.remove("active");
            mobileDrawer.classList.remove("open");
        }
    });

    // Header sticky transition on scroll
    window.addEventListener("scroll", () => {
        if (window.scrollY > 40) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    });

    // Soundwave intensification hover effect
    joinBtn.addEventListener("mouseenter", () => {
        soundwave.classList.add("intensify");
    });
    
    joinBtn.addEventListener("mouseleave", () => {
        soundwave.classList.remove("intensify");
    });

    // Modal Close Button click
    modalCloseBtn.addEventListener("click", closeEventDetails);

    // Modal Backdrop click to close
    detailsModal.addEventListener("click", (e) => {
        if (e.target === detailsModal) {
            closeEventDetails();
        }
    });

    // Create Event Link Click (Top nav & mobile drawer with Auth barriers)
    navCreateEventLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (!currentUser) {
            openSigninModal();
            showFormAlert('signin', "Sign in required to list new concert events!");
            return;
        }
        prepareCreateEventForm();
        openCreateEventModal();
    });

    mobileCreateEventLink.addEventListener("click", (e) => {
        e.preventDefault();
        mobileMenuToggle.classList.remove("active");
        mobileDrawer.classList.remove("open");
        if (!currentUser) {
            openSigninModal();
            showFormAlert('signin', "Sign in required to list new concert events!");
            return;
        }
        prepareCreateEventForm();
        openCreateEventModal();
    });
    mobileProfileLink.addEventListener("click", (e) => {
        e.preventDefault();
        mobileMenuToggle.classList.remove("active");
        mobileDrawer.classList.remove("open");
        showView('profile');
    });

    navProfileLink.addEventListener("click", (e) => {
        e.preventDefault();
        showView('profile');
    });

    userGreetingText.addEventListener("click", () => {
        showView('profile');
    });

    mobileUserGreetingText.addEventListener("click", () => {
        mobileMenuToggle.classList.remove("active");
        mobileDrawer.classList.remove("open");
        showView('profile');
    });

    document.getElementById("nav-logo").addEventListener("click", (e) => {
        e.preventDefault();
        showView('home');
    });

    document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(link => {
        const href = link.getAttribute("href");
        if (href === "#hero" || href === "#events-section") {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                showView('home');
                const targetEl = document.querySelector(href);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    });
    // Create Event Modal Close controls
    createModalCloseBtn.addEventListener("click", closeCreateEventModal);
    createEventModal.addEventListener("click", (e) => {
        if (e.target === createEventModal) {
            closeCreateEventModal();
        }
    });

    // Image Upload Zone & File Processing
    imageUploadZone.addEventListener("click", () => {
        eventImageFileInput.click();
    });

    eventImageFileInput.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    eventImageFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedImageBase64 = event.target.result;
                uploadPreview.src = uploadedImageBase64;
                uploadPreview.classList.remove("hidden");
                uploadPlaceholder.classList.add("hidden");
            };
            reader.readAsDataURL(file);
        }
    });

    // Create/Edit Event Form Submission (REST API Sync)
    createEventForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormAlerts();

        const titleVal = document.getElementById("event-title").value;
        const categoryVal = document.getElementById("event-category").value;
        const dateVal = document.getElementById("event-date").value;
        const timeVal = document.getElementById("event-time").value;
        const venueVal = document.getElementById("event-venue").value;
        const locationVal = document.getElementById("event-location").value;
        const descVal = document.getElementById("event-description").value;

        if (!titleVal.trim()) {
            showFormAlert('create', "Event name / title is required.");
            return;
        }
        if (!dateVal.trim()) {
            showFormAlert('create', "Concert date is required.");
            return;
        }
        if (!timeVal.trim()) {
            showFormAlert('create', "Concert time window is required.");
            return;
        }
        if (!venueVal.trim()) {
            showFormAlert('create', "Venue / Hall name is required.");
            return;
        }
        if (!locationVal.trim()) {
            showFormAlert('create', "City region / sector is required.");
            return;
        }
        if (!descVal.trim()) {
            showFormAlert('create', "Concert description is required.");
            return;
        }

        if (editingEventId) {
            // EDIT MODE: PUT request to Flask SQLite backend
            const eventIndex = eventsData.findIndex(evt => evt.id === editingEventId);
            if (eventIndex !== -1) {
                const updatedPayload = {
                    name: titleVal,
                    category: categoryVal,
                    date: dateVal,
                    time: timeVal,
                    venue: venueVal,
                    location: locationVal,
                    description: descVal,
                    image: uploadedImageBase64 || eventsData[eventIndex].image,
                    user_id: currentUser ? currentUser.id : null
                };

                try {
                    const response = await fetch(`/api/events/${editingEventId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedPayload)
                    });

                    if (response.ok) {
                        const updatedId = editingEventId;
                        
                        // Sync cache from backend
                        await loadEvents();

                        // Reset form state
                        createEventForm.reset();
                        uploadedImageBase64 = "";
                        uploadPreview.src = "";
                        uploadPreview.classList.add("hidden");
                        uploadPlaceholder.classList.remove("hidden");

                        // Close editor & refresh grid
                        closeCreateEventModal();
                        triggerFilterTransitions();

                        // Show clean changes saved notification
                        showCustomAlert("Changes Saved", "Your changes have been saved successfully!", "success");
                    } else {
                        const err = await response.json();
                        showFormAlert('create', `Error: ${err.error || 'Failed to update event'}`);
                    }
                } catch (err) {
                    console.error("PUT request error:", err);
                    showFormAlert('create', "Network error: Failed to reach backend server.");
                }
            }
            editingEventId = null;
        } else {
            // CREATE MODE: POST request to Flask SQLite backend
            const newId = `evt-${Date.now()}`;
            const newEvent = {
                id: newId,
                name: titleVal,
                description: descVal,
                venue: venueVal,
                location: locationVal,
                date: dateVal,
                time: timeVal,
                category: categoryVal,
                image: uploadedImageBase64 || `assets/${categoryVal}.png`, // Fallback to category asset
                user_id: currentUser ? currentUser.id : null
            };

            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newEvent)
                });

                if (response.ok) {
                    // Sync cache from backend
                    await loadEvents();

                    // Reset form state
                    createEventForm.reset();
                    uploadedImageBase64 = "";
                    uploadPreview.src = "";
                    uploadPreview.classList.add("hidden");
                    uploadPlaceholder.classList.remove("hidden");

                    // Close creator & refresh grid
                    closeCreateEventModal();
                    triggerFilterTransitions();

                    // Show clean event listed success notification
                    showCustomAlert("Event Created", "Your music event has been created successfully!", "success");
                } else {
                    const err = await response.json();
                    showFormAlert('create', `Error: ${err.error || 'Failed to create event'}`);
                }
            } catch (err) {
                console.error("POST request error:", err);
                showFormAlert('create', "Network error: Failed to reach backend server.");
            }
        }
    });
    // Mouse movement parallax effect for floating backdrop orbs
    document.addEventListener("mousemove", (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Calculate offset percentage from screen center
        const offsetX = (mouseX - window.innerWidth / 2) / (window.innerWidth / 2);
        const offsetY = (mouseY - window.innerHeight / 2) / (window.innerHeight / 2);
        
        // Drift orbs slightly in opposite directions
        orb1.style.transform = `translate(${offsetX * -35}px, ${offsetY * -35}px)`;
        orb2.style.transform = `translate(${offsetX * 40}px, ${offsetY * 40}px)`;
    });

    // --- Sign Up Modal Close controls ---
    signupModalCloseBtn.addEventListener("click", closeSignupModal);
    signupModal.addEventListener("click", (e) => {
        if (e.target === signupModal) closeSignupModal();
    });

    // --- Sign In Modal Close controls ---
    signinModalCloseBtn.addEventListener("click", closeSigninModal);
    signinModal.addEventListener("click", (e) => {
        if (e.target === signinModal) closeSigninModal();
    });

    // --- Cross-Auth Modals switching links ---
    toSigninLink.addEventListener("click", (e) => {
        e.preventDefault();
        closeSignupModal();
        setTimeout(openSigninModal, 350);
    });

    toSignupLink.addEventListener("click", (e) => {
        e.preventDefault();
        closeSigninModal();
        setTimeout(openSignupModal, 350);
    });

    // --- Auth navigation & button click triggers ---
    navLoginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openSigninModal();
    });

    navSignupBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openSignupModal();
    });

    mobileLoginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openSigninModal();
    });

    mobileSignupBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openSignupModal();
    });

    joinBtn.addEventListener("click", () => {
        openSignupModal();
    });

    // --- Logout click handlers ---
    navLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
    });

    mobileLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        mobileMenuToggle.classList.remove("active");
        mobileDrawer.classList.remove("open");
        logout();
    });

    // --- Sign Up Form AJAX Submission ---
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormAlerts();
        const usernameVal = document.getElementById("signup-username").value;
        const emailVal = document.getElementById("signup-email").value;
        const passwordVal = document.getElementById("signup-password").value;

        if (!usernameVal.trim()) {
            showFormAlert('signup', "Username is required to register.");
            return;
        }
        if (!emailVal.trim()) {
            showFormAlert('signup', "Email address is required.");
            return;
        }
        if (!passwordVal.trim()) {
            showFormAlert('signup', "Password is required.");
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: usernameVal,
                    email: emailVal,
                    password: passwordVal
                })
            });
            
            if (response.ok) {
                signupForm.reset();
                closeSignupModal();
                showCustomAlert("Profile Ready", "Your StageGo profile is ready! Opening sign-in screen...", "success", () => {
                    openSigninModal();
                    showFormAlert('signin', "Account created successfully! Please sign in.", "success");
                });
            } else {
                const err = await response.json();
                showFormAlert('signup', `Could not create profile: ${err.error || 'Registration failed'}`);
            }
        } catch (err) {
            console.error("Signup network error:", err);
            showFormAlert('signup', "Connection lost: Could not reach the authentication server.");
        }
    });

    // --- Sign In Form AJAX Submission ---
    signinForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormAlerts();
        const emailVal = document.getElementById("signin-email").value;
        const passwordVal = document.getElementById("signin-password").value;

        if (!emailVal.trim()) {
            showFormAlert('signin', "Username or email is required.");
            return;
        }
        if (!passwordVal.trim()) {
            showFormAlert('signin', "Password is required.");
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailVal,
                    password: passwordVal
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Cache user identity dynamically
                currentUser = data.user;
                sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
                
                syncAuthUI();
                renderEvents();

                signinForm.reset();
                closeSigninModal();
                showCustomAlert("Welcome Back", `Welcome back, ${currentUser.username}! You are now signed in.`, "success");
            } else {
                const err = await response.json();
                showFormAlert('signin', `Could not sign in: ${err.error || 'Authentication failed'}`);
            }
        } catch (err) {
            console.error("Login network error:", err);
            showFormAlert('signin', "Connection lost: Could not reach the authentication server.");
        }
    });
}

// --- Modal Interactive Controls ---
const detailsModal = document.getElementById("details-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalContentArea = document.getElementById("modal-content-area");

function openEventDetails(eventId, successStatus = null) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    let successBadgeHtml = "";
    if (successStatus === 'created') {
        successBadgeHtml = `
            <div class="success-tag">
                <i class="fa-solid fa-circle-check"></i>
                <span>Event Created Successfully!</span>
            </div>
        `;
    } else if (successStatus === 'edited') {
        successBadgeHtml = `
            <div class="success-tag">
                <i class="fa-solid fa-circle-check"></i>
                <span>Changes Saved Successfully!</span>
            </div>
        `;
    }

    modalContentArea.innerHTML = `
        <img src="${escapeHTML(event.image)}" alt="${escapeHTML(event.name)}" class="modal-hero-image">
        <div class="modal-body">
            ${successBadgeHtml}
            <div class="modal-header-group">
                <div class="tech-badge" style="margin-bottom: 12px; align-self: flex-start; background: rgba(255, 62, 85, 0.08); border: 1px solid var(--border-neon-red); color: var(--text-bright); padding: 4px 12px; border-radius: 20px; font-family: var(--font-tech); font-size: 0.7rem; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-music"></i>
                    <span>GENRE: ${escapeHTML(event.category.toUpperCase())}</span>
                </div>
                <h2 class="modal-title">${escapeHTML(event.name)}</h2>
            </div>
            
            <p class="modal-desc">${escapeHTML(event.description)}</p>
            
            <div class="modal-meta-grid">
                <div class="tech-info-group">
                    <div class="tech-info-icon"><i class="fa-regular fa-calendar"></i></div>
                    <div class="tech-info-text">
                        <span class="info-label">DATE</span>
                        <span class="info-value">${escapeHTML(event.date)}</span>
                    </div>
                </div>
                
                <div class="tech-info-group">
                    <div class="tech-info-icon"><i class="fa-regular fa-clock"></i></div>
                    <div class="tech-info-text">
                        <span class="info-label">TIME</span>
                        <span class="info-value">${escapeHTML(event.time)}</span>
                        <span class="value-sub">GMT+05:30</span>
                    </div>
                </div>
                
                <div class="tech-info-group" style="grid-column: span 2;">
                    <div class="tech-info-icon"><i class="fa-solid fa-map-pin"></i></div>
                    <div class="tech-info-text">
                        <span class="info-label">VENUE & LOCATION</span>
                        <span class="info-value">${escapeHTML(event.venue)}</span>
                        <span class="value-sub">${escapeHTML(event.location)}</span>
                    </div>
                </div>
            </div>

            ${(currentUser && event.user_id === currentUser.id) ? `
            <!-- Creator Action Panel -->
            <div class="creator-controls" id="creator-controls-container" style="display: flex;">
                <button class="btn btn-edit" onclick="initiateEditEvent('${escapeHTML(event.id)}')">
                    <span>Edit Event</span>
                    <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="btn btn-delete" onclick="initiateDeleteEvent('${escapeHTML(event.id)}')">
                    <span>Delete Event</span>
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
            ` : `
            <!-- Interested Button to add to User Profile -->
            <div class="event-actions" style="margin-top: 10px;">
                <button class="btn ${userInterests.some(e => e.id === event.id) ? 'btn-primary' : 'btn-secondary'}" onclick="toggleInterest('${escapeHTML(event.id)}')" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
                    <span>${userInterests.some(e => e.id === event.id) ? 'Saved to Space' : 'Interested'}</span>
                    <i class="${userInterests.some(e => e.id === event.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
                </button>
            </div>
            `}
        </div>
    `;

    detailsModal.classList.remove("hidden");
    // Trigger transition reflow
    setTimeout(() => {
        detailsModal.classList.add("active");
    }, 10);
}

function closeEventDetails() {
    detailsModal.classList.remove("active");
    setTimeout(() => {
        detailsModal.classList.add("hidden");
    }, 400);
}

// --- Create Event Modal Interactive Controls ---
function openCreateEventModal() {
    clearFormAlerts();
    createEventModal.classList.remove("hidden");
    setTimeout(() => {
        createEventModal.classList.add("active");
    }, 10);
}

function closeCreateEventModal() {
    createEventModal.classList.remove("active");
    setTimeout(() => {
        createEventModal.classList.add("hidden");
    }, 400);
}

// --- Auth Modals Interactive Controls ---
function openSignupModal() {
    clearFormAlerts();
    signupModal.classList.remove("hidden");
    setTimeout(() => {
        signupModal.classList.add("active");
    }, 10);
}

function closeSignupModal() {
    signupModal.classList.remove("active");
    setTimeout(() => {
        signupModal.classList.add("hidden");
    }, 400);
}

function openSigninModal() {
    clearFormAlerts();
    signinModal.classList.remove("hidden");
    setTimeout(() => {
        signinModal.classList.add("active");
    }, 10);
}

function closeSigninModal() {
    signinModal.classList.remove("active");
    setTimeout(() => {
        signinModal.classList.add("hidden");
    }, 400);
}
// --- Auth State Sync Helpers ---
async function syncAuthUI() {
    if (currentUser) {
        // Load interests from DB first
        await loadUserInterests();

        // Desktop Navbar
        authGuestLinks.classList.add("hidden");
        authUserPanel.classList.remove("hidden");
        userGreetingText.textContent = `Welcome, ${currentUser.username}!`;
        navProfileLink.classList.remove("hidden");

        // Mobile Drawer
        mobileAuthGuestLinks.classList.add("hidden");
        mobileAuthUserPanel.classList.remove("hidden");
        mobileUserGreetingText.textContent = `Welcome, ${currentUser.username}!`;
        mobileProfileLink.classList.remove("hidden");
        
        // Render user space
        renderProfileSection();
    } else {
        // Desktop Navbar
        authGuestLinks.classList.remove("hidden");
        authUserPanel.classList.add("hidden");
        userGreetingText.textContent = "";
        navProfileLink.classList.add("hidden");

        // Mobile Drawer
        mobileAuthGuestLinks.classList.remove("hidden");
        mobileAuthUserPanel.classList.add("hidden");
        mobileUserGreetingText.textContent = "";
        mobileProfileLink.classList.add("hidden");
        
        // Clear interests & hide profile
        userInterests = [];
        renderProfileSection();
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem("currentUser");
    showView('home');
    syncAuthUI();
    renderEvents(); // Re-render cards list
    showCustomAlert("Signed Out", "Signed out successfully! Returning to guest view.", "success");
}

// --- Event Management Functions ---
function prepareCreateEventForm() {
    editingEventId = null;
    createEventForm.reset();
    uploadedImageBase64 = "";
    uploadPreview.src = "";
    uploadPreview.classList.add("hidden");
    uploadPlaceholder.classList.remove("hidden");

    // Reset Creation modal header text and button states
    document.getElementById("create-modal-tag").innerHTML = `<i class="fa-solid fa-calendar-plus"></i> EVENT GENERATOR`;
    document.getElementById("create-modal-title").textContent = "Create Music Event";
    
    const submitBtn = document.getElementById("create-form-submit-btn");
    submitBtn.innerHTML = `
        <span>Create Live Event</span>
        <i class="fa-solid fa-square-plus"></i>
    `;
}

function initiateEditEvent(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    // Set active editing context ID
    editingEventId = eventId;

    // Fill the inputs in the Create Form with existing details
    document.getElementById("event-title").value = event.name;
    document.getElementById("event-category").value = event.category;
    document.getElementById("event-date").value = event.date;
    document.getElementById("event-time").value = event.time;
    document.getElementById("event-venue").value = event.venue;
    document.getElementById("event-location").value = event.location;
    document.getElementById("event-description").value = event.description;

    // Show image preview
    uploadedImageBase64 = event.image;
    uploadPreview.src = event.image;
    uploadPreview.classList.remove("hidden");
    uploadPlaceholder.classList.add("hidden");

    // Dynamic label and button swaps for Editing State
    document.getElementById("create-modal-tag").innerHTML = `<i class="fa-solid fa-pen-to-square"></i> EVENT EDITOR`;
    document.getElementById("create-modal-title").textContent = "Edit Music Event";
    
    const submitBtn = document.getElementById("create-form-submit-btn");
    submitBtn.innerHTML = `
        <span>Save Changes</span>
        <i class="fa-solid fa-check-double"></i>
    `;

    // Close details view with slide transition, then open the dynamic editor form
    closeEventDetails();
    setTimeout(() => {
        openCreateEventModal();
    }, 350);
}

function initiateDeleteEvent(eventId) {
    const container = document.getElementById("creator-controls-container");
    if (!container) return;

    // Inline deletion confirmation markup
    container.outerHTML = `
        <div class="delete-confirm-container" id="delete-confirm-wrapper">
            <div class="delete-prompt-text">Permanently delete this music event?</div>
            <div class="delete-confirm-actions">
                <button class="btn btn-danger-glow" onclick="executeDeleteEvent('${eventId}')">
                    <span>Confirm Delete</span>
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <button class="btn btn-secondary" onclick="cancelDeleteEvent('${eventId}')" style="flex: 1;">
                    <span>Cancel</span>
                </button>
            </div>
        </div>
    `;
}

function cancelDeleteEvent(eventId) {
    // Return to default Action Panel
    openEventDetails(eventId);
}

async function executeDeleteEvent(eventId) {
    if (!currentUser) {
        showCustomAlert("Unauthorized", "Unauthorized access session.", "error");
        return;
    }
    try {
        const response = await fetch(`/api/events/${eventId}?user_id=${currentUser.id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Sync cache from backend
            await loadEvents();

            // Close Details view & refresh grid
            closeEventDetails();
            triggerFilterTransitions();
        } else {
            const err = await response.json();
            showCustomAlert("Error", `Error: ${err.error || 'Failed to delete event'}`, "error");
        }
    } catch (err) {
        console.error("DELETE request error:", err);
        showCustomAlert("Error", "Network error: Failed to reach backend server.", "error");
    }
}

