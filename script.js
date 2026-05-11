const form = document.getElementById('student-form');
const grid = document.getElementById('student-list');
const counter = document.getElementById('counter');
const voiceBtn = document.getElementById('voice-btn');
const aiOverlay = document.getElementById('ai-response-overlay');
const aiTextOutput = document.getElementById('ai-text-output');

// Initialisation des données (Stockage permanent)
let students = JSON.parse(localStorage.getItem('annuaire_g12_permanent')) || [];

// Configuration Vocale
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = (SpeechRecognition) ? new SpeechRecognition() : null;
if (recognition) {
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
}

// Premier rendu au chargement
render();

// --- LOGIQUE DE FORMULAIRE ---
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = document.getElementById('photo').files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
        const newStudent = {
            id: Date.now(),
            firstName: document.getElementById('firstname').value.trim(),
            lastName: document.getElementById('lastname').value.toUpperCase().trim(),
            matricule: document.getElementById('matricule').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            photo: event.target.result
        };

        students.push(newStudent);
        saveAndRender();
        form.reset();
        document.getElementById('file-name').innerText = "Ajouter une photo";
    };
    reader.readAsDataURL(file);
});

function saveAndRender() {
    localStorage.setItem('annuaire_g12_permanent', JSON.stringify(students));
    render();
}

function render(data = students) {
    grid.innerHTML = '';
    data.forEach(s => {
        grid.innerHTML += `
            <div class="card">
                <button class="btn-delete" onclick="deleteStudent(${s.id})">×</button>
                <img src="${s.photo}">
                <div class="card-info">
                    <h3>${s.firstName} ${s.lastName}</h3>
                    <p>Mat: ${s.matricule}</p>
                    <p>Tél: ${s.phone}</p>
                </div>
            </div>
        `;
    });
    counter.innerText = `${students.length} membre(s) enregistré(s)`;
}

window.deleteStudent = (id) => {
    students = students.filter(s => s.id !== id);
    saveAndRender();
};

// --- LOGIQUE VOCALE & IA ---
if (recognition) {
    voiceBtn.onclick = () => {
        recognition.start();
        voiceBtn.classList.add('active');
    };

    recognition.onresult = (event) => {
        voiceBtn.classList.remove('active');
        const speech = event.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(speech);
    };

    recognition.onerror = () => voiceBtn.classList.remove('active');
}

function handleVoiceCommand(cmd) {
    console.log("IA a entendu :", cmd);

    if (cmd.includes("qui est") || cmd.includes("cherche")) {
        const name = cmd.split("est").pop().split("cherche").pop().trim();
        const found = students.find(s => s.firstName.toLowerCase().includes(name) || s.lastName.toLowerCase().includes(name));
        
        if (found) {
            const msg = `J'ai trouvé ${found.firstName} ${found.lastName}. Matricule ${found.matricule}.`;
            showAIResponse(msg);
            render(students.filter(s => s.id === found.id));
        } else {
            showAIResponse(`Désolé, je ne connais pas de ${name}.`);
        }
    } 
    else if (cmd.includes("combien")) {
        showAIResponse(`Vous avez ${students.length} étudiants dans votre base de données.`);
    }
    else {
        showAIResponse("J'ai entendu : " + cmd + ". Essayez de me demander 'Qui est [Nom] ?'");
    }
}

function showAIResponse(text) {
    aiTextOutput.innerText = text;
    aiOverlay.style.display = 'flex';
    
    // Synthèse Vocale (L'IA parle)
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'fr-FR';
    window.speechSynthesis.speak(speech);
}

window.closeAI = () => {
    aiOverlay.style.display = 'none';
    render(); // Réinitialise l'affichage complet
};

// Recherche Textuelle
document.getElementById('search-bar').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = students.filter(s => 
        s.firstName.toLowerCase().includes(val) || 
        s.lastName.toLowerCase().includes(val) || 
        s.matricule.toLowerCase().includes(val)
    );
    render(filtered);
});