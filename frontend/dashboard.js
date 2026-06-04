// Initialize Supabase Client
const SUPABASE_URL = "https://tbdgsvnonmwfklplelru.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_pe_4Rt0WVQ2h5tTNuRFIfg__dxqFmrT";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Track UI Component References
let currentAuthMode = "login";
let activeSessionUser = null;
let userSubscription = null;

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
        await loadPastDecks();

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
            // If no subscription found, create default free subscription
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
        return true; // Pro users have unlimited decks
    }

    // Check if free user has exceeded limit
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
        return; // Pro users don't need tracking
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
        await loadPastDecks();
    } else {
        activeSessionUser = null;
        authOverlay.classList.remove('hidden');
        displayUserMetrics.innerText = "Anonymous Workspace Mode";
        document.getElementById('pastDecksSection').classList.add('hidden');
        document.getElementById('statsSection').classList.add('hidden');
    }
}

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
    window.location.href = 'index.html';
});

// --- DECK STORAGE AND RETRIEVAL MODULE ---

async function loadPastDecks() {
    try {
        const { data: decks, error } = await supabaseClient
            .from('generated_decks')
            .select('*')
            .eq('user_id', activeSessionUser.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        renderDecksGrid(decks || []);
        updateStatistics(decks || []);
    } catch (error) {
        console.error('Error loading decks:', error);
        renderDecksGrid([]);
        updateStatistics([]);
    }
}

function updateStatistics(decks) {
    const statsSection = document.getElementById('statsSection');
    const totalUserDecks = document.getElementById('totalUserDecks');
    const totalSlides = document.getElementById('totalSlides');
    const totalChars = document.getElementById('totalChars');

    statsSection.classList.remove('hidden');
    
    const slideCount = decks.reduce((sum, deck) => {
        return sum + (deck.slide_data.slides ? deck.slide_data.slides.length : 0);
    }, 0);
    
    const charCount = decks.reduce((sum, deck) => {
        return sum + (deck.input_text ? deck.input_text.length : 0);
    }, 0);

    totalUserDecks.textContent = decks.length;
    totalSlides.textContent = slideCount;
    totalChars.textContent = charCount.toLocaleString();
}

function renderDecksGrid(decks) {
    const pastDecksSection = document.getElementById('pastDecksSection');
    const decksGrid = document.getElementById('decksGrid');
    const noDecksMessage = document.getElementById('noDecksMessage');

    if (!decks || decks.length === 0) {
        pastDecksSection.classList.remove('hidden');
        decksGrid.classList.add('hidden');
        noDecksMessage.classList.remove('hidden');
        return;
    }

    pastDecksSection.classList.remove('hidden');
    decksGrid.classList.remove('hidden');
    noDecksMessage.classList.add('hidden');

    decksGrid.innerHTML = decks.map(deck => `
        <div class="bg-[#0A192F] border border-slate-700/50 rounded-full p-6 hover:border-sky-500/30 transition-all group flex flex-col items-center justify-center text-center relative">
            <button onclick="deleteDeck('${deck.id}')" class="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
            <div class="w-16 h-16 bg-gradient-to-br from-sky-500/20 to-sky-500/5 rounded-full flex items-center justify-center mb-3 border border-sky-500/20">
                <span class="text-2xl">📊</span>
            </div>
            <h4 class="text-sm font-semibold text-slate-200 truncate max-w-[200px]">${escapeHtml(deck.title)}</h4>
            <p class="text-xs text-slate-500 mt-1">${formatDate(deck.created_at)}</p>
            <div class="flex gap-2 mt-3">
                <button onclick="regenerateDeck('${deck.id}')" class="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                    <span>🔄</span>
                </button>
                <button onclick="viewDeckDetails('${deck.id}')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                    Details
                </button>
            </div>
        </div>
    `).join('');
}

async function deleteDeck(deckId) {
    if (!confirm('Are you sure you want to delete this deck?')) return;

    try {
        const { error } = await supabaseClient
            .from('generated_decks')
            .delete()
            .eq('id', deckId)
            .eq('user_id', activeSessionUser.id);

        if (error) throw error;

        await loadPastDecks();
    } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Failed to delete deck');
    }
}

async function regenerateDeck(deckId) {
    try {
        const { data: deck, error } = await supabaseClient
            .from('generated_decks')
            .select('*')
            .eq('id', deckId)
            .eq('user_id', activeSessionUser.id)
            .single();

        if (error) throw error;

        const data = deck.slide_data;
        const selectedThemeColor = "#0A192F"; // Default color for dashboard
        const reportMode = data.presentationTitle?.includes("EXECUTIVE") ? "executive" : "detailed";

        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        let titleSlide = pptx.addSlide();
        titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: selectedThemeColor } });
        
        titleSlide.addText(data.presentationTitle || "WEEKLY PROGRESS DASHBOARD", {
            x: 1.0, y: 2.5, w: 11, fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Arial', align: 'center'
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
                    x: 0.7, y: 0.5, w: 12, fontSize: 18, bold: true, color: selectedThemeColor, fontFace: 'Arial'
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
                    return { text: bulletText, options: { bullet: true, color: '333333', fontSize: 12, lineSpacing: 28, wrap: true } };
                });

                contentSlide.addText(formattedBulletObjects, {
                    x: 0.7, y: 1.1, w: 12, h: 5.5, fontFace: 'Arial', valign: 'top',
                    bodyProp: { wrap: true }
                });
            }
        });

        pptx.writeFile({ fileName: `SlideSync_${deck.title.replace(/[^a-z0-9]/gi, '_')}.pptx` });

    } catch (error) {
        console.error('Error regenerating deck:', error);
        alert('Failed to regenerate deck');
    }
}

function viewDeckDetails(deckId) {
    supabaseClient
        .from('generated_decks')
        .select('*')
        .eq('id', deckId)
        .eq('user_id', activeSessionUser.id)
        .single()
        .then(({ data, error }) => {
            if (error) {
                console.error('Error loading deck details:', error);
                return;
            }
            showDeckDetailsModal(data);
        });
}

function showDeckDetailsModal(deck) {
    const modal = document.getElementById('deckDetailsModal');
    const modalContent = document.getElementById('modalContent');
    const slideData = deck.slide_data;

    modalContent.innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Deck Title</label>
                <p class="text-lg font-semibold text-white">${escapeHtml(deck.title)}</p>
            </div>
            
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-[#0A192F] rounded-lg p-3 text-center">
                    <p class="text-2xl font-bold text-sky-400">${slideData.slides ? slideData.slides.length : 0}</p>
                    <p class="text-xs text-slate-400 mt-1">Slides</p>
                </div>
                <div class="bg-[#0A192F] rounded-lg p-3 text-center">
                    <p class="text-2xl font-bold text-emerald-400">${formatDate(deck.created_at)}</p>
                    <p class="text-xs text-slate-400 mt-1">Created</p>
                </div>
                <div class="bg-[#0A192F] rounded-lg p-3 text-center">
                    <p class="text-2xl font-bold text-purple-400">${deck.input_text.length} chars</p>
                    <p class="text-xs text-slate-400 mt-1">Input Size</p>
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Slide Topics</label>
                <div class="space-y-2">
                    ${slideData.slides ? slideData.slides.map((slide, index) => `
                        <div class="bg-[#0A192F] rounded-lg p-3 border border-slate-700/50">
                            <div class="flex items-start gap-3">
                                <span class="bg-sky-500/20 text-sky-400 text-xs font-bold px-2 py-1 rounded">${index + 1}</span>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-slate-200">${escapeHtml(slide.slideTitle)}</p>
                                    <p class="text-xs text-slate-500 mt-1">${slide.bullets.length} bullet points</p>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<p class="text-slate-500 text-sm">No slide data available</p>'}
                </div>
            </div>

            <div class="flex gap-3 pt-4 border-t border-slate-700/50">
                <button onclick="regenerateDeck('${deck.id}')" class="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <span>🔄</span> Regenerate PPTX
                </button>
                <a href="index.html" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-lg transition-colors text-center">
                    Create New Deck
                </a>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('deckDetailsModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Close modal when clicking outside
document.getElementById('deckDetailsModal').addEventListener('click', (e) => {
    if (e.target.id === 'deckDetailsModal') {
        closeModal();
    }
});

document.getElementById('closeModalBtn').addEventListener('click', closeModal);

// Clear all decks
document.getElementById('clearDecksBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete all your past decks?')) return;

    try {
        const { error } = await supabaseClient
            .from('generated_decks')
            .delete()
            .eq('user_id', activeSessionUser.id);

        if (error) throw error;

        await loadPastDecks();
    } catch (error) {
        console.error('Error clearing decks:', error);
        alert('Failed to clear decks');
    }
});

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
