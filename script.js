document.addEventListener('DOMContentLoaded', function() {
    // Elementos da DOM
    const elements = {
        addBtn: document.getElementById('add-btn'),
        playBtn: document.getElementById('play-btn'),
        nextBtn: document.getElementById('next-btn'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        youtubeUrlInput: document.getElementById('youtube-url'),
        playlistElement: document.getElementById('playlist'),
        playerElement: document.getElementById('player'),
        nowPlayingElement: document.getElementById('now-playing'),
        playlistStats: document.getElementById('playlist-stats')
    };

    // Estado da aplicação
    const state = {
        playlist: [],
        currentSongIndex: -1,
        isShuffleActive: false,
        originalPlaylistOrder: []
    };

    // Inicialização
    setupEventListeners();

    function setupEventListeners() {
        // Adicionar música
        elements.addBtn.addEventListener('click', addSongToPlaylist);
        elements.youtubeUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addSongToPlaylist();
        });

        // Controles do player
        elements.playBtn.addEventListener('click', playCurrentSong);
        elements.nextBtn.addEventListener('click', playNextSong);
        elements.shuffleBtn.addEventListener('click', toggleShuffle);
    }

    async function addSongToPlaylist() {
        const youtubeUrl = elements.youtubeUrlInput.value.trim();
        
        if (!youtubeUrl) {
            showNotification('Por favor, cole o link do YouTube', 'error');
            return;
        }

        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            showNotification('Link do YouTube inválido', 'error');
            return;
        }

        // Verificar se música já existe
        if (state.playlist.some(song => song.videoId === videoId)) {
            showNotification('Esta música já está na playlist', 'warning');
            return;
        }

        // Mostrar carregamento
        elements.addBtn.disabled = true;
        elements.addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';

        try {
            // Tentar obter o título do vídeo
            const title = await getYouTubeVideoTitle(videoId);
            
            // Adicionar música à playlist
            const newSong = {
                id: Date.now().toString(),
                name: title,
                youtubeUrl: youtubeUrl,
                videoId: videoId,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };

            state.playlist.push(newSong);
            
            // Se for a primeira música, definir como ativa
            if (state.playlist.length === 1) {
                state.currentSongIndex = 0;
            }
            
            renderPlaylist();
            showNotification(`"${title}" adicionada à playlist!`, 'success');
        } catch (error) {
            console.error('Erro ao adicionar música:', error);
            showNotification('Erro ao adicionar música. Tente outro link.', 'error');
        } finally {
            elements.addBtn.disabled = false;
            elements.addBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar';
            elements.youtubeUrlInput.value = '';
        }
    }

    function extractVideoId(url) {
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    async function getYouTubeVideoTitle(videoId) {
        try {
            // Método 1: Usar API noembed (sem necessidade de key)
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await response.json();
            
            if (data.title) {
                return data.title;
            }
            throw new Error('Título não disponível');
        } catch (error) {
            console.error('Falha ao obter título:', error);
            // Fallback: retorna um nome genérico
            return `Música ${state.playlist.length + 1}`;
        }
    }

    function playCurrentSong() {
        if (state.playlist.length === 0) {
            showNotification('A playlist está vazia', 'warning');
            return;
        }

        if (state.currentSongIndex === -1) {
            state.currentSongIndex = 0;
        }

        const song = state.playlist[state.currentSongIndex];
        playSong(song);
    }

    function playNextSong() {
        if (state.playlist.length === 0) return;
        
        let nextIndex;
        
        if (state.isShuffleActive) {
            // Modo aleatório
            const possibleIndices = state.playlist
                .map((_, index) => index)
                .filter(i => i !== state.currentSongIndex);
            
            nextIndex = possibleIndices.length > 0 
                ? possibleIndices[Math.floor(Math.random() * possibleIndices.length)]
                : state.currentSongIndex;
        } else {
            // Modo normal
            nextIndex = (state.currentSongIndex + 1) % state.playlist.length;
        }
        
        state.currentSongIndex = nextIndex;
        const song = state.playlist[state.currentSongIndex];
        playSong(song);
    }

    function toggleShuffle() {
        state.isShuffleActive = !state.isShuffleActive;
        
        if (state.isShuffleActive) {
            // Salvar ordem original
            state.originalPlaylistOrder = [...state.playlist];
            elements.shuffleBtn.classList.add('shuffle-active');
            showNotification('Modo aleatório ativado', 'success');
        } else {
            // Restaurar ordem original
            if (state.originalPlaylistOrder.length > 0) {
                // Encontrar posição atual na ordem original
                if (state.currentSongIndex !== -1) {
                    const currentId = state.playlist[state.currentSongIndex].id;
                    state.currentSongIndex = state.originalPlaylistOrder.findIndex(song => song.id === currentId);
                }
                state.playlist = [...state.originalPlaylistOrder];
            }
            elements.shuffleBtn.classList.remove('shuffle-active');
            showNotification('Modo aleatório desativado', 'success');
        }
        
        renderPlaylist();
    }

    function playSong(song) {
        // Atualizar player
        elements.playerElement.innerHTML = `
            <iframe 
                width="100%" 
                height="315" 
                src="https://www.youtube.com/embed/${song.videoId}?autoplay=1&enablejsapi=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
        
        // Atualizar "tocando agora"
        elements.nowPlayingElement.innerHTML = `
            <i class="fas fa-headphones"></i>
            <span>Tocando agora: ${song.name}</span>
        `;
        
        // Destacar música atual
        highlightCurrentSong();
    }

    function renderPlaylist() {
        elements.playlistElement.innerHTML = '';
        
        if (state.playlist.length === 0) {
            const li = document.createElement('li');
            li.className = 'playlist-empty';
            li.textContent = 'Nenhuma música na playlist';
            elements.playlistElement.appendChild(li);
            elements.playlistStats.textContent = '0 músicas na playlist';
            return;
        }
        
        state.playlist.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = `playlist-item ${index === state.currentSongIndex ? 'active' : ''}`;
            
            li.innerHTML = `
                <div class="song-info">
                    <span class="song-number">${index + 1}</span>
                    <span class="song-title">${song.name}</span>
                </div>
                <div class="song-actions">
                    <button class="play-item-btn btn-secondary" data-index="${index}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="delete-item-btn btn-error" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            elements.playlistElement.appendChild(li);
        });

        // Atualizar estatísticas
        elements.playlistStats.textContent = `
            ${state.playlist.length} ${state.playlist.length === 1 ? 'música' : 'músicas'} na playlist
        `;

        // Adicionar eventos
        document.querySelectorAll('.play-item-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                state.currentSongIndex = parseInt(this.dataset.index);
                playSong(state.playlist[state.currentSongIndex]);
            });
        });

        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteSong(parseInt(this.dataset.index));
            });
        });
    }

    function deleteSong(index) {
        if (index < 0 || index >= state.playlist.length) return;
        
        const songName = state.playlist[index].name;
        state.playlist.splice(index, 1);
        
        // Ajustar índice atual
        if (state.currentSongIndex === index) {
            state.currentSongIndex = -1;
            resetPlayer();
        } else if (state.currentSongIndex > index) {
            state.currentSongIndex--;
        }
        
        // Se playlist ficar vazia, desativar shuffle
        if (state.playlist.length === 0) {
            state.isShuffleActive = false;
            elements.shuffleBtn.classList.remove('shuffle-active');
        }
        
        renderPlaylist();
        showNotification(`"${songName}" removida da playlist`, 'success');
    }

    function resetPlayer() {
        elements.playerElement.innerHTML = `
            <div class="player-placeholder">
                <i class="fas fa-music"></i>
                <p>Nenhuma música selecionada</p>
            </div>
        `;
        elements.nowPlayingElement.innerHTML = `
            <i class="fas fa-headphones"></i>
            <span>Nenhuma música em reprodução</span>
        `;
    }

    function highlightCurrentSong() {
        document.querySelectorAll('.playlist-item').forEach((item, index) => {
            item.classList.toggle('active', index === state.currentSongIndex);
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});