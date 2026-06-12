class MatchDisplayManager {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://alacapipollamundialista.alacoohperu.pe/api/public';
        this.fixtureId = options.fixtureId || 9;
        
        // DOM Elements for Horizontal
        this.hor = {
            scoreboard: document.getElementById('scoreboard-hor'),
            homeLogo: document.getElementById('home-logo-hor'),
            homeName: document.getElementById('home-name-hor'),
            homeScore: document.getElementById('home-score-hor'),
            awayLogo: document.getElementById('away-logo-hor'),
            awayName: document.getElementById('away-name-hor'),
            awayScore: document.getElementById('away-score-hor')
        };
        
        // DOM Elements for Vertical
        this.ver = {
            scoreboard: document.getElementById('scoreboard-ver'),
            homeLogo: document.getElementById('home-logo-ver'),
            homeName: document.getElementById('home-name-ver'),
            homeScore: document.getElementById('home-score-ver'),
            awayLogo: document.getElementById('away-logo-ver'),
            awayName: document.getElementById('away-name-ver'),
            awayScore: document.getElementById('away-score-ver')
        };

        this.currentHomeScore = 0;
        this.currentAwayScore = 0;
        this.pageLoadTime = Date.now();
        this.pollInterval = options.pollInterval || 10000; // 10 seconds default
    }

    getShortName(name, isoCode) {
        // You can customize this if you want to use ISO codes instead of full names
        // return isoCode || name;
        return name;
    }

    async fetchInitialData() {
        try {
            const response = await fetch(`${this.apiUrl}/partidos?id=${this.fixtureId}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            if (data && data.partidos && data.partidos.length > 0) {
                const partido = data.partidos[0];
                let local = partido.local;
                let visitante = partido.visitante;
                const marcador = partido.marcador;

                let nuevoHome = parseInt(marcador.local) || 0;
                let nuevoAway = parseInt(marcador.visitante) || 0;

                // Siempre mostrar a Ecuador primero (como local)
                if (visitante && (visitante.codigo_iso === 'ECU' || visitante.nombre.toUpperCase().includes('ECUADOR'))) {
                    const tempTeam = local;
                    local = visitante;
                    visitante = tempTeam;

                    const tempScore = nuevoHome;
                    nuevoHome = nuevoAway;
                    nuevoAway = tempScore;
                }

                const savedHomeStr = localStorage.getItem(`alac_home_${this.fixtureId}`);
                const savedAwayStr = localStorage.getItem(`alac_away_${this.fixtureId}`);
                const savedHome = savedHomeStr !== null ? parseInt(savedHomeStr) : null;
                const savedAway = savedAwayStr !== null ? parseInt(savedAwayStr) : null;

                let isHiddenGoal = false;

                if (savedHome !== null && savedAway !== null && (nuevoHome > savedHome || nuevoAway > savedAway)) {
                    isHiddenGoal = true;
                    this.currentHomeScore = savedHome;
                    this.currentAwayScore = savedAway;
                } else {
                    this.currentHomeScore = nuevoHome;
                    this.currentAwayScore = nuevoAway;
                }

                // Make scoreboards visible
                if (this.hor.scoreboard) this.hor.scoreboard.style.display = 'flex';
                if (this.ver.scoreboard) this.ver.scoreboard.style.display = 'flex';
                
                const homeLogoUrl = local.bandera_url || local.bandera || local.logo;
                const homeName = local.codigo_iso;
                
                const awayLogoUrl = visitante.bandera_url || visitante.bandera || visitante.logo;
                const awayName = visitante.codigo_iso;

                // Update Horizontal
                if (homeLogoUrl && this.hor.homeLogo) this.hor.homeLogo.src = homeLogoUrl;
                if (this.hor.homeName) this.hor.homeName.innerText = homeName;
                if (this.hor.homeScore) this.hor.homeScore.innerText = this.currentHomeScore;
                
                if (awayLogoUrl && this.hor.awayLogo) this.hor.awayLogo.src = awayLogoUrl;
                if (this.hor.awayName) this.hor.awayName.innerText = awayName;
                if (this.hor.awayScore) this.hor.awayScore.innerText = this.currentAwayScore;

                // Update Vertical
                if (homeLogoUrl && this.ver.homeLogo) this.ver.homeLogo.src = homeLogoUrl;
                if (this.ver.homeName) this.ver.homeName.innerText = homeName;
                if (this.ver.homeScore) this.ver.homeScore.innerText = this.currentHomeScore;
                
                if (awayLogoUrl && this.ver.awayLogo) this.ver.awayLogo.src = awayLogoUrl;
                if (this.ver.awayName) this.ver.awayName.innerText = awayName;
                if (this.ver.awayScore) this.ver.awayScore.innerText = this.currentAwayScore;

                localStorage.setItem(`alac_home_${this.fixtureId}`, nuevoHome);
                localStorage.setItem(`alac_away_${this.fixtureId}`, nuevoAway);

                if (isHiddenGoal) {
                    const elapsed = Date.now() - this.pageLoadTime;
                    const isEcuador = this.checkEcuadorGoal(nuevoHome, savedHome, nuevoAway, savedAway, partido);
                    this.triggerGoalAnimation(nuevoHome, nuevoAway, elapsed, isEcuador);
                }
                
                this.startPolling();

                // --- PANTALLA NEGRA DE CARGA ---
                let homeImgLoaded = !homeLogoUrl;
                let awayImgLoaded = !awayLogoUrl;

                const finishDataLoad = () => {
                    if (homeImgLoaded && awayImgLoaded) {
                        window.appDataLoaded = true;
                        if (typeof window.checkAllLoaded === 'function') {
                            window.checkAllLoaded();
                        }
                    }
                };

                const checkImgLoad = (imgElement, setLoadedFlag) => {
                    if (!imgElement) {
                        setLoadedFlag();
                        return;
                    }
                    if (imgElement.complete) {
                        setLoadedFlag();
                    } else {
                        imgElement.onload = () => { setLoadedFlag(); finishDataLoad(); };
                        imgElement.onerror = () => { setLoadedFlag(); finishDataLoad(); };
                    }
                };

                if (homeLogoUrl) {
                    // Check horizontal image (vertical is usually the same URL so it will be cached/fast)
                    checkImgLoad(this.hor.homeLogo, () => { homeImgLoaded = true; });
                }
                if (awayLogoUrl) {
                    checkImgLoad(this.hor.awayLogo, () => { awayImgLoaded = true; });
                }
                finishDataLoad();

            } else {
                console.error("No se encontró el partido con fixture_id:", this.fixtureId);
                window.appDataLoaded = true;
                if (typeof window.checkAllLoaded === 'function') window.checkAllLoaded();
            }
        } catch (error) {
            console.error(`Error al consultar el partido inicial ${this.fixtureId}:`, error);
            window.appDataLoaded = true;
            if (typeof window.checkAllLoaded === 'function') window.checkAllLoaded();
        }
    }

    checkEcuadorGoal(nuevoHome, savedHome, nuevoAway, savedAway, partido) {
        // Example implementation, logic for Ecuador goals if needed
        return false; 
    }

    triggerGoalAnimation(nuevoHome, nuevoAway, elapsed, isEcuador) {
        // If a goal animation is triggered, update the scores after the animation
        console.log("¡GOL! Actualizando marcadores animadamente...");
        
        // Simulating the end of an animation by updating scores directly for now
        setTimeout(() => {
            this.updateScores(nuevoHome, nuevoAway);
        }, 3000);
    }

    updateScores(homeScore, awayScore) {
        this.currentHomeScore = homeScore;
        this.currentAwayScore = awayScore;

        if (this.hor.homeScore) this.hor.homeScore.innerText = this.currentHomeScore;
        if (this.hor.awayScore) this.hor.awayScore.innerText = this.currentAwayScore;

        if (this.ver.homeScore) this.ver.homeScore.innerText = this.currentHomeScore;
        if (this.ver.awayScore) this.ver.awayScore.innerText = this.currentAwayScore;
    }

    startPolling() {
        if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = setInterval(() => {
            this.fetchUpdateData();
        }, this.pollInterval);
    }

    async fetchUpdateData() {
        try {
            const response = await fetch(`${this.apiUrl}/partidos?id=${this.fixtureId}`, { cache: "no-store" });
            if (!response.ok) return;
            const data = await response.json();
            
            if (data && data.partidos && data.partidos.length > 0) {
                const partido = data.partidos[0];
                const marcador = partido.marcador;
                
                let nuevoHome = parseInt(marcador.local) || 0;
                let nuevoAway = parseInt(marcador.visitante) || 0;

                // Siempre mostrar a Ecuador primero (como local)
                const visitante = partido.visitante;
                if (visitante && (visitante.codigo_iso === 'ECU' || visitante.nombre.toUpperCase().includes('ECUADOR'))) {
                    const tempScore = nuevoHome;
                    nuevoHome = nuevoAway;
                    nuevoAway = tempScore;
                }

                if (nuevoHome > this.currentHomeScore || nuevoAway > this.currentAwayScore) {
                    const elapsed = Date.now() - this.pageLoadTime;
                    const isEcuador = this.checkEcuadorGoal(nuevoHome, this.currentHomeScore, nuevoAway, this.currentAwayScore, partido);
                    
                    localStorage.setItem(`alac_home_${this.fixtureId}`, nuevoHome);
                    localStorage.setItem(`alac_away_${this.fixtureId}`, nuevoAway);
                    
                    this.triggerGoalAnimation(nuevoHome, nuevoAway, elapsed, isEcuador);
                }
            }
        } catch (error) {
            console.error("Error en polling:", error);
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Obtener el ID de la URL si existe (ej. /?id=17)
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');

    const displayManager = new MatchDisplayManager({
        fixtureId: idFromUrl ? parseInt(idFromUrl) : 9 // Usa el ID de la URL, o 9 por defecto
    });
    
    displayManager.fetchInitialData();
});
