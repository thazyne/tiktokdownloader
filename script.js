window.onload = function () {
    const popup = document.getElementById("popup");
    popup.style.display = "flex";
    setTimeout(() => {
        popup.classList.add("active");
    }, 100);
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.classList.add("blurred");
};

function closePopup() {
    const popup = document.getElementById("popup");
    popup.classList.remove("active");
    setTimeout(() => {
        popup.style.display = "none";
    }, 300);
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.classList.remove("blurred");
}

document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab');
    const youtubeContent = document.getElementById('youtube-content');
    const tiktokContent = document.getElementById('tiktok-content');
    const youtubeUrl = document.getElementById('youtube-url');
    const tiktokUrl = document.getElementById('tiktok-url');
    const formatBtns = document.querySelectorAll('.format-option');
    const videoQuality = document.getElementById('video-quality');
    const audioQuality = document.getElementById('audio-quality');
    const downloadBtn = document.getElementById('download-btn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');

    let currentPlatform = 'youtube';
    let currentFormat = 'mp4';

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentPlatform = this.dataset.tab;
            youtubeContent.classList.toggle('hidden', currentPlatform !== 'youtube');
            tiktokContent.classList.toggle('hidden', currentPlatform !== 'tiktok');
            result.style.display = 'none';
        });
    });

    formatBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            formatBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            currentFormat = this.dataset.format;
            if (currentPlatform === 'youtube') {
                videoQuality.classList.toggle('hidden', currentFormat !== 'mp4');
                audioQuality.classList.toggle('hidden', currentFormat !== 'mp3');
            }
        });
    });

    downloadBtn.addEventListener('click', async function () {
        const url = currentPlatform === 'youtube'
            ? youtubeUrl.value.trim()
            : tiktokUrl.value.trim();

        if (!url) {
            showResult('Woi, linknya mana? Masukin dulu dong!', 'error');
            return;
        }

        if (currentPlatform === 'youtube' && !isValidYouTubeUrl(url)) {
            showResult('Link YouTube-nya kayanya salah tuh, cek lagi!', 'error');
            return;
        }

        if (currentPlatform === 'tiktok' && !isValidTikTokUrl(url)) {
            showResult('Link TikTok-nya gak valid nih, coba yang bener dong!', 'error');
            return;
        }

        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROSES...';
        loading.style.display = 'block';
        result.style.display = 'none';

        try {
            const encodedUrl = encodeURIComponent(url);
            let apiUrl;

            if (currentPlatform === 'youtube') {
                if (currentFormat === 'mp4') {
                    apiUrl = `https://api.ryzumi.vip/api/downloader/ytmp4?url=${encodedUrl}&quality=${videoQuality.value}`;
                } else {
                    apiUrl = `https://api.ryzumi.vip/api/downloader/ytmp3?url=${encodedUrl}&bitrate=${audioQuality.value}`;
                }
            } else {
                apiUrl = `https://api.ryzumi.net/api/downloader/ttdl?url=${encodedUrl}`;
                if (currentFormat === 'mp3') {
                    apiUrl += '&audio=1';
                }
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: Gagal connect ke server`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            let downloadUrl, thumbnailUrl, title, statsHTML = '';

            if (currentPlatform === 'tiktok') {
                const tiktokData = data?.data?.data;
                if (!tiktokData) throw new Error('Strukturnya aneh nih, coba lagi ya!');

                if (currentFormat === 'mp4') {
                    downloadUrl = getCompatibleTikTokVideoUrl(tiktokData);
                    if (!downloadUrl) throw new Error('Gak ketemu link videonya nih!');
                } else {
                    downloadUrl = tiktokData.music_info?.play;
                    if (!downloadUrl) throw new Error('Gak ketemu link audionya!');
                }

                thumbnailUrl = tiktokData.cover;
                title = tiktokData.title || 'Video TikTok';

                if (tiktokData.play_count || tiktokData.digg_count) {
                    statsHTML = `<div class="stats">
                        ${tiktokData.play_count ? `<span><i class="fas fa-eye"></i> ${formatNumber(tiktokData.play_count)}</span>` : ''}
                        ${tiktokData.digg_count ? `<span><i class="fas fa-heart"></i> ${formatNumber(tiktokData.digg_count)}</span>` : ''}
                        ${tiktokData.comment_count ? `<span><i class="fas fa-comment"></i> ${formatNumber(tiktokData.comment_count)}</span>` : ''}
                    </div>`;
                }
            } else {
                downloadUrl = findDownloadUrl(data);
                if (!downloadUrl) throw new Error('Link downloadnya ilang, coba lagi ya!');

                const videoId = extractVideoId(url);
                if (videoId) {
                    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                }
                title = 'Video YouTube';
            }

            showResult(downloadUrl, thumbnailUrl, title, statsHTML);
            triggerAutoDownload(downloadUrl, title);
        } catch (error) {
            console.error('Download error:', error);
            showError(error.message);
        } finally {
            loading.style.display = 'none';
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD SEKARANG';
        }
    });

    async function triggerAutoDownload(downloadUrl, title) {
        const safeTitle = sanitizeFilename(title);

        try {
            // Fetch file as blob agar browser langsung save (bukan open di tab baru)
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${safeTitle}.${currentFormat}`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Bebaskan memori setelah download
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) {
            console.warn('Auto-download gagal, fallback ke direct link:', err);
            // Fallback: buka link langsung jika fetch blob gagal (misal CORS)
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${safeTitle}.${currentFormat}`;
            a.target = '_blank';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    function showResult(downloadUrl, thumbnailUrl, title, statsHTML = '') {
        const safeTitle = sanitizeFilename(title);
        const resultHTML = `
            <div class="media-card">
                ${thumbnailUrl ? `<img src="${thumbnailUrl}" class="thumbnail" alt="Thumbnail">` : ''}
                <div class="media-info">
                    <h3>${title}</h3>
                    <p>
                        <i class="fas ${currentFormat === 'mp4' ? 'fa-video' : 'fa-music'}"></i>
                        ${currentFormat.toUpperCase()} - ${currentPlatform === 'youtube' ? 'YouTube' : 'TikTok'}
                    </p>
                    ${statsHTML}
                    <p class="download-status">
                        <i class="fas fa-check-circle" style="color:#4ade80;"></i>
                        Download dimulai otomatis! Cek folder Downloads kamu.
                    </p>
                    <a href="${downloadUrl}" class="download-link" download="${safeTitle}.${currentFormat}" target="_blank">
                        <i class="fas fa-redo"></i> Download Ulang
                    </a>
                </div>
            </div>
            <div class="tips">
                <p><i class="fas fa-lightbulb"></i> Tips Download</p>
                <ul>
                    <li>File otomatis tersimpan di folder Downloads browser kamu</li>
                    <li>Klik "Download Ulang" jika file tidak tersimpan otomatis</li>
                    <li>Pastikan koneksi internet Anda stabil</li>
                </ul>
            </div>
        `;

        result.innerHTML = resultHTML;
        result.className = 'result success';
        result.style.display = 'block';
    }

    function showError(message) {
        result.innerHTML = `
            <div class="media-card">
                <div class="media-info">
                    <h3>Download gagal</h3>
                    <p>${message}</p>
                </div>
            </div>
        `;
        result.className = 'result error';
        result.style.display = 'block';
    }

    function findDownloadUrl(data) {
        if (data?.url) return data.url;
        if (data?.result?.url) return data.result.url;
        if (data?.downloadUrl) return data.downloadUrl;
        if (data?.link) return data.link;
        if (data?.data?.url) return data.data.url;
        if (data?.video?.url) return data.video.url;
        if (data?.audio?.url) return data.audio.url;
        return null;
    }

    function getCompatibleTikTokVideoUrl(tiktokData) {
    
        return tiktokData.play || tiktokData.wmplay || tiktokData.hdplay || null;
    }

    function isValidYouTubeUrl(url) {
        return /youtu\.?be/.test(url);
    }

    function isValidTikTokUrl(url) {
        return /tiktok\.com/.test(url);
    }

    function extractVideoId(url) {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function sanitizeFilename(name) {
        return (name || 'download')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
});
