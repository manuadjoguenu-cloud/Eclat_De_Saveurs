// Contenu du site : lit data/site.json (modifiable depuis /admin) et remplit la page.
// Le texte écrit dans index.html sert de secours si ce fichier est introuvable.
// Ce fichier doit être chargé avant main.js et reservation.js.

const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

// Promesse partagée : les autres scripts s'en servent pour lire les réglages.
const chargerSite = fetch("data/site.json")
  .then((reponse) => {
    if (!reponse.ok) throw new Error("HTTP " + reponse.status);
    return reponse.json();
  })
  .catch((erreur) => {
    console.error(erreur);
    return {};
  });

// Les photos envoyées par l'administration ont un chemin complet (/images/plats/x.jpg)
function cheminImage(chemin) {
  return chemin.startsWith("/") ? chemin : "images/plats/" + chemin;
}

function ecrire(id, valeur) {
  const element = document.getElementById(id);
  if (element && valeur) element.textContent = valeur;
}

// Règle l'adresse d'un lien ; sans adresse, le lien (et sa ligne de liste) est caché.
function regler(id, href) {
  const lien = document.getElementById(id);
  if (!lien) return;
  const conteneur = lien.closest("li") || lien;
  conteneur.hidden = !href;
  if (href) lien.href = href;
}

chargerSite.then((site) => {
  const accueil = site.accueil || {};
  const histoire = site.histoire || {};
  const horaires = site.horaires || {};


  // --- Page d'accueil ---
  ecrire("hero-titre", accueil.titre);
  ecrire("hero-soustitre", accueil.sous_titre);
  ecrire("footer-slogan", accueil.slogan);

  if (accueil.image) {
    const url = new URL(cheminImage(accueil.image), document.baseURI).href;
    document.getElementById("hero").style.setProperty("--hero-image", `url("${url}")`);
  }


  // --- Notre histoire ---
  if (histoire.image) {
    document.getElementById("histoire-img").src = cheminImage(histoire.image);
  }

  if (histoire.texte) {
    const bloc = document.getElementById("histoire-texte");
    bloc.textContent = "";

    histoire.texte.split(/\n\s*\n/).forEach((paragraphe) => {
      if (!paragraphe.trim()) return;
      const p = document.createElement("p");
      p.textContent = paragraphe.trim();
      bloc.append(p);
    });
  }


  // --- Coordonnées (pied de page) ---
  if (site.contact) {
    const contact = site.contact;

    const adresse = document.getElementById("footer-adresse");
    if (contact.adresse) adresse.textContent = contact.adresse;
    if (contact.lien_maps) adresse.href = contact.lien_maps;
    else adresse.removeAttribute("href");

    if (contact.telephone) {
      const tel = document.getElementById("footer-tel");
      tel.textContent = contact.telephone;
      tel.href = "tel:" + contact.telephone.replace(/[^\d+]/g, "");
    }

    if (contact.whatsapp) {
      document.getElementById("footer-wa").href = "https://wa.me/" + contact.whatsapp.replace(/\D/g, "");
    }

    // Un réseau social sans adresse n'est pas affiché
    regler("footer-facebook", contact.facebook);
    regler("footer-instagram", contact.instagram);
    regler("footer-tiktok", contact.tiktok);
  }


  // --- Horaires ---
  if (horaires.jours || horaires.midi || horaires.soir) {
    const lignes = [horaires.jours, horaires.midi, horaires.soir];

    const ferme = Number(horaires.jour_ferme);
    if (horaires.jour_ferme !== undefined && horaires.jour_ferme !== "" && ferme >= 0 && ferme <= 6) {
      lignes.push("Fermé le " + NOMS_JOURS[ferme]);
    }

    const liste = document.getElementById("footer-horaires");
    liste.textContent = "";
    lignes.filter(Boolean).forEach((ligne) => {
      const li = document.createElement("li");
      li.textContent = ligne;
      liste.append(li);
    });
  }

  if (horaires.jours) ecrire("resa-sub", "Ouvert · " + horaires.jours);


  // --- Paiements ---
  ecrire("footer-paiements", site.paiements);
});
