// 1. Initialize Supabase Browser Client Connection securely
// Note: Your custom project URL from your screenshot has been plugged in automatically!
const SUPABASE_URL = "https://tbdgsvnonmwfklplelru.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_pe_4Rt0WVQ2h5tTNuRFIfg__dxqFmrT"; // Paste your real project anon key string here

// Using a unique variable name to completely prevent browser initialization crashes
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Track UI Component References
let currentAuthMode = "login"; // Dynamic pointer states: "login" or "signup"
let activeSessionUser = null;

const authOverlay = document.getElementById('authOverlay');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const displayUserMetrics = document.getElementById('displayUserMetrics');

// --- AUTH DATA PANEL LAYOUT CONTROLS ---

tabLogin.addEventListener('click', () => {
    currentAuthMode = "login";
    tabLogin.className = "flex-1 pb-2 font-medium text-sky-400 border-b-2 border-sky-400 focus:outline-none";
    tabSignup.className = "flex-1 pb-2 font-medium text-slate-400 border-b-transparent focus:outline-none";
    authSubmitBtn.innerText = "Sign In to Account";
});

tabSignup.addEventListener('click', () => {
    currentAuthMode = "signup";
    tabSignup.className = "flex-1 pb-2 font-medium text-sky-400 border-b-2 border-sky-400 focus:outline-none";
    tabLogin.className = "flex-1 pb-2 font-medium text-slate-400 border-b-transparent focus:outline-none";
    authSubmitBtn.innerText = "Create Free Account";
});

// Check session state on page load dynamically
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    handleSessionTransition(session);
});

// Monitor session changes in real-time
supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleSessionTransition(session);
});

function handleSessionTransition(session) {
    if (session) {
        activeSessionUser = session.user;
        authOverlay.classList.add('hidden'); // Clear auth cover modal view frame overlay panel
        displayUserMetrics.innerText = `User: ${activeSessionUser.email.split('@')[0]}`;
    } else {
        activeSessionUser = null;
        authOverlay.classList.remove('hidden'); // Bring back visual lock block panel framework layout
        displayUserMetrics.innerText = "Anonymous Workspace Mode";
    }
}

// Submit logic button authentication listener execution router
authSubmitBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!email || !password) {
        alert("Please enter both fields to proceed.");
        return;
    }

    try {
        if (currentAuthMode === "signup") {
            const { error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            alert("Success! Account created. You can now log in using your credentials.");
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
    } catch (authErr) {
        alert(`Authentication Error: ${authErr.message}`);
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

// --- CORE GENERATION CONVERT PROCESS MODULE PIPELINE ---

document.getElementById('generateBtn').addEventListener('click', async () => {
    if (!activeSessionUser) {
        alert("Session expired. Please log in again.");
        return;
    }

    const textInput = document.getElementById('jiraInput').value.trim();
    const actionButton = document.getElementById('generateBtn');

    if (!textInput) {
        alert("Please paste some messy logs or updates first!");
        return;
    }

    actionButton.disabled = true;
    actionButton.innerText = "⏳ Processing massive data & building deck...";

    try {
        // Send actual authenticated unique identity metadata ID code token packet block
        const networkResponse = await fetch('http://localhost:5000/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textInput,
                userId: activeSessionUser.id // Passing true identity token down the secure channel stream pipe
            })
        });

        if (!networkResponse.ok) {
            const errorDetails = await networkResponse.json();
            throw new Error(errorDetails.error || "Server error occurred.");
        }

        const data = await networkResponse.json();

        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        let titleSlide = pptx.addSlide();
        titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '0A192F' } });
        
        titleSlide.addText(data.presentationTitle || "WEEKLY PROGRESS DASHBOARD", {
            x: 1.0, y: 2.8, w: 11.3, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Arial'
        });
        titleSlide.addText("AI-Generated Performance & Operations Deck", {
            x: 1.0, y: 3.8, w: 11.3, fontSize: 18, color: '8892B0', fontFace: 'Arial'
        });

        data.slides.forEach(slideEntry => {
            let contentSlide = pptx.addSlide();

            contentSlide.addText(slideEntry.slideTitle.toUpperCase(), {
                x: 0.8, y: 0.6, w: 11.5, fontSize: 28, bold: true, color: '0A192F', fontFace: 'Arial'
            });

            contentSlide.addShape(pptx.ShapeType.line, { 
                x: 0.8, y: 1.2, w: 11.7, h: 0, line: { color: 'CCD6F6', width: 2 } 
            });

            let formattedBulletObjects = slideEntry.bullets.map(bulletText => {
                return { text: bulletText, options: { bullet: true, color: '333333' } };
            });

            contentSlide.addText(formattedBulletObjects, {
                x: 0.8, y: 1.8, w: 11.7, h: 4.8, fontSize: 16, fontFace: 'Arial', lineSpacing: 28, valign: 'top'
            });
        });

        pptx.writeFile({ fileName: `SlideSync_Executive_Report.pptx` });

    } catch (frontendError) {
        console.error("Execution Failure:", frontendError);
        alert(frontendError.message || "Internal server error.");
    } finally {
        actionButton.disabled = false;
        actionButton.innerText = "⚡ Convert to PowerPoint (.pptx)";
    }
});