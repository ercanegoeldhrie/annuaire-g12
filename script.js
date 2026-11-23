// 1. SELECTION DES ELEMENTS HTML
const form = document.getElementById('student-form');
const grid = document.getElementById('student-list');
const counter = document.getElementById('counter');
const searchBar = document.getElementById('search-bar');
const voiceBtn = document.getElementById('voice-btn');
const aiOverlay = document.getElementById('ai-response-overlay');
const aiTextOutput = document.getElementById('ai-text-output');
const feedback = document.getElementById('ia-feedback');
const photoInput = document.getElementById('photo');
const fileNameLabel = document.getElementById('file-name');

const STORAGE_KEY = 'annuaire_g12_permanent';
const PHOTO_MAX_SIZE = 320; // côté le plus long, en pixels, pour ne pas saturer le localStorage

// 2. ÉTAT DE L'APPLICATION
let students = loadData();
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
    };

    recognition.onend = () => {
        voiceBtn.classList.remove('active');
    };

    recognition.onerror = (event) => {
        voiceBtn.classList.remove('active');
        if (event.error === 'not-allowed') {
            speakAndShow("Je n'ai pas accès au micro. Autorise-le dans les réglages du navigateur.");
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
    };
}

function listen(delay) {
    if (!recognition) return;
    setTimeout(() => {
        try { recognition.start(); } catch (e) { /* déjà en écoute */ }
    }, delay);
}

// 4. LE CERVEAU DE L'IA
function normalize(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function matches(student, query) {
    const q = normalize(query);
    if (!q) return true;
    return [student.firstName, student.lastName, student.matricule, student.phone,
        `${student.firstName} ${student.lastName}`, `${student.lastName} ${student.firstName}`]
        .some(value => normalize(value).includes(q));
}

function handleVoiceCommand(input) {
    const prompt = normalize(input);

    // --- MODE FORMULAIRE VOCAL ---
    if (isFormMode) {
        document.getElementById(fields[formStep]).value = input.trim();
        formStep++;

        if (formStep < fields.length) {
            speakAndShow(`Bien reçu : ${input}. Quel est ${fieldLabels[formStep]} ?`);
            listen(2500); // On relance le micro pour l'étape suivante
        } else {
            isFormMode = false;
            formStep = 0;
            speakAndShow("Parfait ! J'ai rempli les textes. Maintenant, choisis une photo et clique sur Enregistrer.");
        }
        return;
    }

    // --- MODE COMMANDES GÉNÉRALES ---
    // A. Lancer l'inscription
    if (prompt.includes("inscri") || prompt.includes("ajoute") || prompt.includes("remplir")) {
        isFormMode = true;
        formStep = 0;
        speakAndShow("Très bien, commençons. Quel est le prénom de l'étudiant ?");
        listen(3000); // Laisse le temps à l'IA de parler
    }
    // B. Chercher quelqu'un
    else if (prompt.includes("qui est") || prompt.includes("cherche") || prompt.includes("trouve")) {
        const target = prompt.replace(/qui est|cherche|trouve/g, "").trim();
        const found = target ? students.filter(s => matches(s, target)) : [];

        if (found.length === 1) {
            const s = found[0];
            speakAndShow(`J'ai trouvé ${s.firstName} ${s.lastName}. Matricule ${s.matricule}.`);
        } else if (found.length > 1) {
            speakAndShow(`J'ai trouvé ${found.length} personnes : ${found.map(s => s.firstName + " " + s.lastName).join(", ")}.`);
        } else {
            speakAndShow(`Désolé, je n'ai aucun "${target}" dans ma base de données.`);
        }
        if (found.length) {
            searchBar.value = target;
            render();
        }
    }
    // C. Statistiques
    else if (prompt.includes("combien") || prompt.includes("total") || prompt.includes("nombre")) {
        speakAndShow(`Il y a actuellement ${students.length} membre${students.length > 1 ? 's' : ''} enregistré${students.length > 1 ? 's' : ''} dans le Groupe 12.`);
    }
    // D. Liste complète
    else if (prompt.includes("liste") || prompt.includes("quels sont les noms")) {
        if (students.length === 0) return speakAndShow("La liste est vide.");
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
    aiTextOutput.textContent = text;
    aiOverlay.style.display = 'flex';

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        window.speechSynthesis.speak(utterance);
    }
}

function showFeedback(text, isError = false) {
    feedback.textContent = text;
    feedback.classList.toggle('error', isError);
    feedback.style.display = 'block';
    clearTimeout(showFeedback.timer);
    showFeedback.timer = setTimeout(() => { feedback.style.display = 'none'; }, 4000);
}

// 6. GESTION DE LA BASE DE DONNÉES (RENDU ET SAUVEGARDE)
function createCard(s) {
    const card = document.createElement('div');
    card.className = 'card';

    const del = document.createElement('button');
    del.className = 'btn-delete';
    del.type = 'button';
    del.title = 'Supprimer';
    del.textContent = '×';
    del.addEventListener('click', () => deleteStudent(s.id));

    const img = document.createElement('img');
    img.src = s.photo;
    img.alt = `Photo de ${s.firstName} ${s.lastName}`;

    const info = document.createElement('div');
    info.className = 'card-info';
    const name = document.createElement('h3');
    name.textContent = `${s.firstName} ${s.lastName}`;
    const mat = document.createElement('p');
    mat.textContent = `Mat: ${s.matricule}`;
    const tel = document.createElement('p');
    tel.textContent = `Tél: ${s.phone}`;
    info.append(name, mat, tel);

    card.append(del, img, info);
    return card;
}

function render() {
    const query = searchBar.value;
    const visible = students.filter(s => matches(s, query));

    grid.replaceChildren(...visible.map(createCard));

    if (visible.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = students.length === 0
            ? "Aucun membre pour l'instant. Remplis le formulaire ou dis « Inscrire un étudiant »."
            : `Aucun résultat pour « ${query} ».`;
        grid.append(empty);
    }

    const total = `${students.length} membre${students.length > 1 ? 's' : ''} enregistré${students.length > 1 ? 's' : ''}`;
    counter.textContent = query.trim() ? `${visible.length} résultat(s) sur ${total}` : total;
}

function deleteStudent(id) {
    const s = students.find(x => x.id === id);
    if (!s || !confirm(`Supprimer ${s.firstName} ${s.lastName} ?`)) return;
    students = students.filter(x => x.id !== id);
    saveData();
    render();
}

function loadData() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
        return true;
    } catch (e) {
        return false; // Espace de stockage plein
    }
}

// Réduit la photo avant de la stocker : une photo de téléphone pèse plusieurs Mo,
// alors que le localStorage est limité à environ 5 Mo pour tout l'annuaire.
function resizePhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Lecture de la photo impossible."));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("Ce fichier n'est pas une image valide."));
            img.onload = () => {
                const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// 7. FORMULAIRE (ENREGISTREMENT FINAL)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = photoInput.files[0];
    if (!file) return showFeedback("Ajoute une photo avant d'enregistrer.", true);

    const value = id => document.getElementById(id).value.trim();
    const matricule = value('matricule');
    if (students.some(s => normalize(s.matricule) === normalize(matricule))) {
        return showFeedback(`Le matricule ${matricule} est déjà enregistré.`, true);
    }

    let photo;
    try {
        photo = await resizePhoto(file);
    } catch (err) {
        return showFeedback(err.message, true);
    }

    const newStudent = {
        id: Date.now(),
        firstName: value('firstname'),
        lastName: value('lastname').toUpperCase(),
        matricule,
        phone: value('phone'),
        photo
    };
    students.push(newStudent);

    if (!saveData()) {
        students.pop();
        return showFeedback("Mémoire du navigateur pleine : supprime des membres pour en ajouter d'autres.", true);
    }

    form.reset();
    fileNameLabel.textContent = "Ajouter une photo";
    searchBar.value = '';
    render();
    showFeedback(`${newStudent.firstName} ${newStudent.lastName} a été ajouté(e).`);
});

// 8. ACTIONS DES BOUTONS
voiceBtn.addEventListener('click', () => {
    if (recognition) listen(0);
    else speakAndShow("Votre navigateur ne supporte pas la reconnaissance vocale. Essayez avec Chrome ou Edge.");
});

window.closeAI = () => {
    aiOverlay.style.display = 'none';
};

searchBar.addEventListener('input', render);

// Afficher le nom du fichier sélectionné
photoInput.addEventListener('change', () => {
    fileNameLabel.textContent = photoInput.files[0]?.name || "Ajouter une photo";
});

// 9. MODE HORS LIGNE (PWA)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* l'app marche aussi sans */ });
    });
}

// Lancement initial
render();
