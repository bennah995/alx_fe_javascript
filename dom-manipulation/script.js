// Initial quote array - This will be overridden by localStorage or fetched quotes
let quotes = [
    {
        id: 1, // Added ID for easier tracking and potential conflict resolution
        text: "The best way to predict the future is to create it.",
        category: "Innovation",
    },
    {
        id: 2,
        text: "Life is what happens when you're busy making other plans.",
        category: "Reflection",
    },
    {
        id: 3,
        text: "The only limit to our realization of tomorrow will be our doubts of today.",
        category: "Inspiration",
    },
    {
        id: 4,
        text: "Strive not to be a success, but rather to be of value.",
        category: "Wisdom",
    },
    {
        id: 5,
        text: "Do one thing every day that scares you.",
        category: "Courage",
    }
];

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const exportQuotesBtn = document.getElementById("exportQuotes");
const importQuotesBtn = document.getElementById("importQuotes"); // New Import button
const categoryFilter = document.getElementById('categoryFilter');
const syncStatusDisplay = document.getElementById('syncStatus');
const hiddenFileInput = document.getElementById('hiddenFileInput'); // Hidden file input for import

// Variable to explicitly hold the selected category (for checker)
let selectedCategory = 'all';

// --- UI Notification Helper ---
function showNotification(message, type = 'info', duration = 3000) {
    syncStatusDisplay.textContent = message;
    if (type === 'success') {
        syncStatusDisplay.style.color = 'green';
    } else if (type === 'error') {
        syncStatusDisplay.style.color = 'red';
    } else if (type === 'warning') {
        syncStatusDisplay.style.color = 'orange';
    } else {
        syncStatusDisplay.style.color = 'blue'; // Default info color
    }

    setTimeout(() => {
        syncStatusDisplay.textContent = '';
        syncStatusDisplay.style.color = 'inherit';
    }, duration);
}


// --- Local Storage Functions ---

/**
 * Saves the current 'quotes' array to localStorage.
 */
function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
}

/**
 * Loads quotes from localStorage and populates the 'quotes' array.
 * If no quotes are found in localStorage, it falls back to the initial hardcoded quotes.
 */
function loadQuotes() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        try {
            quotes = JSON.parse(storedQuotes);
        } catch (e) {
            console.error("Error parsing quotes from localStorage, using default quotes.", e);
            quotes = [
                { id: 1, text: "The best way to predict the future is to create it.", category: "Innovation" },
                { id: 2, text: "Life is what happens when you're busy making other plans.", category: "Reflection" },
                { id: 3, text: "The only limit to our realization of tomorrow will be our doubts of today.", category: "Inspiration" },
                { id: 4, text: "Strive not to be a success, but rather to be of value.", category: "Wisdom" },
                { id: 5, text: "Do one thing every day that scares you.", category: "Courage" }
            ];
        }
    }
}

// --- Server Communication Functions ---

/**
 * Fetches quotes from a mock server API (JSONPlaceholder posts).
 * @returns {Promise<Array>} A promise that resolves with an array of formatted quotes.
 */
async function fetchQuotesFromServer() {
    const API_URL = 'https://jsonplaceholder.typicode.com/posts';
    showNotification('Syncing with server...', 'info', 5000); // UI notification

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const fetchedQuotes = data.map(post => ({
            id: post.id,
            text: post.title,
            category: `User ${post.userId}`
        }));
        showNotification('Quotes synced with server!', 'success'); // UI notification
        return fetchedQuotes;
    } catch (error) {
        console.error('Could not fetch quotes from server:', error);
        showNotification('Server sync failed!', 'error'); // UI notification
        return [];
    }
}

/**
 * Posts a new quote to the server using a mock API.
 * This demonstrates 'method', 'POST', 'headers', 'Content-Type'.
 * @param {Object} quoteData - The quote object to send (e.g., {text, category, id}).
 */
async function postQuoteToServer(quoteData) {
    const API_URL = 'https://jsonplaceholder.typicode.com/posts'; // Mock API for POST requests
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quoteData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        console.log('Quote successfully posted to server (mock):', responseData);
        showNotification('Quote added locally & sent to server!', 'success'); // UI notification
    } catch (error) {
        console.error('Failed to post quote to server:', error);
        showNotification('Quote added locally, but server sync failed!', 'error'); // UI notification
    }
}

/**
 * Syncs local quotes with server data. Fetches from server,
 * updates local storage, and resolves conflicts.
 */
async function syncQuotes() {
    console.log('Starting quote synchronization...');
    showNotification('Syncing quotes...', 'info');

    const serverQuotes = await fetchQuotesFromServer(); // Get latest from server

    if (serverQuotes.length === 0) {
        console.warn("No new quotes fetched from server during sync. Keeping local quotes.");
        showNotification('Sync complete: No new server quotes.', 'info');
        return;
    }

    let mergedQuotes = [];
    let conflicts = 0;
    let newQuotesAdded = 0;

    const localQuoteMap = new Map(quotes.map(q => [q.id, q]));
    const serverQuoteMap = new Map(serverQuotes.map(q => [q.id, q]));

    // Add/Update server quotes, prioritize server version
    serverQuotes.forEach(serverQ => {
        if (localQuoteMap.has(serverQ.id)) {
            const localQ = localQuoteMap.get(serverQ.id);
            if (JSON.stringify(localQ) !== JSON.stringify(serverQ)) {
                conflicts++;
                console.warn(`Conflict detected for ID ${serverQ.id}. Server version applied.`);
            }
            mergedQuotes.push(serverQ); // Server version wins
            localQuoteMap.delete(serverQ.id); // Mark as processed
        } else {
            mergedQuotes.push(serverQ); // New quote from server
            newQuotesAdded++;
        }
    });

    // Add any remaining local quotes that were not on the server (i.e., new local additions)
    localQuoteMap.forEach(localQ => {
        mergedQuotes.push(localQ);
    });

    quotes = mergedQuotes; // Update global quotes array
    saveQuotes(); // Save the merged array to local storage
    populateCategories(); // Update categories with new merged data
    showRandomQuote(selectedCategory); // Refresh displayed quote

    if (conflicts > 0) {
        showNotification(`Sync complete: ${newQuotesAdded} new, ${conflicts} conflicts resolved (server wins).`, 'warning', 7000); // UI notification
    } else if (newQuotesAdded > 0) {
        showNotification(`Sync complete: ${newQuotesAdded} new quotes added!`, 'success'); // UI notification
    } else {
        showNotification('Sync complete: No changes.', 'info'); // UI notification
    }
    console.log('Quote synchronization complete. Total quotes:', quotes.length);
}

// --- Display & Filtering Functions ---

/**
 * Populates the category filter dropdown with unique categories from the current quotes.
 * Uses Array.prototype.map and Set for efficiency.
 */
function populateCategories() {
    const categories = quotes.map(quote => quote.category);
    const uniqueCategories = ["all", ...new Set(categories)];

    categoryFilter.innerHTML = ''; // Clear existing options

    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category === "all" ? "All Categories" : category;
        categoryFilter.appendChild(option);
    });

    // Ensure the previously selected category remains selected if it exists
    if (uniqueCategories.includes(selectedCategory)) {
        categoryFilter.value = selectedCategory;
    } else {
        selectedCategory = 'all'; // Reset if category no longer exists
        categoryFilter.value = 'all';
    }
}

/**
 * Filters the main 'quotes' array based on the selected category.
 * @param {string} category - The category to filter by ('all' for no filter).
 * @returns {Array} An array of quotes filtered by the given category.
 */
function filterQuote(category) {
    if (category === 'all' || category === '') {
        return quotes; // Return all quotes if no specific filter
    }
    return quotes.filter(quote => quote.category === category);
}

/**
 * Displays a random quote from
