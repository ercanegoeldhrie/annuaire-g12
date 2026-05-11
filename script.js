// --- CONFIGURATION INITIALE ---
const form = document.getElementById('student-form');
const grid = document.getElementById('student-list');
const counter = document.getElementById('counter');
const voiceBtn = document.getElementById('voice-btn');
const aiOverlay = document.getElementById('ai-response-overlay');
const aiTextOutput = document.getElementById('ai-text-output');

// Stockage permanent (LocalStorage)
let students = JSON.parse(localStorage.getItem('annuaire_g12_permanent')) || [];

// Initialisation de la reconnaissance vocale
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => voiceBtn.classList.add('active');
    recognition.onend = () => voiceBtn.classList.remove('active');
    recognition.onerror = () => voiceBtn.classList.remove('active');
    
    recognition.onresult = (event) => {
        const speech = event.results[0][0].transcript;
        handleVoiceCommand(speech);
    };
}

// Premier rendu au démarrage
render();

// --- LE "CERVEAU" TYPE GEMINI ---
function handleVoiceCommand(input) {
    const prompt = input.toLowerCase().trim();
    console.log("Analyse Gemini-mode :", prompt);

    // 1. INTENTION : RECHERCHE COMPLEXE (Nom, Matricule ou Tél)
    if (prompt.includes("qui est") || prompt.includes("cherche") || prompt.includes("trouve") || prompt.includes("info sur")) {
        const target = prompt.replace(/qui est|cherche|trouve|info sur/g, "").trim();
        const found = students.find(s => 
            s.firstName.toLowerCase().includes(target) || 
            s.lastName.toLowerCase().includes(target) ||
            s.matricule.toLowerCase().includes(target)
        );

        if (found) {
            const reply = `J'ai trouvé ${found.firstName} ${found.lastName}. Matricule ${found.matricule}. Son numéro est le ${found.phone}.`;
            render(students.filter(s => s.id === found.id));
            speakAndShow(reply);
        } else {
            speakAndShow(`Je n'ai aucun membre correspondant à "${target}" dans les registres du Groupe 12.`);
        }
    }

    // 2. INTENTION : ANALYSE DE LA BASE (Noms, Statistiques)
    else if (prompt.includes("liste") || prompt.includes("noms") || prompt.includes("enregistré") || prompt.includes("qui sont-ils")) {
        if (students.length === 0) {
            speakAndShow("La base de données est actuellement vide. Aucun étudiant n'a été enregistré.");
        } else {
            const noms = students.map(s => `${s.firstName} ${s.lastName}`).join(", ");
            speakAndShow(`Les membres enregistrés sont : ${noms}.`);
        }
    }

    // 3. INTENTION : ÉTAT DU PROJET / EFFECTIF
    else if (prompt.includes("combien") || prompt.includes("nombre") || prompt.includes("total")) {
        const msg = `Nous avons actuellement ${students.length} membre(s) dans le projet.`;
        speakAndShow(msg);
    }

    // 4. INTENTION : IDENTITÉ DU PROJET (Questions "Philosophiques")
    else if (prompt.includes("c'est quoi") || prompt.includes("ton nom") || prompt.includes("tu fais quoi")) {
        speakAndShow("Je suis l'Intelligence Artificielle du Groupe 12. Mon rôle est de gérer l'annuaire des étudiants et de répondre à vos questions vocales.");
    }

    // 5. RÉPONSE D'ÉCHEC (Honnêteté de l'IA)
    else {
        speakAndShow(`J'ai bien entendu : "${input}". Malheureusement, ma base de données actuelle ne me permet pas de répondre à cette question précise. Posez-moi une question sur les membres du Groupe 12.`);
    }
}

// --- FONCTIONS UTILITAIRES ---

function speakAndShow(text) {
    // Affichage visuel
    aiTextOutput.innerText = text;
    aiOverlay.style.display = 'flex';

    // Synthèse vocale
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
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

function saveAndRender() {
    localStorage.setItem('annuaire_g12_permanent', JSON.stringify(students));
    render();
}

window.deleteStudent = (id) => {
    students = students.filter(s => s.id !== id);
    saveAndRender();
};

window.closeAI = () => {
    aiOverlay.style.display = 'none';
    render(); // Réinitialise l'affichage complet
};

// Formulaire manuel
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

// Micro bouton
voiceBtn.onclick = () => {
    if (recognition) recognition.start();
    else alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
};
