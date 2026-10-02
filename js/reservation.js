// --- Réglages du restaurant ---
// Valeurs de secours : elles sont remplacées par celles de data/site.json (modifiables dans /admin).
// Ce fichier doit être chargé après site.js.
let NUMERO_WHATSAPP = "22892036639"; // indicatif pays + numéro, sans "+" ni espaces
let JOUR_FERME = 1;                  // 0 = dimanche, 1 = lundi, -1 = aucun jour de fermeture
let DELAI_MIN = 60;                  // délai minimum avant l'heure réservée, en minutes
let PERSONNES_MAX = 8;               // au-delà : « Plus de 8 personnes »

const form = document.getElementById("form-resa");
const champDate = document.getElementById("date");
const champHeure = document.getElementById("heure");
const champPlat = document.getElementById("plat");
const zoneErreur = document.getElementById("erreur-resa");
const zoneSucces = document.getElementById("succes-resa");

let platsCharges = false; // devient vrai quand la liste des plats est remplie


// --- Réglages venant de data/site.json ---

function nombre(valeur, secours) {
  const n = Number(valeur);
  return valeur === undefined || valeur === "" || Number.isNaN(n) ? secours : n;
}

// Reconstruit la liste des heures de réservation (déjeuner avant 16h, dîner ensuite)
function remplirCreneaux(creneaux) {
  champHeure.textContent = "";
  champHeure.append(new Option("Choisir", ""));

  const groupes = { "Déjeuner": [], "Dîner": [] };
  [...creneaux].sort().forEach((c) => groupes[c < "16:00" ? "Déjeuner" : "Dîner"].push(c));

  Object.entries(groupes).forEach(([titre, heures]) => {
    if (heures.length === 0) return;
    const groupe = document.createElement("optgroup");
    groupe.label = titre;
    heures.forEach((h) => groupe.append(new Option(h, h)));
    champHeure.append(groupe);
  });

  majHeures();
}

// Reconstruit la liste « Nombre de personnes »
function remplirPersonnes(max) {
  const champ = document.getElementById("personnes");
  champ.textContent = "";

  for (let i = 1; i <= max; i++) {
    const libelle = i === 1 ? "1 personne" : `${i} personnes`;
    champ.append(new Option(libelle, String(i), i === 2, i === 2)); // 2 personnes par défaut
  }
  champ.append(new Option(`Plus de ${max} personnes`, "plus"));
}

chargerSite.then((site) => {
  const contact = site.contact || {};
  const horaires = site.horaires || {};
  const resa = site.reservation || {};

  if (contact.whatsapp) NUMERO_WHATSAPP = String(contact.whatsapp).replace(/\D/g, "");
  JOUR_FERME = nombre(horaires.jour_ferme, JOUR_FERME);
  DELAI_MIN = nombre(resa.delai_minimum, DELAI_MIN);
  PERSONNES_MAX = nombre(resa.personnes_max, PERSONNES_MAX);

  if (Array.isArray(resa.creneaux) && resa.creneaux.length > 0) remplirCreneaux(resa.creneaux);
  if (resa.personnes_max) remplirPersonnes(PERSONNES_MAX);
});


// --- Dates et heures ---

// Date locale au format AAAA-MM-JJ (évite le décalage de fuseau de toISOString)
function dateLocale(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Empêche de choisir une date passée
champDate.min = dateLocale(new Date());

// Vrai si le créneau (ex. "12:30") est déjà passé ou trop proche, pour la date choisie
function heureTropTot(heure) {
  if (champDate.value !== dateLocale(new Date())) return false; // autre jour : pas de limite
  const [h, m] = heure.split(":").map(Number);
  const creneau = new Date();
  creneau.setHours(h, m, 0, 0);
  return creneau.getTime() < Date.now() + DELAI_MIN * 60000;
}

// Désactive dans la liste les créneaux impossibles
function majHeures() {
  for (const option of champHeure.options) {
    if (!option.value) continue; // ignore "Choisir"
    option.disabled = heureTropTot(option.value);
  }
  if (champHeure.selectedOptions[0] && champHeure.selectedOptions[0].disabled) {
    champHeure.value = "";
  }
}
champDate.addEventListener("change", majHeures);

function formaterDate(valeur) {
  return new Date(valeur + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}


// --- Liste des plats (lue depuis data/menu.json) ---

const ORDRE = ["entrée", "plat", "Fast-food", "dessert", "boisson"];
const TITRES = { "entrée": "Entrées", plat: "Plats", "Fast-food": "Fast-food", dessert: "Desserts", boisson: "Boissons" };

function fcfa(n) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function rang(categorie) {
  const i = ORDRE.indexOf(categorie);
  return i === -1 ? 99 : i;
}

function remplirPlats(plats) {
  champPlat.textContent = "";
  champPlat.append(new Option("Choisir un plat", ""));

  const categories = [...new Set(plats.map((p) => p.categorie))].sort((a, b) => rang(a) - rang(b));

  categories.forEach((categorie) => {
    const groupe = document.createElement("optgroup");
    groupe.label = TITRES[categorie] || categorie;

    plats
      .filter((p) => p.categorie === categorie)
      .forEach((p) => groupe.append(new Option(`${p.nom} · ${fcfa(p.prix)}`, p.nom)));

    champPlat.append(groupe);
  });

  platsCharges = true;
}

fetch("data/menu.json")
  .then((reponse) => {
    if (!reponse.ok) throw new Error("HTTP " + reponse.status);
    return reponse.json();
  })
  .then((donnees) => remplirPlats(donnees.plats.filter((p) => p.prix)))
  .catch((erreur) => {
    console.error(erreur);
    champPlat.textContent = "";
    champPlat.append(new Option("Carte indisponible : précise ton plat dans la remarque", ""));
  });


// --- Validation ---

function valider(donnees) {
  if (donnees.nom.trim().length < 2) return "Indique ton nom complet.";
  if (donnees.tel.replace(/\D/g, "").length < 8) return "Indique un numéro de téléphone valide.";
  if (!donnees.date) return "Choisis une date.";
  if (donnees.date < dateLocale(new Date())) return "La date ne peut pas être passée.";
  if (new Date(donnees.date + "T12:00:00").getDay() === JOUR_FERME) {
    return `Le restaurant est fermé le ${NOMS_JOURS[JOUR_FERME]}. Choisis un autre jour.`;
  }
  if (!donnees.heure) return "Choisis une heure.";
  if (heureTropTot(donnees.heure)) {
    return "Ce créneau est passé ou trop proche. Choisis une heure au moins 1 h à l'avance.";
  }
  if (platsCharges && !donnees.plat) return "Choisis un plat.";
  return "";
}


// --- Envoi ---

form.addEventListener("submit", (e) => {
  e.preventDefault();
  zoneErreur.textContent = "";
  zoneSucces.textContent = "";

  const donnees = Object.fromEntries(new FormData(form));
  const erreur = valider(donnees);
  if (erreur) {
    zoneErreur.textContent = erreur;
    return;
  }

  const personnes = donnees.personnes === "plus" ? `Plus de ${PERSONNES_MAX}` : donnees.personnes;

  let message =
    "Bonjour, je souhaite réserver une table à L'Éclat de Saveurs.\n\n" +
    `Nom : ${donnees.nom.trim()}\n` +
    `Téléphone : ${donnees.tel.trim()}\n` +
    `Date : ${formaterDate(donnees.date)}\n` +
    `Heure : ${donnees.heure}\n` +
    `Personnes : ${personnes}`;

  if (donnees.plat) {
    message += `\nPlat : ${donnees.plat}`;
  }

  if (donnees.note.trim()) {
    message += `\nRemarque : ${donnees.note.trim()}`;
  }

  window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");

  zoneSucces.textContent = "Ta demande est prête dans WhatsApp. Appuie sur Envoyer pour la confirmer.";
  form.reset();
  majHeures();
});
