// 1. SELECTION DES ELEMENTS HTML
const form = document.getElementById('student-form');
const grid = document.getElementById('student-list');
const counter = document.getElementById('counter');
const voiceBtn = document.getElementById('voice-btn');
const aiOverlay = document.getElementById('ai-response-overlay');
const aiTextOutput = document.getElementById('ai-text-output');
const photoInput = document.getElementById('photo');

// 2. ÉTAT DE L'APPLICATION
let students = JSON.parse(localStorage.getItem('annuaire_g12_permanent')) || [];
let isFormMode = false; // Est-ce qu'on remplit le formulaire à la voix ?
let formStep = 0; // À quelle étape du formulaire on est (0=Prénom, 1=Nom, etc.)

const fields = ["firstname", "lastname", "matricule", "phone"];
const fieldLabels = ["le prénom", "le nom de famille", "le matricule", "le numéro de téléphone"];

// 3. CONFIGURATION DE LA VOIX (MICRO)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        voiceBtn.classList.add('active');
        console.log("L'IA vous écoute...");
    };

    recognition.onend = () => {
        voiceBtn.classList.remove('active');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
    };
}

// 4. LE CERVEAU DE L'IA (LOGIQUE GEMINI)
function handleVoiceCommand(input) {
    const prompt = input.toLowerCase().trim();
    console.log("IA a reçu :", prompt);

    // --- MODE FORMULAIRE VOCAL ---
    if (isFormMode) {
        document.getElementById(fields[formStep]).value = input; // Remplit le champ actuel
        formStep++;

        if (formStep < fields.length) {
            speakAndShow(`Bien reçu : ${input}. Quel est ${fieldLabels[formStep]} ?`);
            // On relance le micro automatiquement pour l'étape suivante
            setTimeout(() => recognition.start(), 2000);
        } else {
            isFormMode = false;
            formStep = 0;
            speakAndShow("Parfait ! J'ai rempli les textes. Maintenant, choisis une photo et clique sur Enregistrer.");
        }
        return;
    }

    // --- MODE COMMANDES GÉNÉRALES ---
    // A. Lancer l'inscription
    if (prompt.includes("inscrit") || prompt.includes("ajouter") || prompt.includes("remplir")) {
        isFormMode = true;
        formStep = 0;
        speakAndShow("Très bien, commençons. Quel est le prénom de l'étudiant ?");
        setTimeout(() => recognition.start(), 3000); // Laisse le temps à l'IA de parler
    } 
    // B. Chercher quelqu'un
    else if (prompt.includes("qui est") || prompt.includes("cherche") || prompt.includes("trouve")) {
        const target = prompt.replace(/qui est|cherche|trouve/g, "").trim();
        const found = students.find(s => 
            s.firstName.toLowerCase().includes(target) || 
            s.lastName.toLowerCase().includes(target) ||
            s.matricule.toLowerCase().includes(target)
        );

        if (found) {
            speakAndShow(`J'ai trouvé ${found.firstName} ${found.lastName}. Matricule ${found.matricule}.`);
            render(students.filter(s => s.id === found.id)); // Affiche seulement lui
        } else {
            speakAndShow(`Désolé, je n'ai aucun "${target}" dans ma base de données.`);
        }
    }
    // C. Statistiques
    else if (prompt.includes("combien") || prompt.includes("total") || prompt.includes("nombre")) {
        speakAndShow(`Il y a actuellement ${students.length} membres enregistrés dans le Groupe 12.`);
    }
    // D. Liste complète
    else if (prompt.includes("liste") || prompt.includes("quels sont les noms")) {
        if(students.length === 0) return speakAndShow("La liste est vide.");
        const noms = students.map(s => s.firstName + " " + s.lastName).join(", ");
        speakAndShow(`Les étudiants sont : ${noms}.`);
    }
    // E. Défaut
    else {
        speakAndShow(`J'ai entendu "${input}". Pour m'utiliser, dites par exemple : Inscrire un étudiant, ou, Qui est [Nom] ?`);
    }
}

// 5. FONCTIONS DE PAROLE ET D'AFFICHAGE
function speakAndShow(text) {
    aiTextOutput.innerText = text;
    aiOverlay.style.display = 'flex';
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
}

// 6. GESTION DE LA BASE DE DONNÉES (RENDU ET SAUVEGARDE)
function render(dataToDisplay = students) {
    grid.innerHTML = '';
    dataToDisplay.forEach(s => {
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
    saveData();
    render();
};

function saveData() {
    localStorage.setItem('annuaire_g12_permanent', JSON.stringify(students));
}

// 7. FORMULAIRE (ENREGISTREMENT FINAL)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = photoInput.files[0];
    if (!file) return alert("Veuillez ajouter une photo !");

    const reader = new FileReader();
    reader.onload = (event) => {
        const newStudent = {
            id: Date.now(),
            firstName: document.getElementById('firstname').value,
            lastName: document.getElementById('lastname').value.toUpperCase(),
            matricule: document.getElementById('matricule').value,
            phone: document.getElementById('phone').value,
            photo: event.target.result
        };
        students.push(newStudent);
        saveData();
        render();
        form.reset();
        document.getElementById('photo-label').innerText = "📸 Photo ajoutée !";
    };
    reader.readAsDataURL(file);
});

// 8. ACTIONS DES BOUTONS
voiceBtn.onclick = () => {
    if (recognition) recognition.start();
    else alert("Votre navigateur ne supporte pas la voix.");
};

window.closeAI = () => {
    aiOverlay.style.display = 'none';
    render(); // Réaffiche tout le monde après une recherche
};

// Afficher le nom du fichier sélectionné
photoInput.onchange = () => {
    const fileName = photoInput.files[0]?.name || "Ajouter une photo";
    document.getElementById('photo-label').innerText = "📸 " + fileName;
};

// Lancement initial
render();
