// LastDisc GUI Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let selectedGame = null;
    let cachedDrives = [];
    
    // Configurations for each cover layout independently
    const layoutConfigs = {
        front: {
            bgType: 'steam', // 'steam', 'color', 'upload'
            artStyle: 'boxart', // 'boxart', 'hero', 'header'
            useLogo: true,
            customImage: null,
            bgColor: '#121214',
            textColor: '#ffffff',
            opacity: 30,
            bgZoom: 100,
            logoSize: 100
        },
        back: {
            bgType: 'steam',
            artStyle: 'hero',
            useLogo: false,
            customImage: null,
            bgColor: '#121214',
            textColor: '#ffffff',
            opacity: 30,
            bgZoom: 100,
            logoSize: 100,
            showRequirements: false,
            requirements: ""
        },
        disc: {
            bgType: 'steam',
            artStyle: 'header',
            useLogo: true,
            customImage: null,
            bgColor: '#121214',
            textColor: '#ffffff',
            opacity: 30,
            bgZoom: 100,
            logoSize: 100
        }
    };

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const editorControls = document.getElementById('editor-controls');
    
    // Editor Form Inputs
    const inputTitle = document.getElementById('input-title');
    const inputAppid = document.getElementById('input-appid');
    const inputSpine = document.getElementById('input-spine');
    const fontSelect = document.getElementById('font-family');
    const alignSelect = document.getElementById('text-align');
    const caseSizeSelect = document.getElementById('case-size-select');

    // System Requirements Inputs
    const backShowRequirements = document.getElementById('back-show-requirements');
    const backRequirementsTextarea = document.getElementById('back-requirements-text');
    const backRequirementsTextareaGroup = document.getElementById('back-requirements-textarea-group');

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
    const previewBackRequirements = document.getElementById('preview-back-requirements');
    const previewRequirementsContent = document.getElementById('preview-requirements-content');
    const previewBackInstructions = document.getElementById('preview-back-instructions');
    const previewSpineL = document.getElementById('preview-spine-l');
    const previewSpineR = document.getElementById('preview-spine-r');
    const previewDiscTitle = document.getElementById('preview-disc-title');
    const previewDiscAppid = document.getElementById('preview-disc-appid');
    const previewDiscLogo = document.getElementById('preview-disc-logo');
    const barcodeAppid = document.getElementById('barcode-appid');

    // DVD Wraparound Preview elements
    const previewDvdBackTitle = document.getElementById('preview-dvd-back-title');
    const previewDvdBackAppid = document.getElementById('preview-dvd-back-appid');
    const previewDvdBackLogo = document.getElementById('preview-dvd-back-logo');
    const previewDvdBackRequirements = document.getElementById('preview-dvd-back-requirements');
    const previewDvdRequirementsContent = document.getElementById('preview-dvd-requirements-content');
    const previewDvdBackInstructions = document.getElementById('preview-dvd-back-instructions');
    const dvdBarcodeAppid = document.getElementById('dvd-barcode-appid');
    const previewDvdSpine = document.getElementById('preview-dvd-spine');
    const previewDvdSpineLogo = document.getElementById('preview-dvd-spine-logo');
    const previewDvdFrontTitle = document.getElementById('preview-dvd-front-title');
    const previewDvdFrontAppid = document.getElementById('preview-dvd-front-appid');
    const previewDvdFrontLogo = document.getElementById('preview-dvd-front-logo');

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

        const searchSteam = document.getElementById('filter-steam').checked;
        const searchGog = document.getElementById('filter-gog').checked;
        const platforms = [];
        if (searchSteam) platforms.push('steam');
        if (searchGog) platforms.push('gog');

        if (platforms.length === 0) {
            searchResults.innerHTML = '<div class="empty-state">Please select at least one platform filter.</div>';
            return;
        }

        fetch(`/api/search?q=${encodeURIComponent(query)}&platforms=${platforms.join(',')}`)
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
            const platform = game.platform || 'steam';
            const imgUrl = game.cover_url || game.image || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`;
            const proxiedImgUrl = `/api/proxy-image?url=${encodeURIComponent(imgUrl)}`;
            
            const isLocal = game.installed;
            const badgeClass = `${platform}-${isLocal ? 'local' : 'store'}`;
            const badgeText = isLocal 
                ? `Installed (${platform.toUpperCase()})` 
                : `${platform === 'gog' ? 'GOG' : 'Steam'} DB`;

            item.innerHTML = `
                <img src="${proxiedImgUrl}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2228%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23222%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23555%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%228%22>No Art</text></svg>'">
                <div class="game-info">
                    <div class="game-name">${game.name}</div>
                    <div class="game-meta">
                        <span>${platform === 'gog' ? 'GOG ID' : 'AppID'}: ${game.appid}</span>
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

    // Helper function to clean raw Steam HTML system requirements into formatted plain text
    function cleanRequirementsHtml(html) {
        if (!html) return "";
        
        // Remove "Minimum:" headers
        let clean = html.replace(/<strong>Minimum:<\/strong><br>|Minimum:<br>/i, "");
        
        // Convert list items to bullet points
        clean = clean.replace(/<li>/g, "• ");
        clean = clean.replace(/<\/li>/g, "\n");
        
        // Convert br tags to newlines
        clean = clean.replace(/<br\s*\/?>/g, "\n");
        
        // Strip any other markup
        clean = clean.replace(/<[^>]*>/g, "");
        
        // Clean multiple newlines
        clean = clean.trim().replace(/\n\s*\n+/g, "\n");
        
        return clean;
    }

    // Select game and initialize Editor Controls
    function selectGame(game) {
        selectedGame = game;
        
        // Reset layout configs custom images if a new game is selected
        ['front', 'back', 'disc'].forEach(layout => {
            layoutConfigs[layout].customImage = null;
            layoutConfigs[layout].bgType = 'steam'; // fallback to steam art
            layoutConfigs[layout].bgZoom = 100;
            layoutConfigs[layout].logoSize = 100;
        });

        // Reset system requirements
        layoutConfigs.back.showRequirements = false;
        layoutConfigs.back.requirements = "";
        backShowRequirements.checked = false;
        backRequirementsTextarea.value = "";
        backRequirementsTextareaGroup.style.display = "none";

        editorControls.style.display = 'block';
        const driveControls = document.getElementById('drive-controls');
        if (driveControls) {
            driveControls.style.display = 'block';
            refreshDrivesList();
        }
        btnPrint.disabled = false;
        btnIso.disabled = false;

        inputTitle.value = game.name;
        inputAppid.value = game.appid;
        inputSpine.value = '';

        const platform = game.platform || 'steam';
        const radio = document.querySelector(`input[name="launcher-type"][value="${platform}"]`);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        }

        // Reset active classes on all source buttons in sidebar HTML
        document.querySelectorAll('.btn-bg-source').forEach(btn => {
            const bgType = btn.dataset.bg;
            if (bgType === 'steam') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Reset all zoom/size sliders
        document.querySelectorAll('.bg-zoom-range').forEach(input => input.value = 100);
        document.querySelectorAll('.logo-size-range').forEach(input => input.value = 100);
        document.querySelectorAll('[id$="-bg-zoom-val"]').forEach(span => span.textContent = '100');
        document.querySelectorAll('[id$="-logo-size-val"]').forEach(span => span.textContent = '100');

        // Fetch dynamic system requirements details from local details API proxy
        fetch(`/api/game-details?appid=${game.appid}`)
            .then(res => res.json())
            .then(detail => {
                if (detail && detail.requirements) {
                    const cleaned = cleanRequirementsHtml(detail.requirements);
                    layoutConfigs.back.requirements = cleaned;
                    backRequirementsTextarea.value = cleaned;
                    layoutConfigs.back.showRequirements = true;
                    backShowRequirements.checked = true;
                    backRequirementsTextareaGroup.style.display = "block";
                    updateLayoutContent();
                }
            })
            .catch(err => console.error("Failed to query game details for PC requirements:", err));

        // Trigger updates
        updateLayoutContent();
        refreshAllLayouts();
    }

    // Refresh backgrounds, logos, and styles for all covers
    function refreshAllLayouts() {
        ['front', 'back', 'disc'].forEach(layout => {
            updateLayoutBackground(layout);
            updateLayoutLogo(layout);
            applyLayoutStyles(layout);
        });
    }

    // Update layouts textual contents based on inputs
    function updateLayoutContent() {
        if (!selectedGame) return;

        const titleText = inputTitle.value.trim() || selectedGame.name;
        const appidText = inputAppid.value.trim() || selectedGame.appid;
        const spineText = inputSpine.value.trim() || titleText;
        
        const launcherVal = document.querySelector('input[name="launcher-type"]:checked').value;
        const isGog = launcherVal === 'gog';

        // Front Cover
        previewFrontTitle.textContent = titleText;
        previewFrontAppid.textContent = `${isGog ? 'GOG ID' : 'AppID'}: ${appidText}`;

        // Back Cover
        previewBackTitle.textContent = titleText;
        previewBackAppid.textContent = `${isGog ? 'GOG GAME ID' : 'STEAM APPID'}: ${appidText}`;
        barcodeAppid.textContent = appidText.padStart(12, '0');

        // Spines
        previewSpineL.textContent = spineText;
        previewSpineR.textContent = spineText;

        // Disc Label
        previewDiscTitle.textContent = titleText;
        previewDiscAppid.textContent = `${isGog ? 'GOG ID' : 'AppID'}: ${appidText}`;

        // DVD Wraparound Cover Text Mirroring
        if (previewDvdSpine) previewDvdSpine.textContent = spineText;
        if (previewDvdFrontTitle) previewDvdFrontTitle.textContent = titleText;
        if (previewDvdFrontAppid) previewDvdFrontAppid.textContent = `${isGog ? 'GOG ID' : 'AppID'}: ${appidText}`;
        if (previewDvdBackTitle) previewDvdBackTitle.textContent = titleText;
        if (previewDvdBackAppid) previewDvdBackAppid.textContent = `${isGog ? 'GOG GAME ID' : 'STEAM APPID'}: ${appidText}`;
        if (dvdBarcodeAppid) dvdBarcodeAppid.textContent = appidText.padStart(12, '0');

        // Swap SVG badges dynamically
        document.querySelectorAll('.cd-front-badge').forEach(badge => {
            const iconSpan = badge.querySelector('.badge-icon');
            const textSpan = badge.querySelector('.badge-text');
            if (textSpan) {
                textSpan.textContent = isGog ? 'GOG Galaxy' : 'Steam launcher';
            }
            if (iconSpan) {
                if (isGog) {
                    iconSpan.innerHTML = `
                        <svg class="gog-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#FF0055" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right: 2px;">
                            <path d="M8 .2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L8 13l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>
                        </svg>
                    `;
                } else {
                    iconSpan.innerHTML = `
                        <svg class="steam-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right: 2px;">
                            <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z"/>
                            <path d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048"/>
                        </svg>
                    `;
                }
            }
        });

        // System Requirements display logic
        const showReqs = layoutConfigs.back.showRequirements;
        if (showReqs && layoutConfigs.back.requirements) {
            previewBackRequirements.style.display = "block";
            previewRequirementsContent.textContent = layoutConfigs.back.requirements;
            previewBackInstructions.classList.add("compact");

            if (previewDvdBackRequirements) {
                previewDvdBackRequirements.style.display = "block";
                previewDvdRequirementsContent.textContent = layoutConfigs.back.requirements;
                previewDvdBackInstructions.classList.add("compact");
            }
        } else {
            previewBackRequirements.style.display = "none";
            previewBackInstructions.classList.remove("compact");

            if (previewDvdBackRequirements) {
                previewDvdBackRequirements.style.display = "none";
                previewDvdBackInstructions.classList.remove("compact");
            }
        }

        // Generate dynamic vector barcodes matching AppID
        generateBarcode(appidText, '.barcode-lines');
        
        ['front', 'back', 'disc'].forEach(layout => {
            updateLayoutLogo(layout);
        });
    }

    // Generate vector Code 39 barcode dynamically inside target containers
    function generateBarcode(appidText, containerSelector = '.barcode-lines') {
        const barcodeLinesContainers = document.querySelectorAll(containerSelector);
        if (barcodeLinesContainers.length === 0) return;
        
        let cleanAppid = appidText.replace(/[^0-9]/g, '');
        if (cleanAppid.length < 8) {
            cleanAppid = cleanAppid.padStart(8, '0');
        }
        
        // Standard Code 39 translation matrix
        const code39 = {
            '0': 'N N W W N W N N N',
            '1': 'W N N W N N N N W',
            '2': 'N N W W N N N N W',
            '3': 'W N W W N N N N N',
            '4': 'N N N W W N N N W',
            '5': 'W N N W W N N N N',
            '6': 'N N W W W N N N N',
            '7': 'N N N W N N W N W',
            '8': 'W N N W N N W N N',
            '9': 'N N W W N N W N N',
            '*': 'N N W W N W N N N'
        };
        
        const fullCode = '*' + cleanAppid + '*';
        
        barcodeLinesContainers.forEach(barcodeLinesContainer => {
            barcodeLinesContainer.innerHTML = '';
            
            let patternSequence = [];
            for (let i = 0; i < fullCode.length; i++) {
                const char = fullCode[i];
                const representation = code39[char] || code39['*'];
                const elements = representation.split(' ');
                
                for (let j = 0; j < elements.length; j++) {
                    const isBlack = (j % 2 === 0);
                    const isWide = (elements[j] === 'W');
                    patternSequence.push({ isBlack, isWide });
                }
                
                // Add narrow space between characters
                if (i < fullCode.length - 1) {
                    patternSequence.push({ isBlack: false, isWide: false });
                }
            }
            
            let totalUnits = 0;
            patternSequence.forEach(bar => {
                totalUnits += bar.isWide ? 2.5 : 1.0;
            });
            
            patternSequence.forEach(bar => {
                const barDiv = document.createElement('div');
                const weight = bar.isWide ? 2.5 : 1.0;
                const widthPct = (weight / totalUnits) * 100;
                
                barDiv.style.width = `${widthPct}%`;
                barDiv.style.height = '100%';
                barDiv.style.backgroundColor = bar.isBlack ? '#000000' : '#ffffff';
                barcodeLinesContainer.appendChild(barDiv);
            });
        });
    }

    // Dynamically fetch and display background artwork for a specific layout
    function updateLayoutBackground(layout) {
        if (!selectedGame) return;

        const config = layoutConfigs[layout];

        // Hide/show the options groups in the HTML accordion details block
        const steamStyleGroup = document.getElementById(`${layout}-steam-style-group`);
        const logoOverlayGroup = document.getElementById(`${layout}-logo-overlay-group`);
        const logoSizeGroup = document.getElementById(`${layout}-logo-size-group`);

        // Update background zoom label indicators
        const zoomValSpan = document.getElementById(`${layout}-bg-zoom-val`);
        if (zoomValSpan) zoomValSpan.textContent = config.bgZoom;

        if (config.bgType === 'steam') {
            if (steamStyleGroup) steamStyleGroup.style.display = 'block';
            if (logoOverlayGroup) logoOverlayGroup.style.display = 'block';
            if (logoSizeGroup) logoSizeGroup.style.display = 'block';
        } else {
            if (steamStyleGroup) steamStyleGroup.style.display = 'none';
            if (logoOverlayGroup) logoOverlayGroup.style.display = 'none';
            if (logoSizeGroup) logoSizeGroup.style.display = 'none';
        }

        const applyBg = (layer) => {
            if (!layer) return;
            layer.style.backgroundImage = 'none';
            
            if (layer.closest('.dvd-back-panel')) {
                layer.style.transform = `rotate(90deg) scale(${config.bgZoom / 100})`;
            } else {
                layer.style.transform = `scale(${config.bgZoom / 100})`;
            }

            if (config.bgType === 'steam') {
                let coverUrl = '';
                if (selectedGame.platform === 'gog') {
                    coverUrl = selectedGame.cover_url || '';
                } else {
                    let assetPath = 'library_600x900.jpg';
                    if (config.artStyle === 'hero') {
                        assetPath = 'library_hero.jpg';
                    } else if (config.artStyle === 'header') {
                        assetPath = 'header.jpg';
                    }
                    coverUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${selectedGame.appid}/${assetPath}`;
                }
                const proxiedUrl = coverUrl ? `/api/proxy-image?url=${encodeURIComponent(coverUrl)}` : '';
                layer.style.backgroundImage = proxiedUrl ? `url('${proxiedUrl}')` : 'none';
            } else if (config.bgType === 'upload' && config.customImage) {
                layer.style.backgroundImage = `url('${config.customImage}')`;
            }
        };

        // Standard
        const container = document.getElementById(`cd-${layout}`);
        if (container) {
            applyBg(container.querySelector('.cd-image-layer'));
        }

        // Mirror to DVD wrap panel if case size is dvd
        if (layout === 'front' || layout === 'back') {
            const dvdPanel = document.querySelector(`.dvd-${layout}-panel`);
            if (dvdPanel) {
                applyBg(dvdPanel.querySelector('.cd-image-layer'));
            }
        }
    }

    // Updates transparent game logo overlay for a specific layout
    function updateLayoutLogo(layout) {
        if (!selectedGame) return;

        const config = layoutConfigs[layout];

        // Update logo size label indicators
        const logoSizeValSpan = document.getElementById(`${layout}-logo-size-val`);
        if (logoSizeValSpan) logoSizeValSpan.textContent = config.logoSize;

        const applyLogo = (logoImg, textHeader, baseMaxHeight) => {
            if (!logoImg || !textHeader) return;
            
            const useLogo = config.useLogo && config.bgType === 'steam';

            if (useLogo) {
                let logoUrl = '';
                if (selectedGame.platform === 'gog') {
                    logoUrl = selectedGame.logo_url || '';
                } else {
                    logoUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${selectedGame.appid}/logo.png`;
                }
                const proxiedLogo = logoUrl ? `/api/proxy-image?url=${encodeURIComponent(logoUrl)}` : '';

                logoImg.style.maxHeight = `${baseMaxHeight * (config.logoSize / 100)}px`;

                logoImg.onload = () => {
                    logoImg.style.display = 'block';
                    textHeader.style.display = 'none';
                };
                logoImg.onerror = () => {
                    logoImg.style.display = 'none';
                    textHeader.style.display = 'block';
                };
                logoImg.src = proxiedLogo;
            } else {
                logoImg.src = '';
                logoImg.style.display = 'none';
                textHeader.style.display = 'block';
            }
        };

        // Standard
        const logoImg = document.getElementById(`preview-${layout}-logo`);
        let textHeader;
        if (layout === 'front') textHeader = previewFrontTitle;
        else if (layout === 'back') textHeader = previewBackTitle;
        else if (layout === 'disc') textHeader = previewDiscTitle;

        let baseMaxHeight = 40;
        if (layout === 'front') baseMaxHeight = 55;
        if (layout === 'disc') baseMaxHeight = 35;

        applyLogo(logoImg, textHeader, baseMaxHeight);

        // Mirror to DVD wrap panel if case size is dvd
        if (layout === 'front' || layout === 'back') {
            const dvdLogo = document.getElementById(`preview-dvd-${layout}-logo`);
            let dvdTextHeader;
            if (layout === 'front') dvdTextHeader = document.getElementById('preview-dvd-front-title');
            else if (layout === 'back') dvdTextHeader = document.getElementById('preview-dvd-back-title');
            
            let dvdBaseHeight = baseMaxHeight * 1.2;
            applyLogo(dvdLogo, dvdTextHeader, dvdBaseHeight);
        }

        // Mirror front logo configuration to DVD spine logo
        if (layout === 'front' && previewDvdSpineLogo && previewDvdSpine) {
            applyLogo(previewDvdSpineLogo, previewDvdSpine, 45);
        }
    }

    // Apply styling parameters for a specific layout
    function applyLayoutStyles(layout) {
        const config = layoutConfigs[layout];

        const applyStyles = (container) => {
            if (!container) return;

            // Apply bg color override
            container.style.backgroundColor = config.bgColor;

            // Apply text color override
            container.style.color = config.textColor;

            // Apply global fonts and alignments
            const fontVal = fontSelect.value;
            container.style.fontFamily = fontVal;

            // Text align (Front and Disc are aligned globally, Back has custom details)
            if (layout === 'front' || layout === 'disc') {
                const alignVal = alignSelect.value;
                const textContent = container.querySelector('.cd-text-content, .cd-disc-content');
                if (textContent) {
                    textContent.style.textAlign = alignVal;
                    textContent.style.alignItems = alignVal === 'center' ? 'center' : (alignVal === 'right' ? 'flex-end' : 'flex-start');
                }

                if (layout === 'front') {
                    const badge = container.querySelector('.cd-front-badge');
                    if (badge) {
                        badge.style.alignSelf = alignVal === 'center' ? 'center' : (alignVal === 'right' ? 'flex-end' : 'flex-start');
                    }
                }
            }

            // Apply overlay opacity darkening
            const overlay = container.querySelector('.cd-overlay-layer');
            if (overlay) {
                overlay.style.backgroundColor = `rgba(10, 10, 12, ${config.opacity / 100})`;
            }
        };

        // Standard
        const container = document.getElementById(`cd-${layout}`);
        if (container) {
            applyStyles(container);
        }

        // Mirror to DVD wrap panel if case size is dvd
        if (layout === 'front' || layout === 'back') {
            const dvdPanel = document.querySelector(`.dvd-${layout}-panel`);
            if (dvdPanel) {
                applyStyles(dvdPanel);
            }
        }
    }

    // Event Bindings
    inputTitle.addEventListener('input', updateLayoutContent);
    inputSpine.addEventListener('input', updateLayoutContent);

    caseSizeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        
        // Remove existing case classes
        editorWorkspace.classList.remove('case-dvd');
        
        const containerFront = document.getElementById('container-front');
        const containerBack = document.getElementById('container-back');
        const containerDvd = document.getElementById('container-dvd');
        
        const tabBtnFront = document.getElementById('tab-btn-front');
        const tabBtnBack = document.getElementById('tab-btn-back');
        const tabBtnDvd = document.getElementById('tab-btn-dvd');
        
        if (val === 'dvd') {
            editorWorkspace.classList.add('case-dvd');
            containerFront.style.display = 'none';
            containerBack.style.display = 'none';
            containerDvd.style.display = 'block';
            
            tabBtnFront.style.display = 'none';
            tabBtnBack.style.display = 'none';
            tabBtnDvd.style.display = 'inline-block';
            
            // Revert Front/Back tabs to All if active
            const activeBtn = document.querySelector('.tab-btn.active');
            if (activeBtn && (activeBtn.dataset.target === 'workspace-front' || activeBtn.dataset.target === 'workspace-back')) {
                document.querySelector('.tab-btn[data-target="workspace-all"]').click();
            }
        } else {
            containerFront.style.display = 'block';
            containerBack.style.display = 'block';
            containerDvd.style.display = 'none';
            
            tabBtnFront.style.display = 'inline-block';
            tabBtnBack.style.display = 'inline-block';
            tabBtnDvd.style.display = 'none';
            
            // Revert DVD tab to All if active
            const activeBtn = document.querySelector('.tab-btn.active');
            if (activeBtn && activeBtn.dataset.target === 'workspace-dvd') {
                document.querySelector('.tab-btn[data-target="workspace-all"]').click();
            }
        }
        
        refreshAllLayouts();
        updateLayoutContent();
    });

    // Global typography selections
    fontSelect.addEventListener('change', () => {
        ['front', 'back', 'disc'].forEach(layout => applyLayoutStyles(layout));
    });
    alignSelect.addEventListener('change', () => {
        ['front', 'back', 'disc'].forEach(layout => applyLayoutStyles(layout));
    });

    // Color pickers per layout
    document.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('input', (e) => {
            const layout = e.target.dataset.layout;
            const styleName = e.target.dataset.style;
            layoutConfigs[layout][styleName] = e.target.value;
            applyLayoutStyles(layout);
        });
    });

    // Background source selectors
    document.querySelectorAll('.btn-bg-source').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layout = e.target.dataset.layout;
            const bgType = e.target.dataset.bg;

            layoutConfigs[layout].bgType = bgType;

            const parent = e.target.parentElement;
            parent.querySelectorAll('.btn-bg-source').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            updateLayoutBackground(layout);
            applyLayoutStyles(layout);
        });
    });

    // Custom image uploads
    document.querySelectorAll('.upload-bg-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const layout = e.target.dataset.layout;
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                layoutConfigs[layout].customImage = event.target.result;
                layoutConfigs[layout].bgType = 'upload';
                
                const group = e.target.closest('.bg-options-group');
                group.querySelectorAll('.btn-bg-source').forEach(b => b.classList.remove('active'));
                
                updateLayoutBackground(layout);
                applyLayoutStyles(layout);
            };
            reader.readAsDataURL(file);
        });
    });

    // Steam background style selectors
    document.querySelectorAll('.steam-art-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const layout = e.target.dataset.layout;
            layoutConfigs[layout].artStyle = e.target.value;
            updateLayoutBackground(layout);
        });
    });

    // Transparent logo check-boxes
    document.querySelectorAll('.logo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const layout = e.target.dataset.layout;
            layoutConfigs[layout].useLogo = e.target.checked;
            updateLayoutLogo(layout);
        });
    });

    // Darken opacity sliders
    document.querySelectorAll('.opacity-range').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const layout = e.target.dataset.layout;
            layoutConfigs[layout].opacity = e.target.value;
            applyLayoutStyles(layout);
        });
    });

    // Background zoom sliders
    document.querySelectorAll('.bg-zoom-range').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const layout = e.target.dataset.layout;
            layoutConfigs[layout].bgZoom = e.target.value;
            updateLayoutBackground(layout);
        });
    });

    // Logo size sliders
    document.querySelectorAll('.logo-size-range').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const layout = e.target.dataset.layout;
            layoutConfigs[layout].logoSize = e.target.value;
            updateLayoutLogo(layout);
        });
    });

    // System requirements controls
    backShowRequirements.addEventListener('change', (e) => {
        layoutConfigs.back.showRequirements = e.target.checked;
        backRequirementsTextareaGroup.style.display = e.target.checked ? "block" : "none";
        updateLayoutContent();
    });

    backRequirementsTextarea.addEventListener('input', (e) => {
        layoutConfigs.back.requirements = e.target.value;
        updateLayoutContent();
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.getAttribute('data-target');
            
            editorWorkspace.classList.remove('workspace-all', 'workspace-front', 'workspace-back', 'workspace-disc', 'workspace-dvd');
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

        const launcherVal = document.querySelector('input[name="launcher-type"]:checked').value;

        fetch('/api/create-iso', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appid: appidText,
                title: titleText,
                launcher: launcherVal
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

    // DOM elements for drive setup
    const driveTypeSelect = document.getElementById('drive-type-select');
    const driveSelect = document.getElementById('drive-select');
    const btnRefreshDrives = document.getElementById('btn-refresh-drives');
    const driveActionsGroup = document.getElementById('drive-actions-group');
    const btnPrepareDrive = document.getElementById('btn-prepare-drive');
    const driveStatus = document.getElementById('drive-status');
    const driveStatusText = document.getElementById('drive-status-text');

    if (btnRefreshDrives) {
        btnRefreshDrives.addEventListener('click', refreshDrivesList);
    }
    if (driveTypeSelect) {
        driveTypeSelect.addEventListener('change', populateDrivesDropdown);
    }
    if (driveSelect) {
        driveSelect.addEventListener('change', () => {
            const val = driveSelect.value;
            if (val && driveActionsGroup) {
                driveActionsGroup.style.display = 'block';
            } else if (driveActionsGroup) {
                driveActionsGroup.style.display = 'none';
            }
        });
    }

    function refreshDrivesList() {
        if (!btnRefreshDrives) return;
        btnRefreshDrives.disabled = true;
        btnRefreshDrives.textContent = '⏳';
        
        driveSelect.innerHTML = '<option value="">-- Scanning drives... --</option>';
        if (driveActionsGroup) driveActionsGroup.style.display = 'none';

        fetch('/api/list-drives')
            .then(res => res.json())
            .then(drives => {
                cachedDrives = drives || [];
                populateDrivesDropdown();
            })
            .catch(err => {
                console.error("Failed to list drives:", err);
                driveSelect.innerHTML = '<option value="">Error scanning drives</option>';
            })
            .finally(() => {
                btnRefreshDrives.disabled = false;
                btnRefreshDrives.textContent = '🔄';
            });
    }

    function populateDrivesDropdown() {
        if (!driveSelect) return;
        
        const typeFilter = driveTypeSelect ? driveTypeSelect.value : '2';
        
        // Clear previous options
        driveSelect.innerHTML = '';
        
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '-- Select a drive --';
        driveSelect.appendChild(defaultOpt);
        
        let filtered = cachedDrives;
        if (typeFilter !== 'all') {
            const filterCode = parseInt(typeFilter, 10);
            filtered = cachedDrives.filter(d => d.type_code === filterCode);
        }
        
        if (filtered.length === 0) {
            const noDrivesOpt = document.createElement('option');
            noDrivesOpt.value = '';
            noDrivesOpt.textContent = 'No matching drives found';
            driveSelect.appendChild(noDrivesOpt);
            if (driveActionsGroup) driveActionsGroup.style.display = 'none';
            return;
        }
        
        filtered.forEach(drive => {
            const opt = document.createElement('option');
            opt.value = drive.id;
            
            let label = `${drive.id} - ${drive.name} (${drive.type})`;
            if (drive.size) {
                let sizeGB = 0;
                if (typeof drive.size === 'number') {
                    sizeGB = (drive.size / (1024 * 1024 * 1024)).toFixed(1);
                    label += ` [${sizeGB} GB]`;
                } else {
                    label += ` [${drive.size}]`;
                }
            }
            if (drive.is_system) {
                label += ' (System Drive - BLOCKED)';
                opt.disabled = true;
            }
            
            opt.textContent = label;
            driveSelect.appendChild(opt);
        });

        // Trigger change event to toggle action controls visibility
        driveSelect.dispatchEvent(new Event('change'));
    }

    if (btnPrepareDrive) {
        btnPrepareDrive.addEventListener('click', () => {
            if (!selectedGame) {
                alert("Please select a game first.");
                return;
            }
            const driveId = driveSelect.value;
            if (!driveId) {
                alert("Please select a target drive.");
                return;
            }
            
            // Safety double check
            const selectedDriveObj = cachedDrives.find(d => d.id === driveId);
            if (selectedDriveObj && selectedDriveObj.is_system) {
                alert("Safety Block: You cannot format or modify the operating system drive.");
                return;
            }
            
            const methodInput = document.querySelector('input[name="prep-method"]:checked');
            const method = methodInput ? methodInput.value : 'clean';
            
            let confirmMsg = "";
            if (method === 'format') {
                confirmMsg = `⚠️ DANGER: This will completely FORMAT drive ${driveId} (${selectedDriveObj ? selectedDriveObj.name : ''}).\nAll existing data will be lost!\n\nAre you absolutely sure you want to format and write the launch manifest?`;
            } else if (method === 'clean') {
                confirmMsg = `⚠️ WARNING: This will delete files on drive ${driveId} (${selectedDriveObj ? selectedDriveObj.name : ''}) to prepare it.\n\nAre you sure you want to clean this drive and write the launch manifest?`;
            } else {
                confirmMsg = `Write LastDisc launch manifest to drive ${driveId}?\n(Existing files will be preserved).`;
            }
            
            if (!confirm(confirmMsg)) {
                return;
            }
            
            if (method === 'format' && !confirm("DOUBLE CONFIRMATION:\nAre you 100% sure? This action is irreversible.")) {
                return;
            }
            
            const titleText = inputTitle.value.trim() || selectedGame.name;
            const appidText = inputAppid.value.trim() || selectedGame.appid;
            
            if (driveStatus) {
                driveStatus.style.display = 'flex';
                driveStatusText.textContent = `Preparing drive ${driveId}...`;
            }
            btnPrepareDrive.disabled = true;
            
            const launcherVal = document.querySelector('input[name="launcher-type"]:checked').value;

            fetch('/api/prepare-drive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    drive_id: driveId,
                    method: method,
                    appid: appidText,
                    title: titleText,
                    launcher: launcherVal
                })
            })
            .then(res => {
                if (!res.ok) {
                    return res.text().then(text => { throw new Error(text || 'Failed to prepare drive') });
                }
                return res.json();
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                driveStatusText.textContent = `⚡ Success! Drive ${driveId} is prepared for ${titleText}.`;
                alert(`SUCCESS:\nDrive ${driveId} has been successfully prepared for "${titleText}".\n\nYou can now insert it to launch this game!`);
                setTimeout(() => {
                    if (driveStatus) driveStatus.style.display = 'none';
                }, 5000);
            })
            .catch(err => {
                console.error("Error setting up drive:", err);
                driveStatusText.textContent = `❌ Error preparing drive.`;
                alert(`Error: ${err.message}\n\nNote: Full formatting may require running this tool as Administrator/Root.`);
                setTimeout(() => {
                    if (driveStatus) driveStatus.style.display = 'none';
                }, 6000);
            })
            .finally(() => {
                btnPrepareDrive.disabled = false;
            });
        });
    }

    // Launcher Type Change Event Listener (Steam vs GOG)
    const labelAppid = document.getElementById('label-appid');
    const launcherRadios = document.querySelectorAll('input[name="launcher-type"]');
    
    launcherRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'gog') {
                if (labelAppid) labelAppid.textContent = 'GOG Game ID';
                if (inputAppid) {
                    inputAppid.removeAttribute('readonly');
                    inputAppid.placeholder = 'Enter GOG Game ID manually';
                }
            } else {
                if (labelAppid) labelAppid.textContent = 'Steam AppID';
                if (inputAppid) {
                    inputAppid.setAttribute('readonly', 'true');
                    inputAppid.placeholder = '';
                }
            }
            updateLayoutContent();
            refreshAllLayouts();
        });
    });

    // Watcher Logs Polling Logic
    const logConsole = document.getElementById('log-console');
    function fetchLogs() {
        if (!logConsole) return;
        fetch('/api/logs')
            .then(res => res.json())
            .then(data => {
                if (data.logs && data.logs.length > 0) {
                    logConsole.innerHTML = '';
                    data.logs.forEach(line => {
                        const div = document.createElement('div');
                        div.style.marginBottom = '2px';
                        
                        // Apply nice coloring to launcher launches or errors
                        if (line.includes('Launching GOG')) {
                            div.style.color = '#FF0055';
                        } else if (line.includes('Launching Steam')) {
                            div.style.color = '#00DFD8';
                        } else if (line.includes('started')) {
                            div.style.color = '#10B981';
                        }
                        
                        div.textContent = line.trim();
                        logConsole.appendChild(div);
                    });
                    // Auto scroll to bottom
                    logConsole.scrollTop = logConsole.scrollHeight;
                }
            })
            .catch(err => {
                console.error("Failed to fetch logs:", err);
            });
    }

    // Poll logs immediately and then every 3 seconds
    fetchLogs();
    setInterval(fetchLogs, 3000);
});
