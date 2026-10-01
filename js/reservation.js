// Réglages du restaurant
const NUMERO_WHATSAPP = "22892036639"; 
const JOUR_FERME = 1;                  
const DELAI_MIN = 60;                  

const form = document.getElementById("form-resa");
const champDate = document.getElementById("date");
const champHeure = document.getElementById("heure");
const champPlat = document.getElementById("plat");
const zoneErreur = document.getElementById("erreur-resa");
const zoneSucces = document.getElementById("succes-resa");

let platsCharges = false; 


// --- Dates et heures ---


function dateLocale(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

champDate.min = dateLocale(new Date());
function heureTropTot(heure) {
  if (champDate.value !== dateLocale(new Date())) return false; 
  const [h, m] = heure.split(":").map(Number);
  const creneau = new Date();
  creneau.setHours(h, m, 0, 0);
  return creneau.getTime() < Date.now() + DELAI_MIN * 60000;
}
function majHeures() {
  for (const option of champHeure.options) {
    if (!option.value) continue; 
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


//  Liste des plats 

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


// Validation 

function valider(donnees) {
  if (donnees.nom.trim().length < 2) return "Indique ton nom complet.";
  if (donnees.tel.replace(/\D/g, "").length < 8) return "Indique un numéro de téléphone valide.";
  if (!donnees.date) return "Choisis une date.";
  if (donnees.date < dateLocale(new Date())) return "La date ne peut pas être passée.";
  if (new Date(donnees.date + "T12:00:00").getDay() === JOUR_FERME) {
    return "Le restaurant est fermé le lundi. Choisis un autre jour.";
  }
  if (!donnees.heure) return "Choisis une heure.";
  if (heureTropTot(donnees.heure)) {
    return "Ce créneau est passé ou trop proche. Choisis une heure au moins 1 h à l'avance.";
  }
  if (platsCharges && !donnees.plat) return "Choisis un plat.";
  return "";
}


// Envoi 

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

  const personnes = donnees.personnes === "plus" ? "Plus de 8" : donnees.personnes;

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