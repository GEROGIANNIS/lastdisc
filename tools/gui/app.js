// LastDisc GUI Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let selectedGame = null;
    let customImageBase64 = null;
    let activeBgType = 'steam'; // 'steam', 'color', 'upload'

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const editorControls = document.getElementById('editor-controls');
    
    // Editor Form Inputs
    const inputTitle = document.getElementById('input-title');
    const inputAppid = document.getElementById('input-appid');
    const inputSpine = document.getElementById('input-spine');
    const colorBg = document.getElementById('color-bg');
    const colorText = document.getElementById('color-text');
    const fontSelect = document.getElementById('font-family');
    const alignSelect = document.getElementById('text-align');
    const rangeOpacity = document.getElementById('input-overlay-opacity');
    
    // Custom Background Layout Elements
    const steamArtStyle = document.getElementById('steam-art-style');
    const checkUseLogo = document.getElementById('check-use-logo');
    const steamStyleGroup = document.getElementById('steam-style-group');
    const logoOverlayGroup = document.getElementById('logo-overlay-group');
    
    // Background type buttons
    const btnBgSteam = document.getElementById('btn-bg-steam');
    const btnBgColor = document.getElementById('btn-bg-color');
    const uploadBg = document.getElementById('upload-bg');

    // Action buttons
    const btnPrint = document.getElementById('btn-print');
    const btnIso = document.getElementById('btn-iso');
    const statusBox = document.getElementById('iso-status');
    const statusText = document.getElementById('status-text');

    // Layout Preview elements
    const previewFrontTitle = document.getElementById('preview-front-title');
    const previewFrontAppid = document.getElementById('preview-front-appid');
    const previewFrontLogo = document.getElementById('preview-front-logo');
    const previewBackTitle = document.getElementById('preview-back-title');
    const previewBackAppid = document.getElementById('preview-back-appid');
    const previewBackLogo = document.getElementById('preview-back-logo');
    const previewSpineL = document.getElementById('preview-spine-l');
    const previewSpineR = document.getElementById('preview-spine-r');
    const previewDiscTitle = document.getElementById('preview-disc-title');
    const previewDiscAppid = document.getElementById('preview-disc-appid');
    const previewDiscLogo = document.getElementById('preview-disc-logo');
    const barcodeAppid = document.getElementById('barcode-appid');

    // Cover Layers for backgrounds
    const cdFront = document.getElementById('cd-front');
    const cdBack = document.getElementById('cd-back');
    const cdDisc = document.getElementById('cd-disc');
    const imageLayers = document.querySelectorAll('.cd-image-layer');
    const overlayLayers = document.querySelectorAll('.cd-overlay-layer');

    // Tabs switcher
    const tabBtns = document.querySelectorAll('.tab-btn');
    const editorWorkspace = document.getElementById('editor-workspace');

    // Init tab workspace class
    editorWorkspace.classList.add('workspace-all');

    // Search input Enter key handler
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    searchButton.addEventListener('click', performSearch);

    // Perform game lookup via local server API
    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        searchResults.innerHTML = '<div class="empty-state">Searching for games...</div>';

        fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                renderSearchResults(data);
            })
            .catch(err => {
                searchResults.innerHTML = '<div class="empty-state">Failed to fetch search results. Make sure backend is running.</div>';
                console.error(err);
            });
    }

    // Render list of game search results
    function renderSearchResults(games) {
        if (!games || games.length === 0) {
            searchResults.innerHTML = '<div class="empty-state">No games found. Try adjusting your search query.</div>';
            return;
        }

        searchResults.innerHTML = '';
        games.forEach(game => {
            const item = document.createElement('div');
            item.className = 'game-item';
            
            // Build capsule image
            const imgUrl = game.image || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`;
            const proxiedImgUrl = `/api/proxy-image?url=${encodeURIComponent(imgUrl)}`;
            
            const isLocal = game.installed;
            const badgeClass = isLocal ? 'local' : 'store';
            const badgeText = isLocal ? 'Installed' : 'Steam DB';

            item.innerHTML = `
                <img src="${proxiedImgUrl}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2228%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23222%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23555%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%228%22>No Art</text></svg>'">
                <div class="game-info">
                    <div class="game-name">${game.name}</div>
                    <div class="game-meta">
                        <span>AppID: ${game.appid}</span>
                        <span class="badge-source ${badgeClass}">${badgeText}</span>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                document.querySelectorAll('.game-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                
                selectGame(game);
            });

            searchResults.appendChild(item);
        });
    }

    // Select game and initialize Editor Controls
    function selectGame(game) {
        selectedGame = game;
        customImageBase64 = null;
        activeBgType = 'steam';
        
        btnBgSteam.classList.add('active');
        btnBgColor.classList.remove('active');
        
        editorControls.style.display = 'block';
        btnPrint.disabled = false;
        btnIso.disabled = false;

        inputTitle.value = game.name;
        inputAppid.value = game.appid;
        inputSpine.value = '';

        updateLayoutContent();
        updateBgArt();
    }

    // Update layouts textual contents based on inputs
    function updateLayoutContent() {
        if (!selectedGame) return;

        const titleText = inputTitle.value.trim() || selectedGame.name;
        const appidText = inputAppid.value.trim() || selectedGame.appid;
        const spineText = inputSpine.value.trim() || titleText;

        // Front Cover
        previewFrontTitle.textContent = titleText;
        previewFrontAppid.textContent = `AppID: ${appidText}`;

        // Back Cover
        previewBackTitle.textContent = titleText;
        previewBackAppid.textContent = `STEAM APPID: ${appidText}`;
        barcodeAppid.textContent = appidText.padStart(12, '0');

        // Spines
        previewSpineL.textContent = spineText;
        previewSpineR.textContent = spineText;

        // Disc Label
        previewDiscTitle.textContent = titleText;
        previewDiscAppid.textContent = `AppID: ${appidText}`;
        
        updateLogoOverlay();
    }

    // Dynamically fetch and display background artwork
    function updateBgArt() {
        if (!selectedGame) return;

        imageLayers.forEach(layer => {
            layer.style.backgroundImage = 'none';
        });

        if (activeBgType === 'steam') {
            steamStyleGroup.style.display = 'block';
            logoOverlayGroup.style.display = 'block';

            let assetPath = 'library_600x900.jpg';
            if (steamArtStyle.value === 'hero') {
                assetPath = 'library_hero.jpg';
            } else if (steamArtStyle.value === 'header') {
                assetPath = 'header.jpg';
            }

            const coverUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${selectedGame.appid}/${assetPath}`;
            const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`;
            
            imageLayers.forEach(layer => {
                layer.style.backgroundImage = `url('${proxiedUrl}')`;
            });
        } else {
            steamStyleGroup.style.display = 'none';
            logoOverlayGroup.style.display = 'none';

            if (activeBgType === 'upload' && customImageBase64) {
                imageLayers.forEach(layer => {
                    layer.style.backgroundImage = `url('${customImageBase64}')`;
                });
            }
        }

        updateLogoOverlay();
    }

    // Updates logo transparent overlay graphic
    function updateLogoOverlay() {
        const useLogo = checkUseLogo.checked && activeBgType === 'steam' && selectedGame;

        const logoElms = [
            { logo: previewFrontLogo, text: previewFrontTitle },
            { logo: previewBackLogo, text: previewBackTitle },
            { logo: previewDiscLogo, text: previewDiscTitle }
        ];

        if (useLogo) {
            const logoUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${selectedGame.appid}/logo.png`;
            const proxiedLogo = `/api/proxy-image?url=${encodeURIComponent(logoUrl)}`;

            logoElms.forEach(item => {
                item.logo.onload = () => {
                    item.logo.style.display = 'block';
                    item.text.style.display = 'none';
                };
                item.logo.onerror = () => {
                    item.logo.style.display = 'none';
                    item.text.style.display = 'block';
                };
                item.logo.src = proxiedLogo;
            });
        } else {
            logoElms.forEach(item => {
                item.logo.src = '';
                item.logo.style.display = 'none';
                item.text.style.display = 'block';
            });
        }
    }

    // Apply color, fonts and layout styles
    function applyStyles() {
        const textVal = colorText.value;
        const bgVal = colorBg.value;
        const fontVal = fontSelect.value;
        const alignVal = alignSelect.value;
        const opacityVal = rangeOpacity.value;

        cdFront.style.backgroundColor = bgVal;
        cdBack.style.backgroundColor = bgVal;
        cdDisc.style.backgroundColor = bgVal;

        document.querySelectorAll('.cd-front .cd-text-content, .cd-disc-content').forEach(el => {
            el.style.textAlign = alignVal;
            el.style.alignItems = alignVal === 'center' ? 'center' : (alignVal === 'right' ? 'flex-end' : 'flex-start');
        });

        const badge = document.querySelector('.cd-front-badge');
        if (badge) {
            badge.style.alignSelf = alignVal === 'center' ? 'center' : (alignVal === 'right' ? 'flex-end' : 'flex-start');
        }

        cdFront.style.color = textVal;
        cdBack.style.color = textVal;
        cdDisc.style.color = textVal;

        cdFront.style.fontFamily = fontVal;
        cdBack.style.fontFamily = fontVal;
        cdDisc.style.fontFamily = fontVal;

        overlayLayers.forEach(layer => {
            layer.style.backgroundColor = `rgba(10, 10, 12, ${opacityVal / 100})`;
        });
    }

    inputTitle.addEventListener('input', updateLayoutContent);
    inputSpine.addEventListener('input', updateLayoutContent);

    colorBg.addEventListener('input', applyStyles);
    colorText.addEventListener('input', applyStyles);
    fontSelect.addEventListener('change', applyStyles);
    alignSelect.addEventListener('change', applyStyles);
    rangeOpacity.addEventListener('input', applyStyles);

    steamArtStyle.addEventListener('change', updateBgArt);
    checkUseLogo.addEventListener('change', updateLogoOverlay);

    btnBgSteam.addEventListener('click', () => {
        activeBgType = 'steam';
        btnBgSteam.classList.add('active');
        btnBgColor.classList.remove('active');
        updateBgArt();
    });

    btnBgColor.addEventListener('click', () => {
        activeBgType = 'color';
        btnBgColor.classList.add('active');
        btnBgSteam.classList.remove('active');
        updateBgArt();
    });

    uploadBg.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            customImageBase64 = event.target.result;
            activeBgType = 'upload';
            btnBgSteam.classList.remove('active');
            btnBgColor.classList.remove('active');
            updateBgArt();
        };
        reader.readAsDataURL(file);
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.getAttribute('data-target');
            
            editorWorkspace.classList.remove('workspace-all', 'workspace-front', 'workspace-back', 'workspace-disc');
            editorWorkspace.classList.add(target);
        });
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    btnIso.addEventListener('click', () => {
        if (!selectedGame) return;

        const titleText = inputTitle.value.trim() || selectedGame.name;
        const appidText = inputAppid.value.trim() || selectedGame.appid;

        statusBox.style.display = 'flex';
        statusText.textContent = 'Generating CD ISO image...';
        btnIso.disabled = true;

        fetch('/api/create-iso', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appid: appidText,
                title: titleText
            })
        })
        .then(async response => {
            if (response.status === 200) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = titleText.replace(/[^a-zA-Z0-9_-]/g, '_');
                a.download = `${safeName}.iso`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                
                statusText.textContent = 'ISO Downloaded successfully!';
                setTimeout(() => {
                    statusBox.style.display = 'none';
                }, 3000);
            } else if (response.status === 422) {
                const data = await response.json();
                statusBox.style.display = 'none';
                alert(`SUCCESS: Generated marker manifest folder structure at:\n${data.path}\n\nNote: No ISO-authoring tools (genisoimage/mkisofs/xorriso/oscdimg) were found on the host system to compile it into a single .iso file.`);
            } else {
                const text = await response.text();
                throw new Error(text || 'Failed to generate ISO');
            }
        })
        .catch(err => {
            statusText.textContent = 'Error creating ISO.';
            console.error(err);
            alert(`Error: ${err.message}`);
            setTimeout(() => {
                statusBox.style.display = 'none';
            }, 4000);
        })
        .finally(() => {
            btnIso.disabled = false;
        });
    });
});
