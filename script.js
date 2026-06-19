/**
 * Lee Yukesh Portfolio - Core JavaScript
 * 
 * Includes:
 * - Firebase Firestore integration (with LocalStorage fallback)
 * - Creator Portal Authentication (Passcode: yukesh11)
 * - Dynamic project rendering & category filtering
 * - Typewriter subtitle animation in Hero section
 * - Scroll animations (Intersection Observer)
 * - Contact Form validation & submission feedback
 */

// ==========================================================================
// 1. FIREBASE CONFIGURATION (Option B)
// ==========================================================================
// To connect your portfolio to a live Cloud Database:
// 1. Go to https://console.firebase.google.com/
// 2. Create a free Firebase project.
// 3. Add a Web App to your project and copy the config details.
// 4. In the Firebase console, go to "Firestore Database" and create a database.
//    Ensure your Firestore Security Rules allow public read and authenticated write.
// 5. Replace the placeholder config below with your actual credentials.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if Firebase has been configured by the user
const isFirebaseConfigured = 
  firebaseConfig.projectId && 
  firebaseConfig.projectId !== "YOUR_PROJECT_ID" && 
  firebaseConfig.projectId !== "";

// ==========================================================================
// 2. INITIAL SEED DATA / FALLBACK PROJECTS
// ==========================================================================
const DEFAULT_PROJECTS = [
  {
    id: "seed-1",
    title: "Cinematic Travel Vlog - Ladakh Adventure",
    desc: "A high-energy, cinematically graded vlog edited in DaVinci Resolve. Showcases sound design, smooth transitions, speed ramping, and storytelling techniques.",
    category: "video",
    tags: ["DaVinci Resolve", "Vlogging", "Color Grading"],
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80",
    link: "https://youtube.com",
    github: ""
  },
  {
    id: "seed-2",
    title: "AI-Powered Content Orchestrator",
    desc: "A custom automation suite connecting LLMs and video generation APIs to draft scripts, create outlines, and pre-render vlog storyboards automatically.",
    category: "ai",
    tags: ["AI Tools", "API Integration", "Python", "Workflow"],
    image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80",
    link: "https://github.com",
    github: "https://github.com"
  },
  {
    id: "seed-3",
    title: "Interactive Creative Portfolio",
    desc: "A responsive, glassmorphic portfolio site designed specifically for creators. Features dynamic Firestore integrations and client-side password protection.",
    category: "web",
    tags: ["Website Development", "HTML5", "CSS3", "JavaScript"],
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
    link: "#",
    github: "https://github.com"
  }
];

// SHA-256 Hash of default passcode: "yukesh11"
const PASSCODE_HASH = "cf1be24e8e0787e9140fb37ccde3d4ec73e6f987cc728e9324c965fb66d6fb11";

// ==========================================================================
// 3. FIREBASE OR LOCAL STORAGE CONTROLLER
// ==========================================================================
let db = null;
let projects = [];

// Helper function to hash text using browser Web Crypto API
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initialize database connection
async function initDatabase() {
  if (isFirebaseConfigured) {
    try {
      // Initialize Firebase App and Firestore using Compat SDK
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      console.log("Firebase Firestore Initialized Successfully.");
    } catch (error) {
      console.error("Failed to load Firebase, falling back to LocalStorage:", error);
      db = null;
    }
  } else {
    console.log("Firebase not configured. Operating in LocalStorage mode.");
  }
  
  await fetchProjects();
}

// Fetch all projects
async function fetchProjects() {
  const container = document.getElementById('projects-container');
  
  try {
    if (db) {
      // Fetch from Firestore
      const querySnapshot = await db.collection("projects").get();
      
      projects = [];
      querySnapshot.forEach((docSnap) => {
        projects.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // If Firestore is empty, seed it with defaults
      if (projects.length === 0) {
        console.log("Firestore empty. Seeding with defaults...");
        for (const proj of DEFAULT_PROJECTS) {
          const docRef = await db.collection("projects").add(proj);
          projects.push({ ...proj, id: docRef.id });
        }
      }
    } else {
      // Fetch from LocalStorage
      const localData = localStorage.getItem('yukesh_portfolio_projects');
      if (localData) {
        projects = JSON.parse(localData);
      } else {
        projects = [...DEFAULT_PROJECTS];
        localStorage.setItem('yukesh_portfolio_projects', JSON.stringify(projects));
      }
    }
  } catch (error) {
    console.error("Error fetching projects, loading seed fallback:", error);
    projects = [...DEFAULT_PROJECTS];
  }
  
  renderProjects(projects);
}

// Add a new project
async function addProject(projectData) {
  try {
    if (db) {
      const docRef = await db.collection("projects").add(projectData);
      projects.push({ ...projectData, id: docRef.id });
    } else {
      const newProj = { ...projectData, id: 'local-' + Date.now() };
      projects.push(newProj);
      localStorage.setItem('yukesh_portfolio_projects', JSON.stringify(projects));
    }
    renderProjects(projects);
    return true;
  } catch (error) {
    console.error("Error adding project:", error);
    return false;
  }
}

// Delete an existing project
async function deleteProject(id) {
  try {
    if (db) {
      await db.collection("projects").doc(id).delete();
    }
    
    // Always update local list
    projects = projects.filter(p => p.id !== id);
    if (!db) {
      localStorage.setItem('yukesh_portfolio_projects', JSON.stringify(projects));
    }
    
    renderProjects(projects);
    return true;
  } catch (error) {
    console.error("Error deleting project:", error);
    return false;
  }
}

// Render project cards to DOM
function renderProjects(projectsToRender) {
  const container = document.getElementById('projects-container');
  if (!container) return;
  
  if (projectsToRender.length === 0) {
    container.innerHTML = `<div class="loading-spinner">No projects found in this category.</div>`;
    return;
  }
  
  const isAdmin = sessionStorage.getItem('yukesh_admin_mode') === 'true';
  
  container.innerHTML = '';
  projectsToRender.forEach(proj => {
    const card = document.createElement('div');
    card.className = `project-card ${proj.category}`;
    card.setAttribute('data-id', proj.id);
    
    const tagsHTML = proj.tags.map(t => `<span class="tag">#${t.trim()}</span>`).join(' ');
    
    // Check if links exist
    const workLinkHTML = proj.link ? `<a href="${proj.link}" target="_blank" class="proj-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Visit</a>` : '';
    const githubHTML = proj.github ? `<a href="${proj.github}" target="_blank" class="proj-link"><i class="fa-brands fa-github"></i> Source</a>` : '';
    
    // Delete button only shown in admin mode
    const deleteBtnHTML = isAdmin 
      ? `<button class="delete-proj-btn" data-id="${proj.id}" title="Delete project"><i class="fa-solid fa-trash-can"></i> Delete</button>` 
      : '';
      
    // Fallback Image
    const imgSrc = proj.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";

    card.innerHTML = `
      <div class="proj-media">
        <img src="${imgSrc}" alt="${proj.title}" loading="lazy">
      </div>
      <div class="proj-overlay">
        <span class="proj-category-tag">${getCategoryLabel(proj.category)}</span>
        <h3>${proj.title}</h3>
        <p>${proj.desc}</p>
        <div class="proj-tags-list">
          ${tagsHTML}
        </div>
        <div class="proj-actions">
          <div class="proj-links">
            ${workLinkHTML}
            ${githubHTML}
          </div>
          ${deleteBtnHTML}
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Attach delete handlers if in Admin Mode
  if (isAdmin) {
    document.querySelectorAll('.delete-proj-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const projId = btn.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this project?")) {
          btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Deleting...`;
          const success = await deleteProject(projId);
          if (!success) {
            alert("Delete failed. Check logs.");
            btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete`;
          }
        }
      });
    });
  }
}

// Convert category key to display string
function getCategoryLabel(key) {
  switch (key) {
    case 'video': return 'Video Editing';
    case 'web': return 'Web Dev';
    case 'ai': return 'AI Tools';
    default: return 'Other';
  }
}

// ==========================================================================
// 4. PORTFOLIO INTERACTION & LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Database loading
  initDatabase();
  
  // -- TYPEWRITER EFFECT --
  const words = ["Creative Developer", "Video Editor", "Vlogger"];
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  const txtElement = document.getElementById('typewriter-text');
  
  function typeWriter() {
    if (!txtElement) return;
    const currentWord = words[wordIndex];
    
    if (isDeleting) {
      charIndex--;
    } else {
      charIndex++;
    }
    
    txtElement.textContent = currentWord.substring(0, charIndex);
    
    let typeSpeed = isDeleting ? 40 : 80;
    
    if (!isDeleting && charIndex === currentWord.length) {
      typeSpeed = 1800; // Wait at completion
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typeSpeed = 400; // Brief pause before typing next
    }
    
    setTimeout(typeWriter, typeSpeed);
  }
  
  setTimeout(typeWriter, 500);

  // -- SCROLL INDICATOR & HEADER FLOATER --
  const progress = document.getElementById('scroll-progress');
  const header = document.querySelector('header');
  const sections = document.querySelectorAll('section');
  const navItems = document.querySelectorAll('.nav-links a');
  
  window.addEventListener('scroll', () => {
    // Scroll progress bar
    const windowScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (windowScroll / height) * 100;
    if (progress) progress.style.width = scrolled + '%';
    
    // Header shadow/blur trigger
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    // Update active nav links based on section in viewport
    let current = '';
    sections.forEach(sec => {
      const secTop = sec.offsetTop;
      const secHeight = sec.clientHeight;
      if (window.scrollY >= (secTop - 180)) {
        current = sec.getAttribute('id');
      }
    });
    
    navItems.forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === `#${current}`) {
        a.classList.add('active');
      }
    });
  });

  // -- SCROLL ANIMATION OBSERVER --
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };
  
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        
        // Trigger skill bars inside skills section
        if (entry.target.classList.contains('skills-card')) {
          const bars = entry.target.querySelectorAll('.skill-bar-fill');
          bars.forEach(bar => {
            const styleWidth = bar.style.width;
            bar.style.width = '0';
            setTimeout(() => {
              bar.style.width = styleWidth;
            }, 100);
          });
        }
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    scrollObserver.observe(el);
  });

  // -- CATEGORY FILTER TABS --
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filterValue = btn.getAttribute('data-filter');
      const cards = document.querySelectorAll('.project-card');
      
      cards.forEach(card => {
        card.style.transform = 'scale(0.95)';
        card.style.opacity = '0';
        
        setTimeout(() => {
          if (filterValue === 'all' || card.classList.contains(filterValue)) {
            card.classList.remove('hidden');
            setTimeout(() => {
              card.style.transform = 'scale(1)';
              card.style.opacity = '1';
            }, 50);
          } else {
            card.classList.add('hidden');
          }
        }, 200);
      });
    });
  });

  // -- MOBILE NAVIGATION DRAWER --
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const closeDrawer = document.querySelector('.drawer-close');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.drawer-overlay');
  const drawerLinks = document.querySelectorAll('.drawer-links a');
  
  function openMobileNav() {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // Lock scrolling
  }
  
  function closeMobileNav() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = ''; // Unlock scrolling
  }
  
  if (mobileToggle) mobileToggle.addEventListener('click', openMobileNav);
  if (closeDrawer) closeDrawer.addEventListener('click', closeMobileNav);
  if (overlay) overlay.addEventListener('click', closeMobileNav);
  drawerLinks.forEach(link => link.addEventListener('click', closeMobileNav));

  // ==========================================================================
  // 5. ADMIN PORTAL & AUTHENTICATION
  // ==========================================================================
  const adminTrigger = document.getElementById('admin-trigger');
  const authModal = document.getElementById('auth-modal');
  const projectModal = document.getElementById('project-modal');
  const authForm = document.getElementById('auth-form');
  const authPassInput = document.getElementById('auth-passcode');
  const authFeedback = document.getElementById('auth-feedback');
  const projectForm = document.getElementById('project-form');
  const adminStatus = document.getElementById('admin-status');
  const logoutBtn = document.getElementById('logout-btn');
  
  // Close any modal handler
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    });
  });

  // Trigger Admin Access
  if (adminTrigger) {
    adminTrigger.addEventListener('click', () => {
      const isAdmin = sessionStorage.getItem('yukesh_admin_mode') === 'true';
      if (isAdmin) {
        // Direct open project submission if authenticated
        projectModal.classList.add('open');
      } else {
        // Open password prompt
        authPassInput.value = '';
        authFeedback.classList.add('hidden');
        authModal.classList.add('open');
        setTimeout(() => authPassInput.focus(), 150);
      }
    });
  }

  // Handle Passcode verification
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputPasscode = authPassInput.value;
      const hashedVal = await sha256(inputPasscode);
      
      if (hashedVal === PASSCODE_HASH) {
        // Success
        sessionStorage.setItem('yukesh_admin_mode', 'true');
        authModal.classList.remove('open');
        authFeedback.classList.add('hidden');
        
        // Activate portal badges & re-render
        activateAdminMode();
        
        // Open project creator form modal
        setTimeout(() => projectModal.classList.add('open'), 300);
      } else {
        // Fails
        authFeedback.textContent = "Invalid passcode. Please try again.";
        authFeedback.classList.remove('hidden');
        authPassInput.value = '';
      }
    });
  }

  // Activate Admin visuals
  function activateAdminMode() {
    adminStatus.classList.remove('hidden');
    const lockIcon = adminTrigger.querySelector('i');
    if (lockIcon) {
      lockIcon.className = "fa-solid fa-circle-plus red-text";
    }
    // Re-render works so Delete Buttons are visible
    renderProjects(projects);
  }

  // Check state on load
  if (sessionStorage.getItem('yukesh_admin_mode') === 'true') {
    activateAdminMode();
  }

  // Logout Admin Mode
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('yukesh_admin_mode');
      adminStatus.classList.add('hidden');
      const lockIcon = adminTrigger.querySelector('i');
      if (lockIcon) {
        lockIcon.className = "fa-solid fa-lock";
      }
      renderProjects(projects);
    });
  }

  // Add Project Submission
  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const publishBtn = projectForm.querySelector('button[type="submit"]');
      const originalText = publishBtn.innerHTML;
      publishBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Publishing...`;
      publishBtn.disabled = true;
      
      const title = document.getElementById('proj-title').value;
      const desc = document.getElementById('proj-desc').value;
      const category = document.getElementById('proj-category').value;
      const tags = document.getElementById('proj-tags').value.split(',').map(t => t.trim());
      const image = document.getElementById('proj-image').value;
      const link = document.getElementById('proj-link').value;
      const github = document.getElementById('proj-github').value;
      
      const projectData = {
        title,
        desc,
        category,
        tags,
        image,
        link,
        github,
        timestamp: Date.now()
      };
      
      const success = await addProject(projectData);
      
      publishBtn.innerHTML = originalText;
      publishBtn.disabled = false;
      
      if (success) {
        projectForm.reset();
        projectModal.classList.remove('open');
        alert("Project added successfully!");
      } else {
        alert("Failed to add project. Please check Firestore console.");
      }
    });
  }

  // ==========================================================================
  // 6. CONTACT FORM SUBMISSION
  // ==========================================================================
  const contactForm = document.getElementById('contact-form');
  const formFeedback = document.getElementById('form-feedback');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
      submitBtn.disabled = true;
      
      // Simulate network request delay
      setTimeout(() => {
        // Reset form
        contactForm.reset();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Show success notification
        formFeedback.textContent = "Thank you! Your message was sent successfully. Lee Yukesh will respond shortly.";
        formFeedback.className = "form-feedback success";
        formFeedback.classList.remove('hidden');
        
        // Hide after 5 seconds
        setTimeout(() => {
          formFeedback.classList.add('hidden');
        }, 5000);
      }, 1500);
    });
  }
});
