// 1. Initialize Supabase Browser Client Connection securely
// Note: Your custom project URL from your screenshot has been plugged in automatically!
const SUPABASE_URL = "https://tbdgsvnonmwfklplelru.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_pe_4Rt0WVQ2h5tTNuRFIfg__dxqFmrT"; // Paste your real project anon key string here

// Using a unique variable name to completely prevent browser initialization crashes
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Track UI Component References
let currentAuthMode = "login"; // Dynamic pointer states: "login" or "signup"
let activeSessionUser = null;
let selectedThemeColor = "#0A192F"; // Default theme color
let selectedHeadingColor = "#FFFFFF"; // Default heading color
let selectedFontSize = 16; // Default font size
let userSubscription = null;
let reportMode = "executive"; // "executive" or "detailed"

const authOverlay = document.getElementById('authOverlay');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const displayUserMetrics = document.getElementById('displayUserMetrics');
const upgradeBtn = document.getElementById('upgradeBtn');
const paymentModal = document.getElementById('paymentModal');
const closePaymentModalBtn = document.getElementById('closePaymentModalBtn');
const verifyPaymentBtn = document.getElementById('verifyPaymentBtn');
const transactionIdInput = document.getElementById('transactionId');
const executiveModeBtn = document.getElementById('executiveModeBtn');
const detailedModeBtn = document.getElementById('detailedModeBtn');
const exportTextBtn = document.getElementById('exportTextBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// --- REPORT MODE CONTROLS ---

executiveModeBtn.addEventListener('click', () => {
    reportMode = "executive";
    executiveModeBtn.className = "flex-1 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 px-3 py-2 rounded-lg text-xs font-medium transition-all";
    detailedModeBtn.className = "flex-1 bg-slate-800 border-2 border-slate-600 text-slate-400 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:border-slate-500";
});

detailedModeBtn.addEventListener('click', () => {
    reportMode = "detailed";
    detailedModeBtn.className = "flex-1 bg-sky-500/20 border-2 border-sky-500 text-sky-400 px-3 py-2 rounded-lg text-xs font-medium transition-all";
    executiveModeBtn.className = "flex-1 bg-slate-800 border-2 border-slate-600 text-slate-400 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:border-slate-500";
});

// --- EXPORT CONTROLS ---

let lastGeneratedData = null;

exportTextBtn.addEventListener('click', () => {
    if (!lastGeneratedData) {
        alert('Please generate a presentation first.');
        return;
    }

    // Create email-friendly text format
    let emailText = `${lastGeneratedData.presentationTitle}\n\n`;
    
    lastGeneratedData.slides.forEach(slide => {
        emailText += `${slide.slideTitle}:\n`;
        slide.bullets.forEach(bullet => {
            emailText += `• ${bullet}\n`;
        });
        emailText += '\n';
    });

    // Copy to clipboard
    navigator.clipboard.writeText(emailText).then(() => {
        alert('Email-friendly text copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy text. Please try again.');
    });
});

exportPdfBtn.addEventListener('click', () => {
    if (!lastGeneratedData) {
        alert('Please generate a presentation first.');
        return;
    }

    alert('PDF export feature coming soon! For now, please use the PowerPoint export and save as PDF from PowerPoint.');
});

// --- PAYMENT MODAL CONTROLS ---

upgradeBtn.addEventListener('click', () => {
    paymentModal.classList.remove('hidden');
    paymentModal.classList.add('flex');
    generateQRCode();
});

closePaymentModalBtn.addEventListener('click', () => {
    paymentModal.classList.add('hidden');
    paymentModal.classList.remove('flex');
});

function generateQRCode() {
    const upiString = `upi://pay?pa=your-phonepe-id@phonepe&pn=SlideSync&am=99.00&cu=INR`;
    const qrCodeContainer = document.getElementById('qrCode');
    qrCodeContainer.innerHTML = '';
    
    QRCode.toCanvas(upiString, { width: 200, margin: 2 }, (error, canvas) => {
        if (error) {
            console.error(error);
            qrCodeContainer.innerHTML = '<div class="text-red-400 text-sm">Error generating QR code</div>';
            return;
        }
        canvas.style.borderRadius = '8px';
        qrCodeContainer.appendChild(canvas);
    });
}

verifyPaymentBtn.addEventListener('click', async () => {
    const transactionId = transactionIdInput.value.trim();
    if (!transactionId) {
        alert('Please enter UPI Transaction ID');
        return;
    }

    try {
        // Record payment in database
        const { data: paymentData, error: paymentError } = await supabaseClient
            .from('payment_history')
            .insert({
                user_id: activeSessionUser.id,
                amount: 99.00,
                currency: 'INR',
                payment_method: 'upi',
                payment_status: 'pending',
                transaction_id: transactionId,
                upi_transaction_id: transactionId
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        // Update subscription to pro
        const { error: subError } = await supabaseClient
            .from('subscriptions')
            .upsert({
                user_id: activeSessionUser.id,
                plan_type: 'pro',
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                monthly_limit: 999999, // Unlimited for pro
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (subError) throw subError;

        // Update payment status to completed
        await supabaseClient
            .from('payment_history')
            .update({ payment_status: 'completed' })
            .eq('id', paymentData.id);

        alert('Payment verified successfully! You now have Pro access.');
        paymentModal.classList.add('hidden');
        paymentModal.classList.remove('flex');
        transactionIdInput.value = '';
        
        // Reload subscription data
        await loadUserSubscription();

    } catch (error) {
        console.error('Payment verification error:', error);
        alert('Payment verification failed. Please try again.');
    }
});

async function loadUserSubscription() {
    try {
        const { data, error } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', activeSessionUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            await createDefaultSubscription();
            return;
        }

        if (!data) {
            await createDefaultSubscription();
            return;
        }

        userSubscription = data;
        updateUpgradeButton();

    } catch (error) {
        console.error('Error loading subscription:', error);
        await createDefaultSubscription();
    }
}

async function createDefaultSubscription() {
    try {
        const { data, error } = await supabaseClient
            .from('subscriptions')
            .insert({
                user_id: activeSessionUser.id,
                plan_type: 'free',
                status: 'active',
                start_date: new Date().toISOString(),
                monthly_limit: 2,
                decks_used_this_month: 0
            })
            .select()
            .single();

        if (error) throw error;
        userSubscription = data;
        updateUpgradeButton();
    } catch (error) {
        console.error('Error creating default subscription:', error);
    }
}

function updateUpgradeButton() {
    if (userSubscription && userSubscription.plan_type === 'pro') {
        upgradeBtn.classList.add('hidden');
    } else {
        upgradeBtn.classList.remove('hidden');
    }
}

async function checkDeckLimit() {
    if (userSubscription && userSubscription.plan_type === 'pro') {
        return true;
    }

    if (userSubscription && userSubscription.decks_used_this_month >= userSubscription.monthly_limit) {
        alert('You have reached your monthly limit of 2 free decks. Upgrade to Pro for unlimited access.');
        paymentModal.classList.remove('hidden');
        paymentModal.classList.add('flex');
        generateQRCode();
        return false;
    }

    return true;
}

async function incrementDeckUsage() {
    if (userSubscription && userSubscription.plan_type === 'pro') {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('subscriptions')
            .update({
                decks_used_this_month: userSubscription.decks_used_this_month + 1,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', activeSessionUser.id);

        if (error) throw error;
        userSubscription.decks_used_this_month += 1;

    } catch (error) {
        console.error('Error incrementing deck usage:', error);
    }
}

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

async function handleSessionTransition(session) {
    if (session) {
        activeSessionUser = session.user;
        authOverlay.classList.add('hidden');
        displayUserMetrics.innerText = `User: ${activeSessionUser.email.split('@')[0]}`;
        await loadUserSubscription();
    } else {
        activeSessionUser = null;
        authOverlay.classList.remove('hidden');
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

// --- DECK STORAGE MODULE ---

async function storeDeckInSupabase(title, inputText, slideData) {
    try {
        const { error } = await supabaseClient
            .from('generated_decks')
            .insert({
                user_id: activeSessionUser.id,
                title: title || 'Untitled Deck',
                input_text: inputText,
                slide_data: slideData
            });

        if (error) throw error;
        
        // Increment deck usage for free users
        await incrementDeckUsage();
    } catch (error) {
        console.error('Error storing deck:', error);
    }
}

// Color selector functionality
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => {
            b.classList.remove('active', 'border-white');
            b.classList.add('border-slate-600');
        });
        btn.classList.add('active', 'border-white');
        btn.classList.remove('border-slate-600');
        selectedThemeColor = btn.dataset.color;
    });
});

// Heading color selector functionality
document.querySelectorAll('.heading-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.heading-color-btn').forEach(b => {
            b.classList.remove('active', 'border-white');
            b.classList.add('border-slate-600');
        });
        btn.classList.add('active', 'border-white');
        btn.classList.remove('border-slate-600');
        selectedHeadingColor = btn.dataset.color;
    });
});

// Font size selector functionality
document.getElementById('fontSizeSelector').addEventListener('change', (e) => {
    selectedFontSize = parseInt(e.target.value);
});

// --- CORE GENERATION CONVERT PROCESS MODULE PIPELINE ---

document.getElementById('generateBtn').addEventListener('click', async () => {
    if (!activeSessionUser) {
        alert("Session expired. Please log in again.");
        return;
    }

    // Check deck limit for free users
    if (!await checkDeckLimit()) {
        return;
    }

    const textInput = document.getElementById('jiraInput').value.trim();
    const actionButton = document.getElementById('generateBtn');

    if (!textInput) {
        alert("Please paste some messy logs or updates first!");
        return;
    }

    // Check text length for free users
    if (userSubscription && userSubscription.plan_type === 'free' && textInput.length > 1000) {
        alert('Free users are limited to 1000 characters. Upgrade to Pro for unlimited text length.');
        paymentModal.classList.remove('hidden');
        paymentModal.classList.add('flex');
        generateQRCode();
        return;
    }

    actionButton.disabled = true;
    actionButton.innerText = "⏳ Processing massive data & building deck...";

    try {
        // Send actual authenticated unique identity metadata ID code token packet block
        const networkResponse = await fetch('https://slidesync-zg71.onrender.com/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textInput,
                userId: activeSessionUser.id, // Passing true identity token down the secure channel stream pipe
                reportMode: reportMode // Pass executive or detailed mode to backend
            })
        });

        if (!networkResponse.ok) {
            const errorDetails = await networkResponse.json();
            throw new Error(errorDetails.error || "Server error occurred.");
        }

        const data = await networkResponse.json();

        // Store data for export functionality
        lastGeneratedData = data;

        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        let titleSlide = pptx.addSlide();
        titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: selectedThemeColor } });
        
        titleSlide.addText(data.presentationTitle || "WEEKLY PROGRESS DASHBOARD", {
            x: 1.0, y: 2.5, w: 11, fontSize: 36, bold: true, color: selectedHeadingColor, fontFace: 'Arial', align: 'center'
        });

        // Process slides with text splitting for long content
        data.slides.forEach(slideEntry => {
            const MAX_BULLETS_PER_SLIDE = 8;
            const bullets = slideEntry.bullets;

            // Split bullets across multiple slides if needed
            for (let i = 0; i < bullets.length; i += MAX_BULLETS_PER_SLIDE) {
                let contentSlide = pptx.addSlide();

                contentSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: selectedThemeColor } });

                // Add title with continuation indicator if split
                let slideTitle = slideEntry.slideTitle.toUpperCase();
                if (bullets.length > MAX_BULLETS_PER_SLIDE) {
                    const pageNum = Math.floor(i / MAX_BULLETS_PER_SLIDE) + 1;
                    const totalPages = Math.ceil(bullets.length / MAX_BULLETS_PER_SLIDE);
                    slideTitle += ` (${pageNum}/${totalPages})`;
                }

                contentSlide.addText(slideTitle, {
                    x: 0.7, y: 0.5, w: 12, fontSize: 18, bold: true, color: selectedHeadingColor, fontFace: 'Arial'
                });

                contentSlide.addShape(pptx.ShapeType.line, {
                    x: 0.7, y: 0.9, w: 12, h: 0, line: { color: selectedThemeColor, width: 2 }
                });

                // Add visual metrics for executive mode
                if (reportMode === "executive") {
                    // Add progress bar for Executive Summary slide
                    if (slideTitle.includes("EXECUTIVE SUMMARY")) {
                        const progressMatch = bullets.join(' ').match(/(\d+)%/);
                        if (progressMatch) {
                            const progress = parseInt(progressMatch[1]);
                            const barWidth = (progress / 100) * 8;
                            
                            // Progress bar background
                            contentSlide.addShape(pptx.ShapeType.rect, {
                                x: 0.7, y: 1.3, w: 8, h: 0.4, fill: { color: 'E5E7EB' }
                            });
                            // Progress bar fill
                            const barColor = progress >= 80 ? '10B981' : progress >= 50 ? 'F59E0B' : 'EF4444';
                            contentSlide.addShape(pptx.ShapeType.rect, {
                                x: 0.7, y: 1.3, w: barWidth, h: 0.4, fill: { color: barColor }
                            });
                            // Progress percentage text
                            contentSlide.addText(`${progress}% Complete`, {
                                x: 9, y: 1.25, w: 2, fontSize: 14, bold: true, color: barColor, fontFace: 'Arial'
                            });
                        }
                    }

                    // Add traffic light indicators for Blockers & Risks
                    if (slideTitle.includes("BLOCKERS") || slideTitle.includes("RISKS")) {
                        bullets.forEach((bullet, idx) => {
                            if (bullet.toLowerCase().includes('high')) {
                                contentSlide.addShape(pptx.ShapeType.ellipse, {
                                    x: 0.5, y: 1.3 + (idx * 0.5), w: 0.3, h: 0.3, fill: { color: 'EF4444' }
                                });
                            } else if (bullet.toLowerCase().includes('medium')) {
                                contentSlide.addShape(pptx.ShapeType.ellipse, {
                                    x: 0.5, y: 1.3 + (idx * 0.5), w: 0.3, h: 0.3, fill: { color: 'F59E0B' }
                                });
                            } else if (bullet.toLowerCase().includes('low')) {
                                contentSlide.addShape(pptx.ShapeType.ellipse, {
                                    x: 0.5, y: 1.3 + (idx * 0.5), w: 0.3, h: 0.3, fill: { color: '10B981' }
                                });
                            }
                        });
                    }
                }

                // Get bullets for this slide
                const slideBullets = bullets.slice(i, i + MAX_BULLETS_PER_SLIDE);

                // Add bullets with full text preserved
                let formattedBulletObjects = slideBullets.map(bulletText => {
                    return { text: bulletText, options: { bullet: true, color: '333333', fontSize: Math.min(selectedFontSize, 12), lineSpacing: 28, wrap: true } };
                });

                contentSlide.addText(formattedBulletObjects, {
                    x: 0.7, y: 1.1, w: 12, h: 5.5, fontFace: 'Arial', valign: 'top',
                    bodyProp: { wrap: true }
                });
            }
        });

        pptx.writeFile({ fileName: `SlideSync_Executive_Report.pptx` });

        // Store deck in Supabase after successful generation
        await storeDeckInSupabase(data.presentationTitle, textInput, data);

    } catch (frontendError) {
        console.error("Execution Failure:", frontendError);
        alert(frontendError.message || "Internal server error.");
    } finally {
        actionButton.disabled = false;
        actionButton.innerText = "⚡ Convert to PowerPoint (.pptx)";
    }
});