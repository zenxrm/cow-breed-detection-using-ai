// Function to run scripts for the LOGIN page
function setupLoginPage() {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeOpen = document.getElementById('eye-open');
    const eyeClosed = document.getElementById('eye-closed');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sessionStorage.setItem('username', usernameInput.value);
            window.location.href = '/dashboard';
        });
    }

    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            eyeOpen.classList.toggle('hidden');
            eyeClosed.classList.toggle('hidden');
        });
    }
}

// Function to run scripts for the DASHBOARD page
function setupDashboardPage() {
    // --- Element Selection ---
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const analyzeBtn = document.getElementById('analyze-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadBtnHidden = document.getElementById('upload-btn-hidden');
    const cameraBtn = document.getElementById('camera-btn'); // Camera button
    const imagePreview = document.getElementById('image-preview');
    const videoFeed = document.getElementById('video-feed'); // Video element for camera
    const placeholder = document.getElementById('placeholder');
    const resultArea = document.getElementById('result-area');
    const loader = resultArea.querySelector('.loader');
    const resultContent = document.getElementById('result-content');
    const breedName = document.getElementById('breed-name');
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceText = document.getElementById('confidence-text');
    const breedInfoPanel = document.getElementById('breed-info-panel');
    const breedInfoOrigin = document.getElementById('breed-info-origin');
    const breedInfoType = document.getElementById('breed-info-type');
    const breedInfoMilk = document.getElementById('breed-info-milk');
    const breedInfoFat = document.getElementById('breed-info-fat');
    const breedInfoFertility = document.getElementById('breed-info-fertility');
    const breedInfoFeeding = document.getElementById('breed-info-feeding');
    const breedInfoDisease = document.getElementById('breed-info-disease');
    const breedInfoTemperament = document.getElementById('breed-info-temperament');
    const breedInfoEconomics = document.getElementById('breed-info-economics');
    
    let currentFile = null;
    let stream = null;
    let isCameraActive = false;

    // --- Profile, Analytics & Log State ---
    let totalClassifications = 0;
    let confidenceSum = 0;
    const allLogs = [];
    const breedCounts = {};

    function loadProfileData() {
        const username = sessionStorage.getItem('username') || 'Agent_X';
        document.getElementById('profile-username').textContent = username;
        document.getElementById('profile-email').textContent = `${username.toLowerCase()}@breed-id.system`;
    }
    loadProfileData();

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.classList.contains('logout-btn')) {
                sessionStorage.clear();
                window.location.href = '/login';
                return;
            }
            e.preventDefault();
            const targetId = item.getAttribute('data-section');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            contentSections.forEach(section => {
                section.classList.toggle('active', section.id === targetId);
                section.classList.toggle('hidden', section.id !== targetId);
            });
            // If analytics tab is clicked for the first time, render the charts
            if (targetId === 'analytics-section' && !document.getElementById('breed-pie-chart').chart) {
                renderAnalytics();
            }
        });
    });

    // --- Classifier Logic ---
    uploadBtn.addEventListener('click', () => uploadBtnHidden.click());
    uploadBtnHidden.addEventListener("change", (event) => handleFile(event.target.files[0]));
    analyzeBtn.addEventListener("click", () => { if (currentFile) predict(currentFile); });
    
    // --- Camera Logic ---
    if (cameraBtn) {
        cameraBtn.addEventListener('click', toggleCamera);
    }

    async function toggleCamera() {
        if (isCameraActive) {
            stopCamera();
        } else {
            await startCamera();
        }
    }

    async function startCamera() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Use back camera if available
                }
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoFeed.srcObject = stream;
            videoFeed.classList.remove('hidden');
            imagePreview.classList.add('hidden');
            placeholder.classList.add('hidden');
            
            // Update UI
            cameraBtn.textContent = 'STOP CAMERA';
            cameraBtn.classList.add('active');
            document.querySelector('.upload-area').classList.add('camera-active');
            
            isCameraActive = true;

            // Add capture button if it doesn't exist
            if (!document.getElementById('capture-btn')) {
                const captureBtn = document.createElement('button');
                captureBtn.id = 'capture-btn';
                captureBtn.className = 'control-button camera-btn';
                captureBtn.textContent = 'CAPTURE IMAGE';
                captureBtn.addEventListener('click', captureImage);
                
                const controls = document.querySelector('.controls');
                controls.appendChild(captureBtn);
            } else {
                document.getElementById('capture-btn').classList.remove('hidden');
            }

        } catch (error) {
            console.error('Camera access failed:', error);
            showCameraError('Camera access denied or not available');
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        videoFeed.classList.add('hidden');
        videoFeed.srcObject = null;
        placeholder.classList.remove('hidden');
        
        // Update UI
        cameraBtn.textContent = 'ACTIVATE CAMERA';
        cameraBtn.classList.remove('active');
        document.querySelector('.upload-area').classList.remove('camera-active');
        
        // Hide capture button
        const captureBtn = document.getElementById('capture-btn');
        if (captureBtn) {
            captureBtn.classList.add('hidden');
        }
        
        isCameraActive = false;
        currentFile = null;
        analyzeBtn.classList.add('hidden');
        resultArea.classList.add('hidden');
    }

    function captureImage() {
        if (!videoFeed || videoFeed.classList.contains('hidden')) return;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = videoFeed.videoWidth;
        canvas.height = videoFeed.videoHeight;
        
        // Draw the video frame to canvas
        context.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob and create file
        canvas.toBlob((blob) => {
            if (blob) {
                currentFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
                
                // Show captured image
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                imagePreview.src = dataURL;
                imagePreview.classList.remove('hidden');
                videoFeed.classList.add('hidden');
                
                // Stop camera and show analyze button
                stopCamera();
                analyzeBtn.classList.remove('hidden');
                resultArea.classList.add('hidden');
                
                console.log('Image captured successfully:', currentFile); // Debug log
            } else {
                console.error('Failed to create blob from canvas');
                showCameraError('Failed to capture image');
            }
        }, 'image/jpeg', 0.9);
    }

    function showCameraError(message) {
        // Remove existing error message
        const existingError = document.querySelector('.camera-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'camera-error';
        errorDiv.textContent = message;
        
        const controls = document.querySelector('.controls');
        controls.parentNode.appendChild(errorDiv);
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    function handleFile(file) {
        if (file) {
            // Stop camera if active
            if (isCameraActive) {
                stopCamera();
            }
            
            currentFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove("hidden");
                placeholder.classList.add("hidden");
                analyzeBtn.classList.remove("hidden");
                resultArea.classList.add("hidden");
            };
            reader.readAsDataURL(file);
        }
    }

    async function predict(fileData) {
        console.log('Starting prediction with file:', fileData); // Debug log
        
        if (!fileData) {
            console.error('No file data provided to predict function');
            showCameraError('No image data to analyze');
            return;
        }
        
        analyzeBtn.classList.add('hidden');
        const formData = new FormData();
        formData.append("file", fileData);
        
        console.log('FormData created, file size:', fileData.size); // Debug log
        
        resultArea.classList.remove("hidden");
        loader.classList.remove("hidden");
        resultContent.classList.add("hidden");
        breedInfoPanel.classList.add('hidden');

        try {
            console.log('Sending request to /predict endpoint'); // Debug log
            const response = await fetch("/predict", { method: "POST", body: formData });
            console.log('Response received:', response.status, response.statusText); // Debug log
            
            const result = await response.json();
            console.log('Parsed result:', result); // Debug log

            if (response.ok && result.breed) {
                const breed = result.breed;
                const confidence = (result.confidence * 100).toFixed(2);
                breedName.innerText = breed;
                confidenceBar.style.width = confidence + "%";
                confidenceText.innerText = confidence + "%";
                
                if (result.info) {
                    breedInfoOrigin.innerText = result.info.origin || 'N/A';
                    breedInfoType.innerText = result.info.type || 'N/A';
                    breedInfoMilk.innerText = result.info.milk_production || 'N/A';
                    breedInfoFat.innerText = result.info.milk_fat_snf || 'N/A';
                    breedInfoFertility.innerText = result.info.fertility_calving || 'N/A';
                    breedInfoFeeding.innerText = result.info.feeding_needs || 'N/A';
                    breedInfoDisease.innerText = result.info.disease_resistance || 'N/A';
                    breedInfoTemperament.innerText = result.info.temperament || 'N/A';
                    breedInfoEconomics.innerText = result.info.economic_factors || 'N/A';
                    breedInfoPanel.classList.remove('hidden');
                }
                
                // Display Grad-CAM if available
                if (result.gradcam) {
                    showGradCAM(result.gradcam);
                }
                
                updateAnalyticsAndLogs(breed, confidence);
            } else {
                throw new Error(result.error || "Prediction failed");
            }
        } catch (error) {
            console.error('Prediction error:', error); // Debug log
            breedName.innerText = "Error";
            confidenceText.innerText = error.message;
        } finally {
            loader.classList.add("hidden");
            resultContent.classList.remove("hidden");
        }
    }
    
    function showGradCAM(gradcamBase64) {
        // Remove existing Grad-CAM if present
        const existingGradCAM = document.getElementById('gradcam-container');
        if (existingGradCAM) {
            existingGradCAM.remove();
        }

        // Create Grad-CAM container
        const gradcamContainer = document.createElement('div');
        gradcamContainer.id = 'gradcam-container';
        gradcamContainer.className = 'gradcam-container';
        
        const gradcamTitle = document.createElement('h4');
        gradcamTitle.className = 'gradcam-title';
        gradcamTitle.textContent = 'Model Focus Areas';
        
        const gradcamImg = document.createElement('img');
        gradcamImg.className = 'gradcam-image';
        gradcamImg.src = gradcamBase64;
        gradcamImg.alt = 'Grad-CAM Visualization';
        
        const gradcamDescription = document.createElement('p');
        gradcamDescription.className = 'gradcam-description';
        gradcamDescription.textContent = 'Red/Yellow areas show regions the AI focused on for classification';
        
        gradcamContainer.appendChild(gradcamTitle);
        gradcamContainer.appendChild(gradcamImg);
        gradcamContainer.appendChild(gradcamDescription);
        
        // Insert after breed info panel
        breedInfoPanel.parentNode.insertBefore(gradcamContainer, breedInfoPanel.nextSibling);
    }

    function updateAnalyticsAndLogs(breed, confidence) {
        totalClassifications++;
        confidenceSum += parseFloat(confidence);
        const avgConfidence = (confidenceSum / totalClassifications).toFixed(2) + "%";
        
        // Update breed counts for pie chart
        breedCounts[breed] = (breedCounts[breed] || 0) + 1;

        // Update Analytics Stats
        document.getElementById("total-classifications").innerText = totalClassifications;
        document.getElementById("avg-confidence").innerText = avgConfidence;

        // Add Log Entry
        const newLog = {
            breed: breed,
            confidence: confidence,
            timestamp: new Date().toLocaleTimeString(),
            imgUrl: URL.createObjectURL(currentFile)
        };
        allLogs.unshift(newLog); // Add to beginning of logs array
        renderLogs(allLogs);

        // Update Profile Stats
        document.getElementById("uploaded-images").innerText = totalClassifications;
        document.getElementById("most-frequent").innerText = Object.keys(breedCounts).reduce((a, b) => breedCounts[a] > breedCounts[b] ? a : b);
        document.getElementById("accuracy-seen").innerText = avgConfidence;
    }

    function renderLogs(logs) {
        const logList = document.getElementById("log-list");
        if (!logList) return;
        logList.innerHTML = '';
        logs.forEach(log => {
            const logEntry = document.createElement("div");
            logEntry.className = 'log-item';
            logEntry.innerHTML = `
                <img src="${log.imgUrl}" alt="thumbnail" class="log-thumbnail">
                <div class="log-details">
                    <p class="log-breed">${log.breed}</p>
                    <p class="log-meta">Confidence: ${log.confidence}%</p>
                </div>
                <p class="log-meta">${log.timestamp}</p>
            `;
            logList.appendChild(logEntry);
        });
    }

    function renderAnalytics() {
        Chart.defaults.color = 'var(--text-muted)';
        
        // Pie Chart
        const pieCtx = document.getElementById('breed-pie-chart').getContext('2d');
        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(breedCounts),
                datasets: [{
                    data: Object.values(breedCounts),
                    backgroundColor: ['#00f0ff', '#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850'],
                    borderColor: 'var(--secondary-color)',
                }]
            },
            options: { responsive: true, plugins: { legend: { labels: { color: 'var(--text-color)' } } } }
        });

        // Weekly Activity Chart (using mock data for now)
        const weeklyCtx = document.getElementById('weekly-chart').getContext('2d');
        new Chart(weeklyCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Classifications',
                    data: [12, 19, 3, 5, 2, 3, 15], // Mock data
                    borderColor: 'var(--accent-color)',
                    backgroundColor: 'rgba(0, 240, 255, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'var(--border-color)' } }, x: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'transparent' } } } }
        });
    }

    // Clean up camera on page unload
    window.addEventListener('beforeunload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
}

// Main execution logic
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('login-body')) {
        setupLoginPage();
    } else if (document.querySelector('.app-container')) {
        setupDashboardPage();
    }
});