// Genre to subgenre mapping
const genreSubgenres = {
    "rock": ["hard rock", "album rock", "permanent wave", "classic rock"],
    "r&b": ["new jack swing", "neo soul", "urban contemporary", "hip pop"],
    "pop": ["dance pop", "indie poptimism", "post-teen pop", "electropop"],
    "edm": ["big room", "progressive electro house", "pop edm", "electro house"],
    "rap": ["gangster rap", "trap", "southern hip hop", "hip hop"],
    "latin": ["tropical", "latin hip hop", "latin pop", "reggaeton"]
};

// API endpoint - adjust this to match your server URL
const API_URL = 'http://localhost:8000/predict/';

// DOM elements
const genreSelect = document.getElementById('genre');
const subgenreSelect = document.getElementById('subgenre');
const form = document.getElementById('recommendationForm');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');
const recommendationsContainer = document.getElementById('recommendations');
const recommendationsList = document.getElementById('recommendationsList');
const artistInput = document.getElementById('artist');
const artistAutocomplete = document.getElementById('artistAutocomplete');

// Artist data
let allArtists = [];
let selectedIndex = -1;

// Range input elements
const energyInput = document.getElementById('energy');
const modeInput = document.getElementById('mode');
const speechinessInput = document.getElementById('speechiness');
const instrumentalnessInput = document.getElementById('instrumentalness');

// Range value displays
const energyValue = document.getElementById('energyValue');
const modeValue = document.getElementById('modeValue');
const speechinessValue = document.getElementById('speechinessValue');
const instrumentalnessValue = document.getElementById('instrumentalnessValue');

// Update subgenre options when genre changes
genreSelect.addEventListener('change', (e) => {
    const selectedGenre = e.target.value;
    subgenreSelect.innerHTML = '<option value="">Select a subgenre</option>';
    
    if (selectedGenre && genreSubgenres[selectedGenre]) {
        genreSubgenres[selectedGenre].forEach(subgenre => {
            const option = document.createElement('option');
            option.value = subgenre;
            option.textContent = subgenre.charAt(0).toUpperCase() + subgenre.slice(1);
            subgenreSelect.appendChild(option);
        });
    }
});

// Load artists from JSON file
async function loadArtists() {
    const paths = ['/artist.json', '../artist.json', 'artist.json'];
    
    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                allArtists = await response.json();
                // Sort artists alphabetically for better UX
                allArtists.sort();
                console.log(`Loaded ${allArtists.length} artists from ${path}`);
                return;
            }
        } catch (error) {
            // Try next path
            continue;
        }
    }
    
    console.error('Could not load artists from any path. Please ensure artist.json is accessible.');
}

// Filter artists based on input
function filterArtists(query) {
    if (!query || query.length < 1) {
        return [];
    }
    const lowerQuery = query.toLowerCase();
    return allArtists.filter(artist => 
        artist.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit to 10 results for better performance
}

// Display autocomplete suggestions
function showAutocomplete(suggestions) {
    artistAutocomplete.innerHTML = '';
    
    if (suggestions.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'autocomplete-no-results';
        noResults.textContent = 'No artists found';
        artistAutocomplete.appendChild(noResults);
    } else {
        suggestions.forEach((artist, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = artist;
            item.dataset.index = index;
            
            item.addEventListener('click', () => {
                selectArtist(artist);
            });
            
            item.addEventListener('mouseenter', () => {
                selectedIndex = index;
                updateSelectedItem();
            });
            
            artistAutocomplete.appendChild(item);
        });
    }
    
    artistAutocomplete.classList.add('show');
}

// Hide autocomplete dropdown
function hideAutocomplete() {
    artistAutocomplete.classList.remove('show');
    selectedIndex = -1;
}

// Select an artist from autocomplete
function selectArtist(artist) {
    artistInput.value = artist;
    hideAutocomplete();
    selectedIndex = -1;
}

// Update selected item in autocomplete
function updateSelectedItem() {
    const items = artistAutocomplete.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Handle artist input
artistInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (query.length >= 1) {
        const suggestions = filterArtists(query);
        showAutocomplete(suggestions);
    } else {
        hideAutocomplete();
    }
});

// Handle keyboard navigation in autocomplete
artistInput.addEventListener('keydown', (e) => {
    const items = artistAutocomplete.querySelectorAll('.autocomplete-item');
    
    if (!artistAutocomplete.classList.contains('show') || items.length === 0) {
        return;
    }
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelectedItem();
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        if (selectedIndex === -1) {
            items.forEach(item => item.classList.remove('selected'));
        } else {
            updateSelectedItem();
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const selectedArtist = items[selectedIndex].textContent;
        selectArtist(selectedArtist);
    } else if (e.key === 'Escape') {
        hideAutocomplete();
    }
});

// Hide autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (!artistInput.contains(e.target) && !artistAutocomplete.contains(e.target)) {
        hideAutocomplete();
    }
});

// Load artists when page loads
loadArtists();

// Update range value displays
energyInput.addEventListener('input', (e) => {
    energyValue.textContent = parseFloat(e.target.value).toFixed(2);
});

modeInput.addEventListener('input', (e) => {
    modeValue.textContent = parseFloat(e.target.value).toFixed(2);
});

speechinessInput.addEventListener('input', (e) => {
    speechinessValue.textContent = parseFloat(e.target.value).toFixed(2);
});

instrumentalnessInput.addEventListener('input', (e) => {
    instrumentalnessValue.textContent = parseFloat(e.target.value).toFixed(2);
});

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide autocomplete
    hideAutocomplete();
    
    // Hide previous results
    errorMessage.style.display = 'none';
    recommendationsContainer.style.display = 'none';
    
    // Get form data
    const formData = {
        artist: document.getElementById('artist').value.trim(),
        popularity: parseInt(document.getElementById('popularity').value) || 50,
        genre: document.getElementById('genre').value,
        subgenre: document.getElementById('subgenre').value,
        energy: parseFloat(energyInput.value),
        mode: parseFloat(modeInput.value),
        speechiness: parseFloat(speechinessInput.value),
        instrumentalness: parseFloat(instrumentalnessInput.value)
    };
    
    // Validate required fields
    if (!formData.artist || !formData.genre || !formData.subgenre) {
        showError('Please fill in all required fields (Artist, Genre, and Subgenre).');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.error) {
            showError(data.error);
        } else if (data.recommendations && data.recommendations.length > 0) {
            displayRecommendations(data.recommendations);
        } else {
            showError('No recommendations found. Please try different parameters.');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to connect to the server. Please make sure the server is running on ' + API_URL);
    } finally {
        setLoadingState(false);
    }
});

function setLoadingState(loading) {
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
        submitBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayRecommendations(recommendations) {
    recommendationsList.innerHTML = '';
    
    recommendations.forEach((rec, index) => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        const similarity = (rec.similarity * 100).toFixed(1);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="track-icon">🎵</div>
                <div class="similarity-badge">${similarity}% Match</div>
            </div>
            <h3 class="track-name">${rec.track_name || 'Unknown Track'}</h3>
            <div class="track-artist">${rec.track_artist || 'Unknown Artist'}</div>
        `;
        
        recommendationsList.appendChild(card);
    });
    
    recommendationsContainer.style.display = 'block';
    recommendationsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

